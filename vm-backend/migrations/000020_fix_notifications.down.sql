ALTER TABLE notifications RENAME COLUMN description TO message;
ALTER TABLE notifications DROP COLUMN IF EXISTS action_url;
ALTER TABLE notifications DROP COLUMN IF EXISTS action_label;
