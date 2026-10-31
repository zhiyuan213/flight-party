package com.flightparty.game;

import static com.flightparty.game.GameRules.*;
import static org.junit.jupiter.api.Assertions.*;
import java.util.List;
import java.nio.charset.StandardCharsets;
import java.util.Objects;
import org.junit.jupiter.api.Test;

class GameRulesTest {
    private State state(List<Player> players, int turn) { return new State(players, turn, Phase.ROLL, null, List.of()); }
    private Player p(int seat, int a, int b) { return new Player(seat, List.of(a, b), null); }
    @Test void sharedFixturesAgreeWithLocalEngine() throws Exception {
        try (var input = Objects.requireNonNull(getClass().getResourceAsStream("/classic-moves.csv"))) {
            for (var line : new String(input.readAllBytes(), StandardCharsets.UTF_8).split("\\R")) {
                if (line.isBlank() || line.startsWith("#")) continue;
                var v = line.split(",");
                var players = new java.util.ArrayList<Player>();
                for (int seat = 0; seat < 4; seat++) players.add(p(seat, Integer.parseInt(v[1 + seat * 2]), Integer.parseInt(v[2 + seat * 2])));
                var outcome = move(roll(state(players, 0), Integer.parseInt(v[9])), Integer.parseInt(v[10]));
                assertEquals(Integer.parseInt(v[11]), outcome.to(), v[0]);
                assertEquals(Integer.parseInt(v[12]), outcome.captures().size(), v[0]);
            }
        }
    }
    @Test void departureAndPhaseGuards() {
        var s = start(List.of(0, 1)); var rolled = roll(s, 4);
        assertEquals(List.of(-1, -1), s.players().getFirst().planes());
        assertThrows(IllegalStateException.class, () -> roll(rolled, 4));
        var move = move(rolled, 0); assertEquals(3, move.to());
        assertEquals(1, advance(move.state()).turn());
        assertThrows(IllegalStateException.class, () -> move(move.state(), 1));
    }
    @Test void serverDieStaysWithinLegalRange() {
        var die = new ServerDie();
        for (int i = 0; i < 1000; i++) { int value = die.roll(); assertTrue(value >= 1 && value <= 6); }
    }
    @Test void capturesStackButNotSafeTilesOrHomeLane() {
        var s = state(List.of(p(0, 4, -1), p(1, -1, -1), p(2, -1, -1), p(3, 21, 21)), 0);
        var result = move(roll(s, 4), 0);
        assertEquals(2, result.captures().size()); assertEquals(List.of(-1, -1), result.state().players().get(3).planes());
        var safe = state(List.of(p(0, 12, -1), p(1, 0, -1)), 0);
        assertTrue(move(roll(safe, 1), 0).captures().isEmpty());
        var home = state(List.of(p(0, 51, -1), p(1, 39, -1)), 0);
        assertTrue(move(roll(home, 1), 0).captures().isEmpty());
    }
    @Test void allSeatCountsRequireTwoFinishers() {
        for (int count : List.of(2, 3, 4)) {
            var players = new java.util.ArrayList<Player>();
            for (int i = 0; i < count; i++) players.add(p(i, i < 2 ? 56 : -1, i < 2 ? 57 : -1));
            var first = advance(move(roll(state(players, 0), 6), 0).state());
            assertEquals(Phase.ROLL, first.phase()); assertEquals(List.of(0), first.ranking());
            var end = advance(move(roll(first, 1), 0).state());
            assertEquals(Phase.OVER, end.phase()); assertEquals(count, end.ranking().size());
            assertEquals(List.of(0, 1), end.ranking().subList(0, 2));
        }
    }
    @Test void unfinishedRankingAndBotUseLegalMoves() {
        var s = state(List.of(p(0, 56, 57), p(1, 56, 57), p(2, 20, 20), p(3, 57, -1)), 0);
        var first = advance(move(roll(s, 1), 0).state());
        var secondRoll = roll(first, 1); assertEquals(0, botChoice(secondRoll));
        var end = advance(move(secondRoll, botChoice(secondRoll)).state());
        assertEquals(List.of(0, 1, 3, 2), end.ranking());
    }
    @Test void tieUsesFarthestThenSeat() {
        var s = state(List.of(p(0, 56, 57), p(1, 56, 57), p(2, 9, 19), p(3, 14, 14)), 0);
        var first = advance(move(roll(s, 1), 0).state());
        assertEquals(List.of(0, 1, 2, 3), advance(move(roll(first, 1), 0).state()).ranking());
    }
}
