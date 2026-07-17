-- +goose Down
ALTER TABLE invoices DROP COLUMN IF EXISTS subtotal;
ALTER TABLE invoices DROP COLUMN IF EXISTS tax_rate;
ALTER TABLE invoices DROP COLUMN IF EXISTS tax_amount;
ALTER TABLE invoices DROP COLUMN IF EXISTS discount;
ALTER TABLE invoices DROP COLUMN IF EXISTS shipping_cost;
ALTER TABLE invoices DROP COLUMN IF EXISTS customer_address;
ALTER TABLE invoices DROP COLUMN IF EXISTS billing_address;
ALTER TABLE invoices DROP COLUMN IF EXISTS po_number;
ALTER TABLE invoices DROP COLUMN IF EXISTS payment_terms;
ALTER TABLE invoices DROP COLUMN IF EXISTS pdf_url;
ALTER TABLE invoices DROP COLUMN IF EXISTS pdf_generated_at;
