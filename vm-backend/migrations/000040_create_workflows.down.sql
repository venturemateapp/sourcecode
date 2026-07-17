-- +goose Down
DROP TABLE IF EXISTS crm_workflow_logs;
DROP TABLE IF EXISTS crm_workflow_actions;
DROP TABLE IF EXISTS crm_workflow_triggers;
DROP TABLE IF EXISTS crm_workflows;
