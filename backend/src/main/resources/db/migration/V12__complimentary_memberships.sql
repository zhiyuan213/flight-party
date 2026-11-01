CREATE TABLE complimentary_memberships (
 account_id uuid PRIMARY KEY REFERENCES accounts(id),
 valid_until timestamptz NOT NULL,
 granted_at timestamptz NOT NULL DEFAULT now(),
 reason text NOT NULL,
 revoked_at timestamptz
);
