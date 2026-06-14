CREATE TABLE IF NOT EXISTS bank_accounts (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    bank_name TEXT NOT NULL,
    account_type TEXT NOT NULL DEFAULT 'checking',
    account_number TEXT NOT NULL,
    account_name TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id ON bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_business_id ON bank_accounts(business_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_status ON bank_accounts(status);
