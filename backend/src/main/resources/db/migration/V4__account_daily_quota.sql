CREATE TABLE account_daily_usage (
    account_id uuid NOT NULL REFERENCES accounts(id),
    usage_day date NOT NULL,
    starts integer NOT NULL DEFAULT 0 CHECK (starts >= 0),
    PRIMARY KEY(account_id,usage_day)
);
CREATE TABLE guest_quota_transfers (
    principal_id uuid NOT NULL REFERENCES principals(id),
    usage_day date NOT NULL,
    account_id uuid NOT NULL REFERENCES accounts(id),
    transferred_starts integer NOT NULL CHECK (transferred_starts >= 0),
    PRIMARY KEY(principal_id,usage_day)
);
