INSERT INTO subscription_plans (name, display_name, description, price_monthly, price_yearly, features, sort_order) VALUES
('pro', 'Pro', 'Unlock advanced features for growing your startup.', 29.99, 299.99,
 '[{"text": "Basic profile", "included": true}, {"text": "Up to 5 businesses", "included": true}, {"text": "Advanced analytics", "included": true}, {"text": "Community access", "included": true}, {"text": "Priority email support", "included": true}, {"text": "AI-powered insights", "included": true}, {"text": "Custom branding", "included": false}]',
 2),
('pro_plus', 'Pro+', 'Everything you need to scale your venture to the next level.', 99.99, 999.99,
 '[{"text": "Basic profile", "included": true}, {"text": "Unlimited businesses", "included": true}, {"text": "Advanced analytics", "included": true}, {"text": "Community access", "included": true}, {"text": "Priority email support", "included": true}, {"text": "AI-powered insights", "included": true}, {"text": "Custom branding", "included": true}, {"text": "Dedicated account manager", "included": true}, {"text": "API access", "included": true}]',
 3)
ON CONFLICT (name) DO NOTHING;
