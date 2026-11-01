-- Preserve the verified paid product, never infer an annual tier from dates or gifts.
-- Existing subscriptions stay unclassified until another verified paid event arrives.
ALTER TABLE membership_entitlements ADD COLUMN billing_plan text CHECK (billing_plan IN ('MONTHLY','ANNUAL'));
ALTER TABLE membership_entitlements ADD COLUMN product_id text;
