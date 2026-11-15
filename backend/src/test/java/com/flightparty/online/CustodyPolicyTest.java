package com.flightparty.online;

import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;

/** The single contract shared by PostgreSQL table rooms and Redis flight rooms.
    See docs/ONLINE-GAME-MANAGEMENT.md. */
class CustodyPolicyTest {
    private static final long NOW = 1_700_000_000_000L;

    @Test void constantsAreTheProductContract() {
        assertEquals(30_000L, CustodyPolicy.GRACE_MS);
        assertEquals(30_000L, CustodyPolicy.IDLE_MS);
        assertEquals(1_200L, CustodyPolicy.HOSTED_PACE_MS);
        assertEquals("easy", CustodyPolicy.BOT_LEVEL);
        assertEquals(NOW + 30_000L, CustodyPolicy.graceDeadline(NOW));
        assertEquals(NOW + 30_000L, CustodyPolicy.turnDeadline(NOW));
        assertEquals(NOW + 1_200L, CustodyPolicy.hostedPaceDeadline(NOW));
    }

    @Test void anExpiredTurnClockHostsAnOnlineIdleSeatButNeverABot() {
        assertTrue(CustodyPolicy.hostOnIdle(CustodyPolicy.ACTIVE, NOW - 1, NOW));
        assertFalse(CustodyPolicy.hostOnIdle(CustodyPolicy.ACTIVE, NOW + 1, NOW), "clock still running");
        assertFalse(CustodyPolicy.hostOnIdle(CustodyPolicy.ACTIVE, 0, NOW), "rooms without a clock are not idle");
        assertFalse(CustodyPolicy.hostOnIdle(CustodyPolicy.GRACE, NOW - 1, NOW));
        assertFalse(CustodyPolicy.hostOnIdle(CustodyPolicy.HOSTED, NOW - 1, NOW));
        assertFalse(CustodyPolicy.hostOnIdle(CustodyPolicy.BOT, NOW - 1, NOW));
    }

    @Test void hostedAndNativeBotTurnsHaveNoVisibleCountdown() {
        assertTrue(CustodyPolicy.turnClockVisible(CustodyPolicy.ACTIVE));
        assertTrue(CustodyPolicy.turnClockVisible(CustodyPolicy.GRACE));
        assertFalse(CustodyPolicy.turnClockVisible(CustodyPolicy.HOSTED));
        assertFalse(CustodyPolicy.turnClockVisible(CustodyPolicy.BOT));
    }

    @Test void theNextDeadlineFollowsWhoeverOwnsTheNextTurn() {
        assertEquals(NOW + 1_200L, CustodyPolicy.nextDeadline(CustodyPolicy.HOSTED, 0, NOW),
                "the easy bot plays at its own pace, no fresh 30s countdown");
        assertEquals(NOW + 1_200L, CustodyPolicy.nextDeadline(CustodyPolicy.BOT, 0, NOW));
        assertEquals(NOW + 10_000L, CustodyPolicy.nextDeadline(CustodyPolicy.GRACE, NOW + 10_000L, NOW),
                "a grace seat keeps its own remaining reconnect window");
        assertEquals(NOW + 30_000L, CustodyPolicy.nextDeadline(CustodyPolicy.GRACE, NOW - 1, NOW));
        assertEquals(NOW + 30_000L, CustodyPolicy.nextDeadline(CustodyPolicy.ACTIVE, 0, NOW),
                "a real player always gets a fresh 30s turn clock");
    }

    @Test void twoRealHumanIdentitiesAreRequiredForTheManagedFlow() {
        assertFalse(CustodyPolicy.managed(0));
        assertFalse(CustodyPolicy.managed(1), "a match against computers is disposable");
        assertTrue(CustodyPolicy.managed(2), "two friends, or two humans plus bots");
        assertTrue(CustodyPolicy.managed(4));
    }

    @Test void oldSnapshotsAndUnknownValuesNormalizeToActiveOrNativeBot() {
        assertEquals(CustodyPolicy.ACTIVE, CustodyPolicy.normalize(null, false));
        assertEquals(CustodyPolicy.ACTIVE, CustodyPolicy.normalize("", false));
        assertEquals(CustodyPolicy.ACTIVE, CustodyPolicy.normalize("legacy", false));
        assertEquals(CustodyPolicy.BOT, CustodyPolicy.normalize(null, true));
        assertEquals(CustodyPolicy.HOSTED, CustodyPolicy.normalize("hosted", false));
    }

    @Test void anExpiredGraceIsAlreadyHostedEvenBeforeTheSchedulerWritesIt() {
        assertEquals(CustodyPolicy.ACTIVE, CustodyPolicy.resolve(CustodyPolicy.ACTIVE, 0, NOW, false));
        assertEquals(CustodyPolicy.BOT, CustodyPolicy.resolve(null, 0, NOW, true));
        assertEquals(CustodyPolicy.GRACE, CustodyPolicy.resolve(CustodyPolicy.GRACE, NOW + 1, NOW, false));
        assertEquals(CustodyPolicy.HOSTED, CustodyPolicy.resolve(CustodyPolicy.GRACE, NOW, NOW, false));
        assertEquals(CustodyPolicy.HOSTED, CustodyPolicy.resolve(CustodyPolicy.HOSTED, 0, NOW, false));
    }

    @Test void graceFreezesItsTurnWhileHostedSeatsAndNativeBotsArePlayed() {
        assertFalse(CustodyPolicy.botControlled(CustodyPolicy.ACTIVE));
        assertFalse(CustodyPolicy.botControlled(CustodyPolicy.GRACE), "still inside the 30s reconnect window");
        assertTrue(CustodyPolicy.botControlled(CustodyPolicy.HOSTED));
        assertTrue(CustodyPolicy.botControlled(CustodyPolicy.BOT));
    }

    @Test void hostedAndStillAbsentSeatsNeverWriteResultsStatisticsOrPoints() {
        assertTrue(CustodyPolicy.recordsScore(CustodyPolicy.ACTIVE));
        assertTrue(CustodyPolicy.recordsScore(CustodyPolicy.BOT), "a native computer seat is a normal game");
        assertFalse(CustodyPolicy.recordsScore(CustodyPolicy.GRACE));
        assertFalse(CustodyPolicy.recordsScore(CustodyPolicy.HOSTED));
    }
}
