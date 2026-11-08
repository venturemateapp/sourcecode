-- +goose Down
ALTER TABLE service_providers
    DROP COLUMN IF EXISTS email,
    DROP COLUMN IF EXISTS phone;

ALTER TABLE investors
    DROP COLUMN IF EXISTS email,
    DROP COLUMN IF EXISTS phone;
