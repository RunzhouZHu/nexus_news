-- Add Clerk user ID and make password_hash optional (Clerk manages passwords)
ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_id TEXT UNIQUE;
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
CREATE INDEX IF NOT EXISTS users_clerk_id_idx ON users (clerk_id);
