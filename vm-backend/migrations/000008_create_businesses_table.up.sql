-- +goose Up
CREATE TABLE IF NOT EXISTS businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    tagline TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    industry TEXT NOT NULL DEFAULT '',
    stage TEXT NOT NULL DEFAULT 'idea',
    founded_date TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL DEFAULT '',
    website TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active',
    brand_kit JSONB NOT NULL DEFAULT '{}',
    pitch_deck JSONB NOT NULL DEFAULT '{}',
    business_plan JSONB NOT NULL DEFAULT '{}',
    milestones JSONB NOT NULL DEFAULT '[]',
    team JSONB NOT NULL DEFAULT '[]',
    documents JSONB NOT NULL DEFAULT '[]',
    website_config JSONB NOT NULL DEFAULT '{}',
    financials JSONB NOT NULL DEFAULT '{}',
    metrics JSONB NOT NULL DEFAULT '{}',
    ai_generated JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_businesses_user_id ON businesses(user_id);
CREATE INDEX idx_businesses_status ON businesses(status);
