CREATE TABLE accounts (
    id uuid PRIMARY KEY,
    email_normalized text UNIQUE,
    password_hash text,
    email_verified boolean NOT NULL DEFAULT false,
    display_name varchar(64) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE oauth_identities (
    provider varchar(32) NOT NULL,
    provider_subject text NOT NULL,
    account_id uuid NOT NULL REFERENCES accounts(id),
    PRIMARY KEY (provider, provider_subject)
);
CREATE TABLE principals (
    id uuid PRIMARY KEY,
    account_id uuid REFERENCES accounts(id),
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE matches (
    id uuid PRIMARY KEY,
    room_id uuid NOT NULL,
    status varchar(24) NOT NULL,
    rules_version varchar(32) NOT NULL,
    started_at timestamptz NOT NULL,
    settled_at timestamptz
);
CREATE TABLE match_participants (
    match_id uuid NOT NULL REFERENCES matches(id),
    seat_index smallint NOT NULL CHECK (seat_index BETWEEN 0 AND 3),
    principal_id uuid REFERENCES principals(id),
    account_id_at_start uuid REFERENCES accounts(id),
    native_bot boolean NOT NULL DEFAULT false,
    rank smallint CHECK (rank BETWEEN 1 AND 4),
    points_delta smallint,
    PRIMARY KEY (match_id, seat_index),
    UNIQUE (match_id, account_id_at_start),
    CHECK ((native_bot AND principal_id IS NULL AND account_id_at_start IS NULL) OR (NOT native_bot AND principal_id IS NOT NULL))
);
CREATE TABLE account_statistics (
    account_id uuid PRIMARY KEY REFERENCES accounts(id),
    points bigint NOT NULL DEFAULT 0,
    completed_games bigint NOT NULL DEFAULT 0 CHECK (completed_games >= 0),
    stats_version bigint NOT NULL DEFAULT 0
);
CREATE TABLE account_match_results (
    match_id uuid NOT NULL REFERENCES matches(id),
    account_id uuid NOT NULL REFERENCES accounts(id),
    seat_index smallint NOT NULL,
    rank smallint NOT NULL CHECK (rank BETWEEN 1 AND 4),
    points_delta smallint NOT NULL,
    PRIMARY KEY (match_id, account_id),
    FOREIGN KEY (match_id, seat_index) REFERENCES match_participants(match_id, seat_index)
);
CREATE TABLE daily_usage (
    principal_id uuid NOT NULL REFERENCES principals(id),
    usage_day date NOT NULL,
    starts integer NOT NULL DEFAULT 0 CHECK (starts >= 0),
    PRIMARY KEY (principal_id, usage_day)
);
CREATE TABLE statistics_outbox (
    account_id uuid NOT NULL REFERENCES accounts(id),
    stats_version bigint NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    published_at timestamptz,
    PRIMARY KEY (account_id, stats_version)
);
