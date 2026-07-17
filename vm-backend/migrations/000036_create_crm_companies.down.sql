-- +goose Down
ALTER TABLE crm_contacts DROP COLUMN IF EXISTS company_id;
DROP TABLE IF EXISTS crm_companies;
