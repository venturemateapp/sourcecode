-- +goose Up
ALTER TABLE ai_chat_sessions
    ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES ai_projects(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS artifact_type VARCHAR(50) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS revision_id UUID REFERENCES ai_project_revisions(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES ai_generation_jobs(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS conversation_summary TEXT NOT NULL DEFAULT '';

ALTER TABLE ai_chat_messages
    ADD COLUMN IF NOT EXISTS revision_id UUID REFERENCES ai_project_revisions(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES ai_generation_jobs(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_project ON ai_chat_sessions(project_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_job ON ai_chat_messages(job_id) WHERE job_id IS NOT NULL;
