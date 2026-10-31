CREATE TABLE membership_entitlements (
    account_id uuid NOT NULL REFERENCES accounts(id),
    subscription_id text PRIMARY KEY,
    provider text NOT NULL CHECK (provider='creem'),
    status text NOT NULL,
    valid_until timestamptz NOT NULL
);
CREATE TABLE score_daily_usage (
    account_id uuid NOT NULL REFERENCES accounts(id),
    usage_day date NOT NULL,
    match_id uuid NOT NULL REFERENCES matches(id),
    PRIMARY KEY(account_id,usage_day)
);
CREATE TABLE score_recording_decisions (
    match_id uuid NOT NULL REFERENCES matches(id),
    account_id uuid NOT NULL REFERENCES accounts(id),
    recorded boolean NOT NULL,
    reason text NOT NULL,
    PRIMARY KEY(match_id,account_id)
);
