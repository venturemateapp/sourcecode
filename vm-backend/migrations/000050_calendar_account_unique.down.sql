-- +goose Down
ALTER TABLE crm_calendar_accounts DROP CONSTRAINT IF EXISTS uq_crm_calendar_accounts_user_email;
