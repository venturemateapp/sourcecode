-- +goose Down
DROP INDEX IF EXISTS idx_ai_projects_runtime_key;
ALTER TABLE ai_projects DROP COLUMN IF EXISTS runtime_access_key_hash;
