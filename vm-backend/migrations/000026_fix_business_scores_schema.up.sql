-- +goose Up
-- Ensure business_scores table exists with the correct schema,
-- and add any missing columns. This migration is idempotent and
-- will fix production databases that were created before migration
-- 000025 or that had columns dropped manually.

CREATE TABLE IF NOT EXISTS business_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    score_type TEXT NOT NULL DEFAULT 'credit',
    score_data JSONB NOT NULL DEFAULT '{}',
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(business_id, score_type)
);

ALTER TABLE business_scores ADD COLUMN IF NOT EXISTS score_type TEXT NOT NULL DEFAULT 'credit';
ALTER TABLE business_scores ADD COLUMN IF NOT EXISTS score_data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE business_scores ADD COLUMN IF NOT EXISTS calculated_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'business_scores_business_id_score_type_key'
    ) THEN
        ALTER TABLE business_scores ADD UNIQUE (business_id, score_type);
    END IF;
END $$;
