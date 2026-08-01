-- +goose Up
CREATE TABLE IF NOT EXISTS ai_project_builds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES ai_projects(id) ON DELETE CASCADE,
    revision_id UUID REFERENCES ai_project_revisions(id) ON DELETE SET NULL,
    job_id UUID REFERENCES ai_generation_jobs(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','completed','failed','cancelled')),
    runtime_version VARCHAR(100) NOT NULL DEFAULT '',
    artifact_storage_key TEXT NOT NULL DEFAULT '',
    preview_url TEXT NOT NULL DEFAULT '',
    diagnostics JSONB NOT NULL DEFAULT '{}'::jsonb,
    logs TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_ai_builds_project_created ON ai_project_builds(project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ai_project_deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES ai_projects(id) ON DELETE CASCADE,
    revision_id UUID REFERENCES ai_project_revisions(id) ON DELETE SET NULL,
    build_id UUID REFERENCES ai_project_builds(id) ON DELETE SET NULL,
    job_id UUID REFERENCES ai_generation_jobs(id) ON DELETE SET NULL,
    provider VARCHAR(30) NOT NULL CHECK (provider IN ('venturemate','github','netlify')),
    status VARCHAR(30) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','completed','failed','cancelled')),
    external_id TEXT NOT NULL DEFAULT '',
    url TEXT NOT NULL DEFAULT '',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    logs TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_ai_deployments_project_created ON ai_project_deployments(project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ai_app_entity_schemas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES ai_projects(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    slug VARCHAR(120) NOT NULL,
    schema JSONB NOT NULL DEFAULT '{}'::jsonb,
    permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(project_id, slug)
);

CREATE TABLE IF NOT EXISTS ai_app_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES ai_projects(id) ON DELETE CASCADE,
    email VARCHAR(320) NOT NULL,
    password_hash TEXT NOT NULL,
    display_name VARCHAR(255) NOT NULL DEFAULT '',
    roles JSONB NOT NULL DEFAULT '["user"]'::jsonb,
    status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled','pending')),
    email_verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(project_id, email)
);

CREATE TABLE IF NOT EXISTS ai_app_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES ai_projects(id) ON DELETE CASCADE,
    entity_schema_id UUID NOT NULL REFERENCES ai_app_entity_schemas(id) ON DELETE CASCADE,
    owner_app_user_id UUID REFERENCES ai_app_users(id) ON DELETE SET NULL,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_app_records_project_entity ON ai_app_records(project_id, entity_schema_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_app_records_data_gin ON ai_app_records USING GIN(data);

CREATE TABLE IF NOT EXISTS ai_app_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES ai_projects(id) ON DELETE CASCADE,
    app_user_id UUID NOT NULL REFERENCES ai_app_users(id) ON DELETE CASCADE,
    token_hash VARCHAR(128) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_ai_app_sessions_project_user ON ai_app_sessions(project_id, app_user_id);
CREATE INDEX IF NOT EXISTS idx_ai_app_sessions_expiry ON ai_app_sessions(expires_at) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS ai_app_password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES ai_projects(id) ON DELETE CASCADE,
    app_user_id UUID NOT NULL REFERENCES ai_app_users(id) ON DELETE CASCADE,
    token_hash VARCHAR(128) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
    project_id UUID REFERENCES ai_projects(id) ON DELETE CASCADE,
    revision_id UUID REFERENCES ai_project_revisions(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(80) NOT NULL DEFAULT '',
    target_id TEXT NOT NULL DEFAULT '',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_audit_project_created ON ai_audit_events(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_audit_user_created ON ai_audit_events(user_id, created_at DESC);
