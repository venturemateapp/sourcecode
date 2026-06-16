DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='message') THEN
        ALTER TABLE notifications RENAME COLUMN message TO description;
    END IF;
END $$;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_url TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_label TEXT;
