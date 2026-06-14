-- +goose Down
DROP INDEX IF EXISTS idx_password_reset_otps_expires;
DROP INDEX IF EXISTS idx_password_reset_otps_email;
DROP TABLE IF EXISTS password_reset_otps;
