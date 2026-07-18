-- +goose Down
DROP VIEW IF EXISTS ai_token_usage_summary;
DROP VIEW IF EXISTS support_token_usage_summary;

ALTER TABLE ai_chat_messages
  DROP COLUMN IF EXISTS input_tokens,
  DROP COLUMN IF EXISTS output_tokens,
  DROP COLUMN IF EXISTS total_tokens,
  DROP COLUMN IF EXISTS model,
  DROP COLUMN IF EXISTS provider,
  DROP COLUMN IF EXISTS duration_ms;

ALTER TABLE support_messages
  DROP COLUMN IF EXISTS input_tokens,
  DROP COLUMN IF EXISTS output_tokens,
  DROP COLUMN IF EXISTS total_tokens,
  DROP COLUMN IF EXISTS model,
  DROP COLUMN IF EXISTS provider,
  DROP COLUMN IF EXISTS duration_ms;
