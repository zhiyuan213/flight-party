-- A real player who finishes an online match while their seat is in the 30s
-- reconnect window, or is being played by the easy custody bot, writes no
-- results and receives no points. Server authoritative: only the room's own
-- custody state can set this flag, never a client request.
ALTER TABLE match_participants
    ADD COLUMN hosted_at_end boolean NOT NULL DEFAULT false;
