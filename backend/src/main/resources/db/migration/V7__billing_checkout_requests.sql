CREATE TABLE billing_checkout_requests (
    id uuid PRIMARY KEY,
    account_id uuid NOT NULL REFERENCES accounts(id),
    plan text NOT NULL CHECK (plan IN ('MONTHLY','ANNUAL')),
    product_id text NOT NULL,
    checkout_id text UNIQUE,
    checkout_url text,
    created_at timestamptz NOT NULL DEFAULT now()
);
