-- +goose Up
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT NOT NULL,
    price_monthly NUMERIC(10,2) NOT NULL DEFAULT 0,
    price_yearly NUMERIC(10,2) NOT NULL DEFAULT 0,
    features JSONB NOT NULL DEFAULT '[]',
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO subscription_plans (name, display_name, description, price_monthly, price_yearly, features, sort_order) VALUES
('free', 'Free', 'Get started with basic features to explore VentureMate.', 0, 0,
 '[{"text": "Basic profile", "included": true}, {"text": "1 business profile", "included": true}, {"text": "Basic analytics", "included": true}, {"text": "Community access", "included": true}, {"text": "Email support", "included": false}, {"text": "AI-powered insights", "included": false}]',
 1),
('pro', 'Pro', 'Unlock advanced features for growing your startup.', 29.99, 299.99,
 '[{"text": "Basic profile", "included": true}, {"text": "Up to 5 businesses", "included": true}, {"text": "Advanced analytics", "included": true}, {"text": "Community access", "included": true}, {"text": "Priority email support", "included": true}, {"text": "AI-powered insights", "included": true}, {"text": "Custom branding", "included": false}]',
 2),
('pro_plus', 'Pro+', 'Everything you need to scale your venture to the next level.', 99.99, 999.99,
 '[{"text": "Basic profile", "included": true}, {"text": "Unlimited businesses", "included": true}, {"text": "Advanced analytics", "included": true}, {"text": "Community access", "included": true}, {"text": "Priority email support", "included": true}, {"text": "AI-powered insights", "included": true}, {"text": "Custom branding", "included": true}, {"text": "Dedicated account manager", "included": true}, {"text": "API access", "included": true}]',
 3)
ON CONFLICT (name) DO NOTHING;
