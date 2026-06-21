-- +goose Down
-- Preserve schema fix; only remove seed data added by this migration.
DELETE FROM business_scores WHERE score_type IN ('credit', 'health');
