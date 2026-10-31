package com.flightparty.game;

import java.security.SecureRandom;

/** Server-side source for future authoritative rolls. */
public final class ServerDie {
    private final SecureRandom random = new SecureRandom();

    public int roll() {
        return random.nextInt(6) + 1;
    }
}
