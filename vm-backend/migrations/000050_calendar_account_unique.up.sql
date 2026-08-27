-- +goose Up
-- Unique constraint so the google-calendar OAuth callback can upsert a
-- calendar account per (user, email) without duplicating rows.
ALTER TABLE crm_calendar_accounts ADD CONSTRAINT uq_crm_calendar_accounts_user_email UNIQUE (user_id, email);

-- +goose Down
ALTER TABLE crm_calendar_accounts DROP CONSTRAINT IF EXISTS uq_crm_calendar_accounts_user_email;
