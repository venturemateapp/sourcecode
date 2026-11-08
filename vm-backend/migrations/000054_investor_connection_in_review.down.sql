-- +goose Down
ALTER TABLE investor_connection_requests
    DROP CONSTRAINT IF EXISTS investor_connection_requests_status_check;

UPDATE investor_connection_requests
SET status = 'approved', updated_at = NOW()
WHERE status = 'in_review';

ALTER TABLE investor_connection_requests
    ADD CONSTRAINT investor_connection_requests_status_check
    CHECK (status IN ('pending', 'approved', 'connected', 'declined'));
