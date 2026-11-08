-- +goose Up
ALTER TABLE investor_connection_requests
    DROP CONSTRAINT IF EXISTS investor_connection_requests_status_check;

UPDATE investor_connection_requests
SET status = 'in_review', updated_at = NOW()
WHERE status = 'approved';

ALTER TABLE investor_connection_requests
    ADD CONSTRAINT investor_connection_requests_status_check
    CHECK (status IN ('pending', 'in_review', 'connected', 'declined'));
