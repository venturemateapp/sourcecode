-- +goose Up
CREATE TABLE IF NOT EXISTS crm_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) NOT NULL DEFAULT '',
    industry VARCHAR(100) NOT NULL DEFAULT '',
    employee_count INT DEFAULT 0,
    revenue NUMERIC(14,2) DEFAULT 0,
    website VARCHAR(255) NOT NULL DEFAULT '',
    phone VARCHAR(100) NOT NULL DEFAULT '',
    email VARCHAR(255) NOT NULL DEFAULT '',
    address_street TEXT DEFAULT '',
    address_city VARCHAR(100) NOT NULL DEFAULT '',
    address_state VARCHAR(100) NOT NULL DEFAULT '',
    address_zip VARCHAR(20) NOT NULL DEFAULT '',
    address_country VARCHAR(100) NOT NULL DEFAULT '',
    description TEXT DEFAULT '',
    logo_url TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES crm_companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_crm_companies_business ON crm_companies(business_id);
CREATE INDEX IF NOT EXISTS idx_crm_companies_name ON crm_companies(name);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_company ON crm_contacts(company_id);
