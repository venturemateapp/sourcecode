-- +goose Up
CREATE TABLE IF NOT EXISTS investor_connection_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'connected', 'declined')),
    admin_notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (investor_id, business_id)
);

CREATE INDEX IF NOT EXISTS idx_investor_connection_requests_status_created
    ON investor_connection_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_investor_connection_requests_business
    ON investor_connection_requests (business_id, created_at DESC);
