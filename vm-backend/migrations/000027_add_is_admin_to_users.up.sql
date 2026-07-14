-- +goose Up
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- Set initial admin (you can change this)
UPDATE users SET is_admin = true WHERE email = 'ops@venturemate.net';
