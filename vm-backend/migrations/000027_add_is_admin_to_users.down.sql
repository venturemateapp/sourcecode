-- +goose Down
ALTER TABLE users DROP COLUMN IF EXISTS is_admin;
