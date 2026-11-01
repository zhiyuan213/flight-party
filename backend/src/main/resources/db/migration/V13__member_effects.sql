ALTER TABLE accounts ADD COLUMN flight_trail varchar(16) NOT NULL DEFAULT 'star' CHECK (flight_trail IN ('none','star','rainbow','cloud'));
ALTER TABLE accounts ADD COLUMN victory_effect varchar(16) NOT NULL DEFAULT 'gold' CHECK (victory_effect IN ('none','gold'));
