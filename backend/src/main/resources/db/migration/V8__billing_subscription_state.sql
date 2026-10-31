ALTER TABLE membership_entitlements ADD COLUMN last_event_ms bigint NOT NULL DEFAULT 0;
ALTER TABLE membership_entitlements ADD COLUMN last_transaction_id text;
ALTER TABLE membership_entitlements ADD COLUMN test_mode boolean NOT NULL DEFAULT false;
ALTER TABLE creem_webhook_inbox ADD COLUMN processing_note text;
