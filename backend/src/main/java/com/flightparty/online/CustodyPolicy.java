package com.flightparty.online;

/**
 * The one authoritative contract for a real player's online seat after they
 * leave. Both room systems (PostgreSQL table rooms and Redis Flight rooms)
 * call this class, so every game behaves identically. See
 * docs/ONLINE-GAME-MANAGEMENT.md.
 *
 * <p>Scope rules:
 * <ul>
 *   <li>Only rooms with at least two real human identities are managed. A
 *       match against a computer is disposable: leaving ends it and entering
 *       again starts a fresh game.</li>
 *   <li>active -&gt; (leave / disconnect) -&gt; grace (30s countdown) -&gt;
 *       hosted (easy bot plays). An online but idle active seat whose 30s
 *       turn countdown expires goes straight to hosted (no second countdown).
 *       Reconnecting, or any real pointer/key activity, returns the seat to
 *       active with its original identity and seat.</li>
 *   <li>Once hosted there is no visible turn countdown: the easy bot plays at
 *       its own short pace. Only a real (active or grace) human turn keeps the
 *       30s clock on screen.</li>
 *   <li>All seats may be hosted at once (double custody) and the match runs
 *       to completion.</li>
 *   <li>A seat that finishes in grace/hosted writes no results and no points.</li>
 *   <li>Rooms, custody state, reconnection targets and score ledgers are
 *       isolated per game; nothing in this class is shared between games.</li>
 * </ul>
 *
 * <p>Pure and stateless: no clock, no storage, no transport.
 */
public final class CustodyPolicy {
    /** Visible reconnect countdown before an easy bot takes over. */
    public static final long GRACE_MS = 30_000L;
    /** Visible turn countdown for an online (but idle) real player. */
    public static final long IDLE_MS = 30_000L;
    /** Hosted turns are not clocked: the easy bot moves at this short pace. */
    public static final long HOSTED_PACE_MS = 1_200L;
    /** Every hosted seat is played by the easiest bot, never the saved difficulty. */
    public static final String BOT_LEVEL = "easy";

    public static final String ACTIVE = "active";
    public static final String GRACE = "grace";
    public static final String HOSTED = "hosted";
    public static final String BOT = "bot";

    private CustodyPolicy() {}

    /** Old persisted snapshots have no custody field; treat them as active (or a native bot). */
    public static String normalize(String state, boolean nativeBot) {
        if (state == null || state.isBlank()) return nativeBot ? BOT : ACTIVE;
        return switch (state) {
            case ACTIVE, GRACE, HOSTED, BOT -> state;
            default -> nativeBot ? BOT : ACTIVE;
        };
    }

    /** Two real human identities are the minimum for the managed online flow. */
    public static boolean managed(int humanSeats) { return humanSeats >= 2; }

    /** Resolve a seat's effective state at `now`; an expired grace is already hosted. */
    public static String resolve(String state, long graceUntil, long now, boolean nativeBot) {
        String base = normalize(state, nativeBot);
        if (BOT.equals(base)) return BOT;
        if (HOSTED.equals(base)) return HOSTED;
        if (GRACE.equals(base)) return graceUntil > now ? GRACE : HOSTED;
        return ACTIVE;
    }

    /** A grace seat holds its turn; a hosted seat or native bot is played by a bot. */
    public static boolean botControlled(String resolved) {
        return BOT.equals(resolved) || HOSTED.equals(resolved);
    }

    /** Hosted (or still-absent) seats write no results, statistics or points. */
    public static boolean recordsScore(String resolved) {
        return !HOSTED.equals(resolved) && !GRACE.equals(resolved);
    }

    /** An online-but-idle ACTIVE seat becomes hosted when its turn clock runs
        out. Native bots and already hosted/grace seats are never re-hosted. */
    public static boolean hostOnIdle(String resolved, long turnDeadline, long now) {
        return ACTIVE.equals(resolved) && turnDeadline > 0 && turnDeadline <= now;
    }

    /** The 30s turn clock belongs to a real human turn only. A hosted seat (or
        a native bot) has no countdown: the bot simply plays at its own pace. */
    public static boolean turnClockVisible(String resolved) {
        return !botControlled(resolved);
    }

    /** Next deadline after a server-driven move: a short bot pace when the
        following turn is bot-controlled, a fresh 30s clock for a real player. */
    public static long nextDeadline(String nextResolved, long nextGraceUntil, long now) {
        if (botControlled(nextResolved)) return now + HOSTED_PACE_MS;
        if (GRACE.equals(nextResolved) && nextGraceUntil > now) return nextGraceUntil;
        return turnDeadline(now);
    }

    public static long graceDeadline(long now) { return now + GRACE_MS; }
    public static long turnDeadline(long now) { return now + IDLE_MS; }
    public static long hostedPaceDeadline(long now) { return now + HOSTED_PACE_MS; }
}
