-- +goose Down
ALTER TABLE users DROP COLUMN IF EXISTS settings;
