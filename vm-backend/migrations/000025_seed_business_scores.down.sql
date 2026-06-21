-- +goose Down
DELETE FROM business_scores WHERE score_type IN ('credit', 'health');
ALTER TABLE business_scores DROP CONSTRAINT IF EXISTS business_scores_business_id_score_type_key;
ALTER TABLE business_scores DROP COLUMN IF EXISTS calculated_at;
ALTER TABLE business_scores DROP COLUMN IF EXISTS score_data;
ALTER TABLE business_scores DROP COLUMN IF EXISTS score_type;
