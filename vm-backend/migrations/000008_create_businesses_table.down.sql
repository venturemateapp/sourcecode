-- +goose Down
DROP INDEX IF EXISTS idx_businesses_status;
DROP INDEX IF EXISTS idx_businesses_user_id;
DROP TABLE IF EXISTS businesses;
