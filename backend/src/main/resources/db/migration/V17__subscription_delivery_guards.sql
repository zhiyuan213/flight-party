-- Provider terminal events can arrive before the first paid event and before its
-- checkout/account identity is known. Keep ordering guards independently of grants.
CREATE TABLE creem_subscription_tombstones (
    subscription_id text PRIMARY KEY,
    last_event_ms bigint NOT NULL CHECK (last_event_ms > 0),
    event_type text NOT NULL CHECK (event_type IN ('subscription.canceled','subscription.unpaid','subscription.expired','subscription.paused'))
);
CREATE TABLE creem_subscription_reversals (
    subscription_id text NOT NULL,
    transaction_id text NOT NULL,
    event_ms bigint NOT NULL CHECK (event_ms > 0),
    event_type text NOT NULL CHECK (event_type IN ('refund.created','dispute.created')),
    PRIMARY KEY (subscription_id, transaction_id)
);

-- Preserve denials already authenticated and processed by the previous service.
-- These rows never create an entitlement or infer any account/plan ownership.
WITH events AS (
    SELECT event_type, CASE WHEN payload IS JSON OBJECT THEN payload::jsonb ELSE '{}'::jsonb END AS event
    FROM creem_webhook_inbox
    WHERE processed_at IS NOT NULL AND event_type IN ('subscription.canceled','subscription.unpaid','subscription.expired','subscription.paused')
), identified AS (
    SELECT event_type, event->'object'->>'id' AS subscription_id,
           CASE WHEN event->>'created_at' ~ '^[0-9]{1,18}$' THEN (event->>'created_at')::bigint ELSE 0 END AS stamp
    FROM events
)
INSERT INTO creem_subscription_tombstones(subscription_id,last_event_ms,event_type)
SELECT DISTINCT ON (subscription_id) subscription_id,stamp,event_type FROM identified
WHERE nullif(btrim(subscription_id),'') IS NOT NULL AND stamp>0
ORDER BY subscription_id,stamp DESC;

WITH events AS (
    SELECT event_type, CASE WHEN payload IS JSON OBJECT THEN payload::jsonb ELSE '{}'::jsonb END AS event
    FROM creem_webhook_inbox
    WHERE processed_at IS NOT NULL AND event_type IN ('refund.created','dispute.created')
), identified AS (
    SELECT event_type,
           CASE WHEN jsonb_typeof(event->'object'->'subscription')='string' THEN event->'object'->>'subscription' ELSE event->'object'->'subscription'->>'id' END AS subscription_id,
           CASE WHEN jsonb_typeof(event->'object'->'transaction')='string' THEN event->'object'->>'transaction' ELSE event->'object'->'transaction'->>'id' END AS transaction_id,
           CASE WHEN event->>'created_at' ~ '^[0-9]{1,18}$' THEN (event->>'created_at')::bigint ELSE 0 END AS stamp
    FROM events
)
INSERT INTO creem_subscription_reversals(subscription_id,transaction_id,event_ms,event_type)
SELECT DISTINCT ON (subscription_id,transaction_id) subscription_id,transaction_id,stamp,event_type FROM identified
WHERE nullif(btrim(subscription_id),'') IS NOT NULL AND nullif(btrim(transaction_id),'') IS NOT NULL AND stamp>0
ORDER BY subscription_id,transaction_id,stamp DESC;

-- Repair only grants contradicted by the exact authenticated evidence above.
-- Ownership, selected appearance, plan/product and game statistics stay intact.
UPDATE membership_entitlements e
SET status='REVOKED',last_event_ms=greatest(e.last_event_ms,r.event_ms)
FROM creem_subscription_reversals r
WHERE e.subscription_id=r.subscription_id AND e.last_transaction_id=r.transaction_id AND e.status<>'REVOKED';

UPDATE membership_entitlements e
SET status='INACTIVE',last_event_ms=t.last_event_ms
FROM creem_subscription_tombstones t
WHERE e.subscription_id=t.subscription_id AND t.last_event_ms>=e.last_event_ms AND e.status<>'REVOKED';
