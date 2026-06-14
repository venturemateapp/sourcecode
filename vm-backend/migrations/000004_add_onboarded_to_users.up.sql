-- +goose Up
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS onboarded BOOLEAN DEFAULT FALSE;

UPDATE users SET onboarded = FALSE WHERE onboarded IS NULL;
