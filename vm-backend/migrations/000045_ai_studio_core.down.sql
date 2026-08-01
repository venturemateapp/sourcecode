-- +goose Down
ALTER TABLE ai_project_files DROP CONSTRAINT IF EXISTS fk_ai_project_files_asset;
ALTER TABLE ai_projects DROP CONSTRAINT IF EXISTS fk_ai_projects_approved_revision;
ALTER TABLE ai_projects DROP CONSTRAINT IF EXISTS fk_ai_projects_current_revision;
DROP TABLE IF EXISTS ai_proposal_batches;
DROP TABLE IF EXISTS ai_assets;
DROP TABLE IF EXISTS ai_generation_jobs;
DROP TABLE IF EXISTS ai_project_file_versions;
DROP TABLE IF EXISTS ai_project_files;
DROP TABLE IF EXISTS ai_project_revisions;
DROP TABLE IF EXISTS ai_projects;
