-- +goose Up
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS ai_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
    project_type VARCHAR(30) NOT NULL CHECK (project_type IN ('web_app','pitch_deck','business_plan')),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(120) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','generating','ready','published','archived','failed')),
    framework VARCHAR(50),
    template_version VARCHAR(50),
    current_revision_id UUID,
    approved_revision_id UUID,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_ai_projects_user_updated ON ai_projects(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_projects_business_type ON ai_projects(business_id, project_type);
CREATE UNIQUE INDEX IF NOT EXISTS ux_ai_projects_user_slug_active ON ai_projects(user_id, slug) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS ai_project_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES ai_projects(id) ON DELETE CASCADE,
    parent_revision_id UUID REFERENCES ai_project_revisions(id) ON DELETE SET NULL,
    created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source VARCHAR(30) NOT NULL CHECK (source IN ('ai','manual','import','rollback','migration','repair')),
    prompt TEXT NOT NULL DEFAULT '',
    summary TEXT NOT NULL DEFAULT '',
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','validating','failed','ready','approved','superseded')),
    schema_version VARCHAR(30) NOT NULL DEFAULT '1.0',
    document JSONB NOT NULL DEFAULT '{}'::jsonb,
    manifest JSONB NOT NULL DEFAULT '{}'::jsonb,
    diagnostics JSONB NOT NULL DEFAULT '{}'::jsonb,
    token_usage JSONB NOT NULL DEFAULT '{}'::jsonb,
    content_hash VARCHAR(128) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_project_revisions_project_created ON ai_project_revisions(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_project_revisions_status ON ai_project_revisions(status, created_at DESC);

DO $$ BEGIN
    ALTER TABLE ai_projects ADD CONSTRAINT fk_ai_projects_current_revision FOREIGN KEY (current_revision_id) REFERENCES ai_project_revisions(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE ai_projects ADD CONSTRAINT fk_ai_projects_approved_revision FOREIGN KEY (approved_revision_id) REFERENCES ai_project_revisions(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS ai_project_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES ai_projects(id) ON DELETE CASCADE,
    path TEXT NOT NULL,
    language VARCHAR(50) NOT NULL DEFAULT '',
    is_binary BOOLEAN NOT NULL DEFAULT FALSE,
    asset_id UUID,
    current_content TEXT NOT NULL DEFAULT '',
    content_hash VARCHAR(128) NOT NULL DEFAULT '',
    size_bytes BIGINT NOT NULL DEFAULT 0 CHECK (size_bytes >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(project_id, path)
);
CREATE INDEX IF NOT EXISTS idx_ai_project_files_project_path ON ai_project_files(project_id, path);

CREATE TABLE IF NOT EXISTS ai_project_file_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    revision_id UUID NOT NULL REFERENCES ai_project_revisions(id) ON DELETE CASCADE,
    path TEXT NOT NULL,
    operation VARCHAR(20) NOT NULL CHECK (operation IN ('create','update','delete','move')),
    previous_path TEXT,
    content TEXT NOT NULL DEFAULT '',
    content_hash VARCHAR(128) NOT NULL DEFAULT '',
    base_hash VARCHAR(128) NOT NULL DEFAULT '',
    size_bytes BIGINT NOT NULL DEFAULT 0 CHECK (size_bytes >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_file_versions_revision ON ai_project_file_versions(revision_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_file_versions_path ON ai_project_file_versions(path);

CREATE TABLE IF NOT EXISTS ai_generation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
    project_id UUID REFERENCES ai_projects(id) ON DELETE CASCADE,
    artifact_type VARCHAR(50) NOT NULL DEFAULT '',
    job_type VARCHAR(30) NOT NULL CHECK (job_type IN ('plan','generate','revise','asset','build','repair','export','deploy','thumbnail')),
    status VARCHAR(30) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','awaiting_review','completed','failed','cancelled')),
    progress SMALLINT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    step VARCHAR(100) NOT NULL DEFAULT 'queued',
    message TEXT NOT NULL DEFAULT '',
    request JSONB NOT NULL DEFAULT '{}'::jsonb,
    result JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_code VARCHAR(100) NOT NULL DEFAULT '',
    error_message TEXT NOT NULL DEFAULT '',
    logs TEXT NOT NULL DEFAULT '',
    provider VARCHAR(100) NOT NULL DEFAULT '',
    model VARCHAR(160) NOT NULL DEFAULT '',
    input_tokens BIGINT NOT NULL DEFAULT 0,
    output_tokens BIGINT NOT NULL DEFAULT 0,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3 CHECK (max_attempts BETWEEN 1 AND 10),
    cancel_requested BOOLEAN NOT NULL DEFAULT FALSE,
    locked_by VARCHAR(160),
    locked_at TIMESTAMPTZ,
    heartbeat_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_user_created ON ai_generation_jobs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_status_created ON ai_generation_jobs(status, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_project_created ON ai_generation_jobs(project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ai_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
    project_id UUID REFERENCES ai_projects(id) ON DELETE CASCADE,
    source VARCHAR(50) NOT NULL CHECK (source IN ('recraft','upload','generated_thumbnail','chart','import')),
    kind VARCHAR(50) NOT NULL CHECK (kind IN ('image','vector','logo','icon','background','mockup','chart','document','build')),
    prompt TEXT NOT NULL DEFAULT '',
    model VARCHAR(160) NOT NULL DEFAULT '',
    style VARCHAR(100) NOT NULL DEFAULT '',
    mime_type VARCHAR(120) NOT NULL DEFAULT 'application/octet-stream',
    width INTEGER,
    height INTEGER,
    size_bytes BIGINT NOT NULL DEFAULT 0 CHECK (size_bytes >= 0),
    storage_key TEXT NOT NULL,
    url TEXT NOT NULL,
    thumbnail_url TEXT NOT NULL DEFAULT '',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_assets_user_created ON ai_assets(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_assets_project_kind ON ai_assets(project_id, kind, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_assets_business ON ai_assets(business_id, created_at DESC);

ALTER TABLE ai_project_files
    ADD CONSTRAINT fk_ai_project_files_asset FOREIGN KEY (asset_id) REFERENCES ai_assets(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS ai_proposal_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    project_id UUID REFERENCES ai_projects(id) ON DELETE CASCADE,
    revision_id UUID REFERENCES ai_project_revisions(id) ON DELETE SET NULL,
    domain VARCHAR(100) NOT NULL DEFAULT '',
    message TEXT NOT NULL DEFAULT '',
    changes JSONB NOT NULL DEFAULT '[]'::jsonb,
    provider VARCHAR(100) NOT NULL DEFAULT '',
    model VARCHAR(160) NOT NULL DEFAULT '',
    token_usage JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','applied','discarded','superseded','failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    applied_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_ai_proposal_batches_user_created ON ai_proposal_batches(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_proposal_batches_project ON ai_proposal_batches(project_id, created_at DESC);
