-- +goose Up
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    surname TEXT NOT NULL,
    other_names TEXT,
    dob DATE,
    email TEXT UNIQUE NOT NULL,
    password TEXT,
    primary_phone TEXT,
    secondary_phone TEXT,
    picture TEXT,
    country TEXT,
    city TEXT,
    language TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
