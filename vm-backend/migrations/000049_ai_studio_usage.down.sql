-- +goose Down
ALTER TABLE usage_log
  DROP COLUMN IF EXISTS ai_project_bytes,
  DROP COLUMN IF EXISTS ai_deployments_used,
  DROP COLUMN IF EXISTS ai_exports_used,
  DROP COLUMN IF EXISTS ai_builds_used,
  DROP COLUMN IF EXISTS recraft_images_used;
