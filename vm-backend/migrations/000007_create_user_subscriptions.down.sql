-- +goose Down
DROP INDEX IF EXISTS idx_user_subscriptions_status;
DROP INDEX IF EXISTS idx_user_subscriptions_user_id;
DROP TABLE IF EXISTS user_subscriptions;
