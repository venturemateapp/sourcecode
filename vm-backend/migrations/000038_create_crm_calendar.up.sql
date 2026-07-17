-- +goose Up
CREATE TABLE IF NOT EXISTS crm_calendar_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    provider VARCHAR(50) NOT NULL DEFAULT 'caldav',
    caldav_url TEXT NOT NULL DEFAULT '',
    caldav_username VARCHAR(255) NOT NULL DEFAULT '',
    caldav_password TEXT NOT NULL DEFAULT '',
    sync_enabled BOOLEAN NOT NULL DEFAULT true,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES crm_calendar_accounts(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    uid VARCHAR(255) NOT NULL,
    title VARCHAR(500) NOT NULL DEFAULT '',
    description TEXT DEFAULT '',
    location TEXT DEFAULT '',
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    is_all_day BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(50) NOT NULL DEFAULT 'confirmed',
    ical_data TEXT DEFAULT '',
    contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
    company_id UUID REFERENCES crm_companies(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_events_account ON crm_events(account_id);
CREATE INDEX IF NOT EXISTS idx_crm_events_business ON crm_events(business_id);
CREATE INDEX IF NOT EXISTS idx_crm_events_contact ON crm_events(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_events_time ON crm_events(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_crm_events_uid ON crm_events(uid, account_id);
CREATE INDEX IF NOT EXISTS idx_crm_calendar_accounts_user ON crm_calendar_accounts(user_id);
