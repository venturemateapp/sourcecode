-- +goose Up
CREATE TABLE IF NOT EXISTS metricool_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    metricool_user_token TEXT NOT NULL DEFAULT '',
    metricool_user_id VARCHAR(255) NOT NULL DEFAULT '',
    active_brand_id VARCHAR(255) DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_metricool_connections_user ON metricool_connections(user_id);
