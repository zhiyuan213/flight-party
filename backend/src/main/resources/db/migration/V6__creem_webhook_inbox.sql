CREATE TABLE creem_webhook_inbox (
    event_id text PRIMARY KEY,
    event_type text NOT NULL,
    payload_hash char(64) NOT NULL,
    payload text NOT NULL,
    received_at timestamptz NOT NULL DEFAULT now(),
    processed_at timestamptz
);
