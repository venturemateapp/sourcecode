-- +goose Up
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' NOT NULL;

UPDATE users SET status = 'active' WHERE status IS NULL;
