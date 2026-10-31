CREATE TABLE match_event_projection (
    match_id uuid PRIMARY KEY REFERENCES matches(id),
    version bigint NOT NULL DEFAULT 0 CHECK (version >= 0),
    snapshot text
);
CREATE TABLE match_events (
    match_id uuid NOT NULL REFERENCES matches(id),
    version bigint NOT NULL CHECK (version > 0),
    event_type varchar(64) NOT NULL,
    payload text NOT NULL,
    snapshot text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (match_id, version)
);
