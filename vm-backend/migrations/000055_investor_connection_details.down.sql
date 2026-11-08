-- +goose Down
ALTER TABLE investor_connection_requests
    DROP COLUMN IF EXISTS funding_currency,
    DROP COLUMN IF EXISTS funding_amount,
    DROP COLUMN IF EXISTS funding_stage,
    DROP COLUMN IF EXISTS industry,
    DROP COLUMN IF EXISTS business_name,
    DROP COLUMN IF EXISTS founder_name;
