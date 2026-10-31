package com.flightparty.game;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/** Pure classic-mode rules. Callers own identity, randomness, persistence and timing. */
public final class GameRules {
    public static final int FINISH = 57;
    public enum Phase { ROLL, CHOOSE, ANIMATING, OVER }
    public record Player(int seat, List<Integer> planes, Integer rank) {
        public Player {
            planes = List.copyOf(planes);
            if (seat < 0 || seat > 3 || planes.size() != 2 || planes.stream().anyMatch(p -> p < -1 || p > FINISH))
                throw new IllegalArgumentException("invalid player");
        }
    }
    public record State(List<Player> players, int turn, Phase phase, Integer die, List<Integer> ranking) {
        public State { players = List.copyOf(players); ranking = List.copyOf(ranking); }
    }
    public record Capture(int seat, int plane, int from) {}
    public record Move(State state, int seat, int plane, int from, int to, List<Capture> captures) {
        public Move { captures = List.copyOf(captures); }
    }
    private GameRules() {}
    public static State start(List<Integer> seats) {
        if (seats.size() < 2 || seats.size() > 4 || seats.stream().distinct().count() != seats.size())
            throw new IllegalArgumentException("two to four distinct seats required");
        var sorted = seats.stream().sorted().toList();
        var players = sorted.stream().map(s -> new Player(s, List.of(-1, -1), null)).toList();
        return new State(players, sorted.getFirst(), Phase.ROLL, null, List.of());
    }
    public static State roll(State s, int value) {
        if (s.phase() != Phase.ROLL || value < 1 || value > 6) throw new IllegalStateException("invalid roll");
        return new State(s.players(), s.turn(), Phase.CHOOSE, value, s.ranking());
    }
    public static List<Integer> legal(State s) {
        if (s.phase() != Phase.CHOOSE) return List.of();
        var p = player(s, s.turn());
        var result = new ArrayList<Integer>();
        for (int i = 0; i < 2; i++) if (p.planes().get(i) < FINISH) result.add(i);
        return List.copyOf(result);
    }
    public static int botChoice(State s) {
        return legal(s).stream().max(Comparator.<Integer>comparingInt(i -> player(s, s.turn()).planes().get(i)).thenComparingInt(i -> -i)).orElseThrow();
    }
    public static Move move(State s, int plane) {
        if (!legal(s).contains(plane)) throw new IllegalStateException("illegal plane");
        var players = new ArrayList<>(s.players());
        var current = player(s, s.turn());
        int from = current.planes().get(plane), to = Math.min(FINISH, from + s.die());
        var own = new ArrayList<>(current.planes()); own.set(plane, to);
        var ranking = new ArrayList<>(s.ranking());
        Integer rank = current.rank();
        if (own.stream().allMatch(p -> p == FINISH) && rank == null) { ranking.add(current.seat()); rank = ranking.size(); }
        replace(players, new Player(current.seat(), own, rank));
        var captures = new ArrayList<Capture>();
        int tile = (to + current.seat() * 13) % 52;
        if (to < 52 && tile % 13 != 0) {
            for (var enemy : s.players()) {
                if (enemy.seat() == current.seat()) continue;
                var planes = new ArrayList<>(enemy.planes());
                for (int i = 0; i < 2; i++) {
                    int pos = planes.get(i);
                    if (pos >= 0 && pos < 52 && (pos + enemy.seat() * 13) % 52 == tile) {
                        captures.add(new Capture(enemy.seat(), i, pos)); planes.set(i, -1);
                    }
                }
                replace(players, new Player(enemy.seat(), planes, enemy.rank()));
            }
        }
        return new Move(new State(players, s.turn(), Phase.ANIMATING, s.die(), ranking), s.turn(), plane, from, to, captures);
    }
    public static State advance(State s) {
        if (s.phase() != Phase.ANIMATING) throw new IllegalStateException("not animating");
        var players = new ArrayList<>(s.players()); var ranking = new ArrayList<>(s.ranking());
        if (ranking.size() >= 2) {
            var remaining = players.stream().filter(p -> p.rank() == null).sorted(Comparator
                    .comparingInt(GameRules::finished).reversed()
                    .thenComparing(Comparator.comparingInt(GameRules::total).reversed())
                    .thenComparing(Comparator.comparingInt(GameRules::farthest).reversed())
                    .thenComparingInt(Player::seat)).toList();
            for (var p : remaining) { ranking.add(p.seat()); replace(players, new Player(p.seat(), p.planes(), ranking.size())); }
            return new State(players, s.turn(), Phase.OVER, s.die(), ranking);
        }
        int currentIndex = index(players, s.turn());
        for (int i = 1; i <= players.size(); i++) {
            var p = players.get((currentIndex + i) % players.size());
            if (p.rank() == null) return new State(players, p.seat(), Phase.ROLL, null, ranking);
        }
        throw new IllegalStateException("no active player");
    }
    private static int finished(Player p) { return (int)p.planes().stream().filter(x -> x == FINISH).count(); }
    private static int progress(int x) { return x < 0 ? 0 : x == FINISH ? 58 : x + 1; }
    private static int total(Player p) { return p.planes().stream().mapToInt(GameRules::progress).sum(); }
    private static int farthest(Player p) { return p.planes().stream().filter(x -> x < FINISH).mapToInt(GameRules::progress).max().orElse(0); }
    private static int index(List<Player> ps, int seat) { for (int i = 0; i < ps.size(); i++) if (ps.get(i).seat() == seat) return i; throw new IllegalArgumentException("unknown seat"); }
    private static Player player(State s, int seat) { return s.players().get(index(s.players(), seat)); }
    private static void replace(List<Player> ps, Player p) { ps.set(index(ps, p.seat()), p); }
}
