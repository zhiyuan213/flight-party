ALTER TABLE accounts ADD COLUMN avatar_frame varchar(16) NOT NULL DEFAULT 'gold' CHECK (avatar_frame IN ('gold','cloud','night'));
