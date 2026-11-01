-- Preserve the original match-start identity; a guest may acquire one score owner during play.
ALTER TABLE match_participants ADD COLUMN score_account_id uuid REFERENCES accounts(id);
CREATE UNIQUE INDEX match_score_owner_unique ON match_participants
    (match_id, (coalesce(account_id_at_start,score_account_id)));
