package com.flightparty.table;

import static org.junit.jupiter.api.Assertions.*;
import java.util.*;
import org.junit.jupiter.api.Test;

/** A fully hosted room must keep producing legal moves until the game ends.
    `draw` is excluded on purpose: Sketch & Guess is advanced by
    TableService.tick() via SketchRules.advance(), never by GridRules.easyBot(). */
class GridRulesEasyBotTest {
    private static final int HOSTED_MOVE_CAP = 240;

    @Test void everyGameAcceptsTheEasyBotForASimulatedDoubleHostedMatch() {
        for (String game : List.of("four", "gomoku", "xo", "puzzle", "chess",
                "cards", "pool", "bubbles", "snooker")) {
            var state = GridRules.start(game);
            for (int i = 0; i < HOSTED_MOVE_CAP && !state.over(); i++) {
                int turn = state.turn();
                int command = GridRules.easyBot(state);
                final var current = state;
                var next = assertDoesNotThrow(() -> GridRules.move(current, turn, command),
                        game + " rejected an easy-bot command at hosted move " + i);
                assertEquals(state.moves() + 1, next.moves(), game + " must make progress");
                state = next;
            }
            assertTrue(state.moves() >= 1, game + " must be playable by the easy bot");
        }
    }

    @Test void aDoubleHostedPuzzleIsSolvedInAtMostSixteenMoves() {
        var state = GridRules.start("puzzle");
        int moves = 0;
        while (!state.over() && moves++ < 16) {
            state = GridRules.move(state, state.turn(), GridRules.easyBot(state));
        }
        assertTrue(state.over(), "no infinite random swaps for a hosted 15-puzzle");
        assertTrue(state.moves() <= 16);
    }

    @Test void aDoubleHostedCardGamePlaysRealCardsInsteadOfOnlyPassing() {
        var state = GridRules.start("cards");
        int plays = 0, draws = 0, total = 0;
        for (int i = 0; i < 40 && !state.over(); i++) {
            int command = GridRules.easyBot(state);
            if (command == -1) draws++; else plays++;
            total++;
            state = GridRules.move(state, state.turn(), command);
        }
        assertTrue(plays > 0, "the easy bot must not stall the deck by passing every turn");
        assertTrue(draws < total);
        assertEquals(total, state.moves(), "every hosted turn advanced the game");
    }

    @Test void theEasyBotIsWeakerThanTheNormalPoolAndSnookerBots() {
        var pool = GridRules.start("pool");
        int easy = GridRules.easyBot(pool), strong = GridRules.bot(pool);
        assertEquals(strong / 363600, easy / 363600, "same encoded shot family");
        assertTrue(easy % 363600 / 3600 < strong % 363600 / 3600, "lower cue power");
        assertNotEquals(strong % 3600, easy % 3600, "a small deterministic miss");

        var snooker = GridRules.start("snooker");
        int easyS = GridRules.easyBot(snooker), strongS = SnookerRules.bot(snooker);
        assertEquals(strongS / 3600000, easyS / 3600000, "same colour nomination");
        assertTrue(easyS % 3600000 / 3600 < strongS % 3600000 / 3600, "lower cue power");
        assertNotEquals(strongS % 3600, easyS % 3600);
    }
}
