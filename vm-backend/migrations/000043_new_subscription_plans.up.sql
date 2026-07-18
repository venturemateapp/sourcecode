-- +goose Up

-- Add limits JSONB column to subscription_plans for numeric/tier limits
ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS limits JSONB NOT NULL DEFAULT '{}';

-- Create monthly usage tracking table
CREATE TABLE IF NOT EXISTS usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    billing_period DATE NOT NULL,
    ai_tokens_used BIGINT NOT NULL DEFAULT 0,
    storage_bytes BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, billing_period)
);
CREATE INDEX IF NOT EXISTS idx_usage_log_user_period ON usage_log(user_id, billing_period);

-- Create addon purchases table
CREATE TABLE IF NOT EXISTS addon_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    addon_type TEXT NOT NULL,
    label TEXT NOT NULL DEFAULT '',
    price NUMERIC(10,2) NOT NULL DEFAULT 0,
    quantity INT NOT NULL DEFAULT 1,
    metadata JSONB NOT NULL DEFAULT '{}',
    purchased_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_addon_purchases_user ON addon_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_addon_purchases_type ON addon_purchases(addon_type);

-- Track user_id in JWT for the migration steps
DO $$
DECLARE
    free_id UUID;
    starter_id UUID;
    growth_id UUID;
    scale_id UUID;
