-- +goose Up
CREATE TABLE IF NOT EXISTS crm_email_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    provider VARCHAR(50) NOT NULL DEFAULT 'imap',
    imap_host VARCHAR(255) NOT NULL DEFAULT '',
    imap_port INT NOT NULL DEFAULT 993,
    imap_username VARCHAR(255) NOT NULL DEFAULT '',
    imap_password TEXT NOT NULL DEFAULT '',
    smtp_host VARCHAR(255) NOT NULL DEFAULT '',
    smtp_port INT NOT NULL DEFAULT 587,
    smtp_username VARCHAR(255) NOT NULL DEFAULT '',
    smtp_password TEXT NOT NULL DEFAULT '',
    oauth_token TEXT DEFAULT '',
    oauth_refresh_token TEXT DEFAULT '',
    oauth_expires_at TIMESTAMPTZ,
    sync_enabled BOOLEAN NOT NULL DEFAULT true,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES crm_email_accounts(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    message_id VARCHAR(255) NOT NULL,
    in_reply_to VARCHAR(255) DEFAULT '',
    references_header TEXT DEFAULT '',
    subject TEXT NOT NULL DEFAULT '',
    from_address VARCHAR(255) NOT NULL DEFAULT '',
    from_name VARCHAR(255) NOT NULL DEFAULT '',
    to_addresses TEXT NOT NULL DEFAULT '',
    cc_addresses TEXT NOT NULL DEFAULT '',
    bcc_addresses TEXT NOT NULL DEFAULT '',
    body_text TEXT DEFAULT '',
    body_html TEXT DEFAULT '',
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_read BOOLEAN NOT NULL DEFAULT false,
    is_starred BOOLEAN NOT NULL DEFAULT false,
    folder VARCHAR(100) NOT NULL DEFAULT 'INBOX',
    thread_id VARCHAR(255) DEFAULT '',
    contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
    company_id UUID REFERENCES crm_companies(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_email_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_id UUID NOT NULL REFERENCES crm_emails(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL DEFAULT '',
    mime_type VARCHAR(100) NOT NULL DEFAULT '',
    size_bytes INT NOT NULL DEFAULT 0,
    storage_url TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_emails_account ON crm_emails(account_id);
CREATE INDEX IF NOT EXISTS idx_crm_emails_business ON crm_emails(business_id);
CREATE INDEX IF NOT EXISTS idx_crm_emails_contact ON crm_emails(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_emails_company ON crm_emails(company_id);
CREATE INDEX IF NOT EXISTS idx_crm_emails_message ON crm_emails(message_id);
CREATE INDEX IF NOT EXISTS idx_crm_emails_thread ON crm_emails(thread_id);
CREATE INDEX IF NOT EXISTS idx_crm_emails_folder ON crm_emails(folder);
CREATE INDEX IF NOT EXISTS idx_crm_email_accounts_user ON crm_email_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_email_attachments_email ON crm_email_attachments(email_id);
