-- +goose Down
DROP TABLE IF EXISTS ai_audit_events;
DROP TABLE IF EXISTS ai_app_password_reset_tokens;
DROP TABLE IF EXISTS ai_app_sessions;
DROP TABLE IF EXISTS ai_app_records;
DROP TABLE IF EXISTS ai_app_users;
DROP TABLE IF EXISTS ai_app_entity_schemas;
DROP TABLE IF EXISTS ai_project_deployments;
DROP TABLE IF EXISTS ai_project_builds;
