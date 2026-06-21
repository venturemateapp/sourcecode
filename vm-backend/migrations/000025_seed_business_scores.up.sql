-- +goose Up
-- Fix existing business_scores table schema if it was created with old columns,
-- and seed default scores for all businesses that don't already have them.

ALTER TABLE business_scores ADD COLUMN IF NOT EXISTS score_type TEXT;
ALTER TABLE business_scores ADD COLUMN IF NOT EXISTS score_data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE business_scores ADD COLUMN IF NOT EXISTS calculated_at TIMESTAMPTZ DEFAULT NOW();

-- Add unique constraint for upsert if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'business_scores_business_id_score_type_key'
    ) THEN
        ALTER TABLE business_scores ADD UNIQUE (business_id, score_type);
    END IF;
END $$;

INSERT INTO business_scores (business_id, score_type, score_data)
SELECT
    b.id,
    'credit',
    jsonb_build_object(
        'score', 65,
        'maxScore', 100,
        'grade', 'Fair',
        'riskLevel', 'moderate',
        'calculatedAt', NOW()::text,
        'factors', jsonb_build_object(
            'positive', jsonb_build_array('Stable business registration'),
            'negative', jsonb_build_array('Limited credit history')
        ),
        'components', jsonb_build_object(
            'payment_history', 70,
            'credit_utilization', 68,
            'business_age', 45,
            'revenue_stability', 65,
            'debt_ratio', 60
        )
    )
FROM businesses b
WHERE NOT EXISTS (
    SELECT 1 FROM business_scores bs
    WHERE bs.business_id = b.id AND bs.score_type = 'credit'
)
ON CONFLICT (business_id, score_type) DO NOTHING;

INSERT INTO business_scores (business_id, score_type, score_data)
SELECT
    b.id,
    'health',
    jsonb_build_object(
        'overallScore', 70,
        'calculatedAt', NOW()::text,
        'components', jsonb_build_object(
            'compliance', jsonb_build_object('score', 75, 'weight', 15),
            'revenue_viability', jsonb_build_object('score', 68, 'weight', 25),
            'market_fit', jsonb_build_object('score', 72, 'weight', 20),
            'team_structure', jsonb_build_object('score', 65, 'weight', 15),
            'financial_sustainability', jsonb_build_object('score', 70, 'weight', 15),
            'digital_presence', jsonb_build_object('score', 60, 'weight', 10)
        ),
        'recommendations', jsonb_build_array(
            jsonb_build_object(
                'id', 'rec_default_001',
                'component', 'revenue_viability',
                'title', 'Strengthen Revenue Model',
                'description', 'Review pricing strategy and explore recurring revenue opportunities.',
                'impact', 'high', 'effort', 'medium'
            ),
            jsonb_build_object(
                'id', 'rec_default_002',
                'component', 'market_fit',
                'title', 'Validate Market Demand',
                'description', 'Conduct customer interviews and analyze competitor positioning.',
                'impact', 'high', 'effort', 'low'
            ),
            jsonb_build_object(
                'id', 'rec_default_003',
                'component', 'digital_presence',
                'title', 'Build Online Presence',
                'description', 'Create a professional website and establish social media channels.',
                'impact', 'medium', 'effort', 'low'
            )
        ),
        'priorityActions', jsonb_build_array(
            jsonb_build_object(
                'id', 'act_default_001',
                'title', 'Register for business compliance',
                'description', 'Ensure all required licenses and registrations are up to date.',
                'component', 'compliance',
                'deadline', NOW()::text, 'completed', false
            ),
            jsonb_build_object(
                'id', 'act_default_002',
                'title', 'Set up accounting system',
                'description', 'Implement proper bookkeeping and financial tracking.',
                'component', 'financial_sustainability',
                'deadline', NOW()::text, 'completed', false
            )
        )
    )
FROM businesses b
WHERE NOT EXISTS (
    SELECT 1 FROM business_scores bs
    WHERE bs.business_id = b.id AND bs.score_type = 'health'
)
ON CONFLICT (business_id, score_type) DO NOTHING;
