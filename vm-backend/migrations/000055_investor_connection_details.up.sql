-- +goose Up
ALTER TABLE investor_connection_requests
    ADD COLUMN IF NOT EXISTS founder_name TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS business_name TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS industry TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS funding_stage TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS funding_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS funding_currency VARCHAR(3) NOT NULL DEFAULT 'USD';

UPDATE investor_connection_requests r
SET founder_name = COALESCE(NULLIF(TRIM(u.first_name || ' ' || u.surname), ''), u.email),
    business_name = b.name,
    industry = COALESCE(b.industry, ''),
    funding_stage = COALESCE(b.stage, '')
FROM users u, businesses b
WHERE u.id = r.user_id AND b.id = r.business_id
  AND (r.founder_name = '' OR r.business_name = '');
