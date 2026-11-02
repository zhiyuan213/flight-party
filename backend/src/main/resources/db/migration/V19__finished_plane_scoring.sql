ALTER TABLE match_participants ADD COLUMN finished_planes smallint CHECK (finished_planes BETWEEN 0 AND 2);
