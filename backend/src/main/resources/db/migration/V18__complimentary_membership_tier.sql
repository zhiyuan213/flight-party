-- Gifts have an explicit tier; a long validity period never implies annual VIP.
-- Existing complimentary rows remain ordinary VIP unless deliberately upgraded.
ALTER TABLE complimentary_memberships ADD COLUMN tier text NOT NULL DEFAULT 'VIP' CHECK (tier IN ('VIP','ANNUAL'));
