-- +goose Down
ALTER TABLE investors
    DROP COLUMN IF EXISTS is_active;