BEGIN
    -- Update existing free plan with new limits
    UPDATE subscription_plans SET
        price_monthly = 0,
        price_yearly = 0,
        description = 'Idea-stage founders exploring. 1 business, 1 team member, 200K AI tokens/month.',
        sort_order = 1,
        limits = '{"ai_tokens_monthly": 200000, "max_businesses": 1, "max_team_members": 1, "max_pitch_decks": 1, "max_business_plans": 1, "storage_gb": 1, "is_advanced": false}',
        features = '[
            {"text": "Dashboard", "included": true},
            {"text": "AI Assistant (limited)", "included": true},
            {"text": "Business Health Score", "included": true},
            {"text": "Credit Score overview", "included": true},
            {"text": "Basic Pitch Deck Generator", "included": true},
            {"text": "Basic Business Plan Generator", "included": true},
            {"text": "Basic Brand Kit", "included": true},
            {"text": "Community Support", "included": true},
            {"text": "CRM", "included": false},
            {"text": "Invoicing & Banking", "included": false},
            {"text": "Website Creator", "included": false},
            {"text": "Document Vault", "included": false},
            {"text": "Social Media Scheduler", "included": false},
            {"text": "Marketplace Access", "included": false},
            {"text": "Investor Matching", "included": false},
            {"text": "Advanced Financial Modeling", "included": false},
            {"text": "Workflow Automation", "included": false},
            {"text": "Dedicated Account Manager", "included": false},
            {"text": "API Access", "included": false}
        ]'::jsonb,
        updated_at = NOW()
    WHERE name = 'free'
    RETURNING id INTO free_id;

    -- Insert or update Starter plan
    INSERT INTO subscription_plans (name, display_name, description, price_monthly, price_yearly, features, sort_order, limits) VALUES
    ('starter', 'Starter', 'Early-stage solo founders. 3 businesses, 3 team members, 2M AI tokens/month.', 15, 150,
     '[
        {"text": "Dashboard", "included": true},
        {"text": "AI Assistant", "included": true},
        {"text": "Business Health Score", "included": true},
        {"text": "Credit Score overview", "included": true},
        {"text": "Basic Pitch Deck Generator", "included": true},
        {"text": "Basic Business Plan Generator", "included": true},
        {"text": "Basic Brand Kit", "included": true},
        {"text": "Website Creator", "included": true},
        {"text": "CRM", "included": true},
        {"text": "Invoicing", "included": true},
        {"text": "Banking Integrations", "included": true},
        {"text": "Document Vault", "included": true},
        {"text": "Social Media Scheduler", "included": true},
        {"text": "Marketplace Access", "included": true},
        {"text": "Milestones & Team Management", "included": true},
        {"text": "Email Support", "included": true},
        {"text": "Investor Matching", "included": false},
        {"text": "Advanced Financial Modeling", "included": false},
        {"text": "Workflow Automation", "included": false},
        {"text": "Dedicated Account Manager", "included": false},
        {"text": "API Access", "included": false}
     ]'::jsonb,
     2,
     '{"ai_tokens_monthly": 2000000, "max_businesses": 3, "max_team_members": 3, "max_pitch_decks": 5, "max_business_plans": 5, "storage_gb": 10, "is_advanced": false}')
    ON CONFLICT (name) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        description = EXCLUDED.description,
        price_monthly = EXCLUDED.price_monthly,
        price_yearly = EXCLUDED.price_yearly,
        features = EXCLUDED.features,
        sort_order = EXCLUDED.sort_order,
        limits = EXCLUDED.limits,
        is_active = true,
        updated_at = NOW()
    RETURNING id INTO starter_id;

    -- Insert or update Growth plan
    INSERT INTO subscription_plans (name, display_name, description, price_monthly, price_yearly, features, sort_order, limits) VALUES
    ('growth', 'Growth', 'Startups with traction. 10 businesses, 10 team members, 10M AI tokens/month.', 49, 490,
     '[
        {"text": "Dashboard", "included": true},
        {"text": "AI Assistant (unlimited)", "included": true},
        {"text": "Business Health Score", "included": true},
        {"text": "Credit Score overview", "included": true},
        {"text": "Advanced Pitch Deck Generator", "included": true},
        {"text": "Advanced Business Plan Generator", "included": true},
        {"text": "Advanced Branding Tools", "included": true},
        {"text": "Website Creator", "included": true},
        {"text": "CRM", "included": true},
        {"text": "Invoicing", "included": true},
        {"text": "Banking Integrations", "included": true},
        {"text": "Document Vault", "included": true},
        {"text": "Social Media Scheduler", "included": true},
        {"text": "Marketplace Access", "included": true},
        {"text": "Milestones & Team Management", "included": true},
        {"text": "Email Support", "included": true},
        {"text": "Investor Matching", "included": true},
        {"text": "Advanced Financial Modeling", "included": true},
        {"text": "Automated Content Generation", "included": true},
        {"text": "Workflow Automation", "included": true},
        {"text": "Priority Email Support", "included": true},
        {"text": "Dedicated Account Manager", "included": false},
        {"text": "API Access", "included": false}
     ]'::jsonb,
     3,
     '{"ai_tokens_monthly": 10000000, "max_businesses": 10, "max_team_members": 10, "max_pitch_decks": -1, "max_business_plans": -1, "storage_gb": 100, "is_advanced": true}')
    ON CONFLICT (name) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        description = EXCLUDED.description,
        price_monthly = EXCLUDED.price_monthly,
        price_yearly = EXCLUDED.price_yearly,
        features = EXCLUDED.features,
        sort_order = EXCLUDED.sort_order,
        limits = EXCLUDED.limits,
        is_active = true,
        updated_at = NOW()
    RETURNING id INTO growth_id;

    -- Insert or update Scale plan
    INSERT INTO subscription_plans (name, display_name, description, price_monthly, price_yearly, features, sort_order, limits) VALUES
    ('scale', 'Scale', 'High-growth startups. Unlimited businesses, unlimited team members, 50M AI tokens/month.', 149, 1490,
     '[
        {"text": "Dashboard", "included": true},
        {"text": "AI Assistant (unlimited)", "included": true},
        {"text": "Business Health Score", "included": true},
        {"text": "Credit Score overview", "included": true},
        {"text": "Advanced Pitch Deck Generator", "included": true},
        {"text": "Advanced Business Plan Generator", "included": true},
        {"text": "Advanced Branding Tools", "included": true},
        {"text": "Website Creator", "included": true},
        {"text": "CRM", "included": true},
        {"text": "Invoicing", "included": true},
        {"text": "Banking Integrations", "included": true},
        {"text": "Document Vault", "included": true},
        {"text": "Social Media Scheduler", "included": true},
        {"text": "Marketplace Access", "included": true},
        {"text": "Milestones & Team Management", "included": true},
        {"text": "Premium Marketplace Placement", "included": true},
        {"text": "Investor Matching", "included": true},
        {"text": "Advanced Financial Modeling", "included": true},
        {"text": "Automated Content Generation", "included": true},
        {"text": "Workflow Automation", "included": true},
        {"text": "Dedicated Account Manager", "included": true},
        {"text": "White-Glove Onboarding", "included": true},
        {"text": "Custom Integrations", "included": true},
        {"text": "API Access", "included": true},
        {"text": "Dedicated Priority Support", "included": true}
     ]'::jsonb,
     4,
     '{"ai_tokens_monthly": 50000000, "max_businesses": -1, "max_team_members": -1, "max_pitch_decks": -1, "max_business_plans": -1, "storage_gb": 1000, "is_advanced": true}')
    ON CONFLICT (name) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        description = EXCLUDED.description,
        price_monthly = EXCLUDED.price_monthly,
        price_yearly = EXCLUDED.price_yearly,
        features = EXCLUDED.features,
        sort_order = EXCLUDED.sort_order,
        limits = EXCLUDED.limits,
        is_active = true,
        updated_at = NOW()
    RETURNING id INTO scale_id;

    -- Migrate existing users: pro -> starter, pro_plus -> growth
    UPDATE user_subscriptions us
    SET plan_id = starter_id,
        updated_at = NOW()
    FROM subscription_plans sp
    WHERE us.plan_id = sp.id AND sp.name = 'pro';

    UPDATE user_subscriptions us
    SET plan_id = growth_id,
        updated_at = NOW()
    FROM subscription_plans sp
    WHERE us.plan_id = sp.id AND sp.name = 'pro_plus';

    -- Deactivate old plans
    UPDATE subscription_plans SET is_active = false, updated_at = NOW()
    WHERE name IN ('pro', 'pro_plus');
END $$;
