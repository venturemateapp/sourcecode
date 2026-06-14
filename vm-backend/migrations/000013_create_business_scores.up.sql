-- +goose Up
CREATE TABLE IF NOT EXISTS business_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    score_type TEXT NOT NULL,
    score_data JSONB NOT NULL DEFAULT '{}',
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(business_id, score_type)
);

INSERT INTO business_scores (business_id, score_type, score_data)
SELECT id, 'credit', jsonb_build_object(
    'score', 72,
    'maxScore', 100,
    'grade', 'Good',
    'riskLevel', 'moderate',
    'calculatedAt', NOW()::text,
    'factors', jsonb_build_object(
        'positive', jsonb_build_array('On-time payments (24 months)', 'Low credit utilization (25%)'),
        'negative', jsonb_build_array('Short business history (18 months)')
    ),
    'components', jsonb_build_object(
        'payment_history', 85,
        'credit_utilization', 78,
        'business_age', 55,
        'revenue_stability', 70,
        'debt_ratio', 65
    )
)
FROM businesses WHERE name = 'NeuroTask AI'
ON CONFLICT (business_id, score_type) DO NOTHING;

INSERT INTO business_scores (business_id, score_type, score_data)
SELECT id, 'health', jsonb_build_object(
    'overallScore', 78,
    'calculatedAt', NOW()::text,
    'components', jsonb_build_object(
        'compliance', jsonb_build_object('score', 85, 'weight', 15),
        'revenue_viability', jsonb_build_object('score', 72, 'weight', 25),
        'market_fit', jsonb_build_object('score', 80, 'weight', 20),
        'team_structure', jsonb_build_object('score', 75, 'weight', 15),
        'financial_sustainability', jsonb_build_object('score', 82, 'weight', 15),
        'digital_presence', jsonb_build_object('score', 88, 'weight', 10)
    ),
    'recommendations', jsonb_build_array(
        jsonb_build_object('id', 'rec_001', 'component', 'revenue_viability', 'title', 'Diversify Revenue Streams', 'description', 'Current revenue is concentrated in one product line. Consider expanding to enterprise tiers or add-on services.', 'impact', 'high', 'effort', 'medium'),
        jsonb_build_object('id', 'rec_002', 'component', 'team_structure', 'title', 'Hire Head of Sales', 'description', 'Sales function is currently handled by founders. Dedicated sales leadership will accelerate growth.', 'impact', 'high', 'effort', 'medium'),
        jsonb_build_object('id', 'rec_003', 'component', 'market_fit', 'title', 'Conduct Customer Discovery', 'description', 'Schedule 20 customer interviews to validate new feature roadmap and pricing strategy.', 'impact', 'medium', 'effort', 'low'),
        jsonb_build_object('id', 'rec_004', 'component', 'compliance', 'title', 'Complete SOC 2 Type II', 'description', 'Enterprise customers require SOC 2. Start audit process within next quarter.', 'impact', 'medium', 'effort', 'high')
    ),
    'priorityActions', jsonb_build_array(
        jsonb_build_object('id', 'act_001', 'title', 'Complete SOC 2 audit', 'description', 'Start the SOC 2 Type II audit process with a certified auditor.', 'component', 'compliance', 'deadline', NOW()::text, 'completed', false),
        jsonb_build_object('id', 'act_002', 'title', 'Hire sales leadership', 'description', 'Create a job description and begin recruiting for a Head of Sales.', 'component', 'team_structure', 'deadline', NOW()::text, 'completed', false),
        jsonb_build_object('id', 'act_003', 'title', 'Diversify revenue', 'description', 'Research and develop an enterprise pricing tier and at least one add-on service.', 'component', 'revenue_viability', 'deadline', NOW()::text, 'completed', false)
    )
)
FROM businesses WHERE name = 'NeuroTask AI'
ON CONFLICT (business_id, score_type) DO NOTHING;

INSERT INTO business_scores (business_id, score_type, score_data)
SELECT id, 'credit', jsonb_build_object(
    'score', 68, 'maxScore', 100, 'grade', 'Good', 'riskLevel', 'moderate',
    'calculatedAt', NOW()::text,
    'factors', jsonb_build_object('positive', jsonb_build_array('Consistent revenue growth'), 'negative', jsonb_build_array('Short operating history')),
    'components', jsonb_build_object('payment_history', 80, 'credit_utilization', 72, 'business_age', 50, 'revenue_stability', 68, 'debt_ratio', 70)
)
FROM businesses WHERE name = 'GreenCart'
ON CONFLICT (business_id, score_type) DO NOTHING;

INSERT INTO business_scores (business_id, score_type, score_data)
SELECT id, 'health', jsonb_build_object(
    'overallScore', 72, 'calculatedAt', NOW()::text,
    'components', jsonb_build_object(
        'compliance', jsonb_build_object('score', 75, 'weight', 15),
        'revenue_viability', jsonb_build_object('score', 65, 'weight', 25),
        'market_fit', jsonb_build_object('score', 78, 'weight', 20),
        'team_structure', jsonb_build_object('score', 70, 'weight', 15),
        'financial_sustainability', jsonb_build_object('score', 74, 'weight', 15),
        'digital_presence', jsonb_build_object('score', 70, 'weight', 10)
    ),
    'recommendations', jsonb_build_array(
        jsonb_build_object('id', 'rec_001', 'component', 'revenue_viability', 'title', 'Improve Unit Economics', 'description', 'Review and optimize delivery costs and customer acquisition spend.', 'impact', 'high', 'effort', 'medium')
    ),
    'priorityActions', jsonb_build_array(
        jsonb_build_object('id', 'act_001', 'title', 'Optimize delivery logistics', 'description', 'Reduce delivery costs by optimizing route planning.', 'component', 'revenue_viability', 'deadline', NOW()::text, 'completed', false)
    )
)
FROM businesses WHERE name = 'GreenCart'
ON CONFLICT (business_id, score_type) DO NOTHING;
