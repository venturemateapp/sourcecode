-- +goose Up
-- Add token tracking columns to ai_chat_messages
ALTER TABLE ai_chat_messages
  ADD COLUMN input_tokens INT NOT NULL DEFAULT 0,
  ADD COLUMN output_tokens INT NOT NULL DEFAULT 0,
  ADD COLUMN total_tokens INT NOT NULL DEFAULT 0,
  ADD COLUMN model VARCHAR(100) NOT NULL DEFAULT '',
  ADD COLUMN provider VARCHAR(100) NOT NULL DEFAULT '',
  ADD COLUMN duration_ms INT NOT NULL DEFAULT 0;

-- Add token tracking columns to support_messages
ALTER TABLE support_messages
  ADD COLUMN input_tokens INT NOT NULL DEFAULT 0,
  ADD COLUMN output_tokens INT NOT NULL DEFAULT 0,
  ADD COLUMN total_tokens INT NOT NULL DEFAULT 0,
  ADD COLUMN model VARCHAR(100) NOT NULL DEFAULT '',
  ADD COLUMN provider VARCHAR(100) NOT NULL DEFAULT '',
  ADD COLUMN duration_ms INT NOT NULL DEFAULT 0;

-- Create an aggregated token usage view for convenient per-business/per-domain reporting
CREATE VIEW ai_token_usage_summary AS
SELECT
  acs.business_id,
  acs.domain,
  date(acm.created_at) AS date,
  COUNT(*) AS request_count,
  SUM(acm.input_tokens) AS total_input_tokens,
  SUM(acm.output_tokens) AS total_output_tokens,
  SUM(acm.total_tokens) AS total_tokens,
  SUM(acm.duration_ms) AS total_duration_ms
FROM ai_chat_messages acm
JOIN ai_chat_sessions acs ON acs.id = acm.session_id
WHERE acm.role = 'assistant'
GROUP BY acs.business_id, acs.domain, date(acm.created_at);

CREATE VIEW support_token_usage_summary AS
SELECT
  ss.user_id,
  date(sm.created_at) AS date,
  COUNT(*) AS request_count,
  SUM(sm.input_tokens) AS total_input_tokens,
  SUM(sm.output_tokens) AS total_output_tokens,
  SUM(sm.total_tokens) AS total_tokens,
  SUM(sm.duration_ms) AS total_duration_ms
FROM support_messages sm
JOIN support_sessions ss ON ss.id = sm.session_id
WHERE sm.role = 'assistant'
GROUP BY ss.user_id, date(sm.created_at);
