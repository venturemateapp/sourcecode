CREATE TABLE IF NOT EXISTS business_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    registration_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    legal_name TEXT NOT NULL DEFAULT '',
    tax_id TEXT NOT NULL DEFAULT '',
    owner_name TEXT NOT NULL DEFAULT '',
    owner_dob TEXT NOT NULL DEFAULT '',
    owner_ssn TEXT NOT NULL DEFAULT '',
    owner_email TEXT NOT NULL DEFAULT '',
    owner_phone TEXT NOT NULL DEFAULT '',
    address_street TEXT NOT NULL DEFAULT '',
    address_city TEXT NOT NULL DEFAULT '',
    address_state TEXT NOT NULL DEFAULT '',
    address_zip TEXT NOT NULL DEFAULT '',
    address_country TEXT NOT NULL DEFAULT 'United States',
    documents JSONB NOT NULL DEFAULT '[]',
    admin_notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_biz_reg_business_id ON business_registrations(business_id);
CREATE INDEX IF NOT EXISTS idx_biz_reg_user_id ON business_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_biz_reg_status ON business_registrations(status);
