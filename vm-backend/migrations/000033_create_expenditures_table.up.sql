-- +goose Up
CREATE TABLE IF NOT EXISTS expenditures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL DEFAULT 'other',
    description TEXT NOT NULL DEFAULT '',
    amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    vendor VARCHAR(255) NOT NULL DEFAULT '',
    receipt_url TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenditures_business ON expenditures(business_id);
CREATE INDEX IF NOT EXISTS idx_expenditures_category ON expenditures(category);
CREATE INDEX IF NOT EXISTS idx_expenditures_date ON expenditures(expense_date);
