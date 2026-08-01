-- +goose Down
DROP INDEX IF EXISTS idx_ai_chat_messages_job;
DROP INDEX IF EXISTS idx_ai_chat_sessions_project;
ALTER TABLE ai_chat_messages DROP COLUMN IF EXISTS metadata, DROP COLUMN IF EXISTS job_id, DROP COLUMN IF EXISTS revision_id;
ALTER TABLE ai_chat_sessions DROP COLUMN IF EXISTS conversation_summary, DROP COLUMN IF EXISTS job_id, DROP COLUMN IF EXISTS revision_id, DROP COLUMN IF EXISTS artifact_type, DROP COLUMN IF EXISTS project_id;
