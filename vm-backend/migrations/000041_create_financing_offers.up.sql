-- +goose Up
CREATE TABLE IF NOT EXISTS financing_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lender_name VARCHAR(255) NOT NULL,
    product_type VARCHAR(100) NOT NULL DEFAULT 'loan',
    min_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    max_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    min_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
    max_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
    term_months INT NOT NULL DEFAULT 12,
    requirements JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO financing_offers (lender_name, product_type, min_amount, max_amount, min_rate, max_rate, term_months, requirements) VALUES
('Stripe Capital', 'loan', 5000, 250000, 6.5, 15.0, 12, '["6 months revenue history", "$10k+ monthly revenue"]'),
('Brex', 'line_of_credit', 10000, 1000000, 7.0, 18.0, 6, '["Incorporated business", "$50k+ monthly revenue"]'),
('Silicon Valley Bank', 'loan', 50000, 5000000, 8.0, 20.0, 60, '["2+ years in business", "$1M+ annual revenue", "Strong credit history"]'),
('Mercury', 'term_loan', 25000, 2000000, 5.0, 12.0, 36, '["US incorporated", "$25k+ monthly revenue", "Tech startup"]'),
('Founder''s Circle', 'line_of_credit', 5000, 500000, 4.5, 10.0, 12, '["Any stage startup", "Good credit score"]');
