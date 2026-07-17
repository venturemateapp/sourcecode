-- +goose Up
CREATE TABLE IF NOT EXISTS crm_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_workflow_triggers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES crm_workflows(id) ON DELETE CASCADE,
    trigger_type VARCHAR(50) NOT NULL DEFAULT 'record_created',
    target_object VARCHAR(100) NOT NULL DEFAULT '',
    conditions JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_workflow_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES crm_workflows(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL DEFAULT 'send_email',
    action_config JSONB DEFAULT '{}',
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_workflow_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES crm_workflows(id) ON DELETE CASCADE,
    trigger_id UUID REFERENCES crm_workflow_triggers(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    result TEXT DEFAULT '',
    triggered_by UUID REFERENCES users(id) ON DELETE SET NULL,
    triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_crm_workflows_business ON crm_workflows(business_id);
CREATE INDEX IF NOT EXISTS idx_crm_workflow_logs_workflow ON crm_workflow_logs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_crm_workflow_logs_status ON crm_workflow_logs(status);
