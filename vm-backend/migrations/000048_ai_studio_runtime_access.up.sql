-- +goose Up
ALTER TABLE ai_projects ADD COLUMN IF NOT EXISTS runtime_access_key_hash VARCHAR(128) NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_ai_projects_runtime_key ON ai_projects(runtime_access_key_hash) WHERE runtime_access_key_hash <> '';
