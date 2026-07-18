-- +goose Down

DROP INDEX IF EXISTS idx_addon_purchases_type;
DROP INDEX IF EXISTS idx_addon_purchases_user;
DROP TABLE IF EXISTS addon_purchases;

DROP INDEX IF EXISTS idx_usage_log_user_period;
DROP TABLE IF EXISTS usage_log;

ALTER TABLE subscription_plans DROP COLUMN IF EXISTS limits;

-- Delete new plans
DELETE FROM subscription_plans WHERE name IN ('starter', 'growth', 'scale');

-- Reactivate old plans
UPDATE subscription_plans SET is_active = true, updated_at = NOW() WHERE name IN ('pro', 'pro_plus');

-- Note: user_subscriptions plan_id references will point to inactive pro/pro_plus plans
-- which are now reactivated. Manual reassignment may be needed.
