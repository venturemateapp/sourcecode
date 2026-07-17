-- +goose Up
CREATE TABLE IF NOT EXISTS crm_object_defs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name_singular VARCHAR(100) NOT NULL,
    name_plural VARCHAR(100) NOT NULL,
    label_singular VARCHAR(100) NOT NULL,
    label_plural VARCHAR(100) NOT NULL,
    icon VARCHAR(50) NOT NULL DEFAULT 'FileText',
    description TEXT DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (business_id, name_singular)
);

CREATE TABLE IF NOT EXISTS crm_field_defs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    object_id UUID NOT NULL REFERENCES crm_object_defs(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    label VARCHAR(100) NOT NULL,
    field_type VARCHAR(50) NOT NULL DEFAULT 'text',
    is_required BOOLEAN NOT NULL DEFAULT false,
    is_unique BOOLEAN NOT NULL DEFAULT false,
    default_value TEXT DEFAULT '',
    options JSONB DEFAULT '[]',
    validation_rules JSONB DEFAULT '{}',
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (object_id, name)
);

CREATE TABLE IF NOT EXISTS crm_object_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    object_id UUID NOT NULL REFERENCES crm_object_defs(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_record_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id UUID NOT NULL REFERENCES crm_object_records(id) ON DELETE CASCADE,
    field_id UUID NOT NULL REFERENCES crm_field_defs(id) ON DELETE CASCADE,
    value TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (record_id, field_id)
);

CREATE INDEX IF NOT EXISTS idx_crm_object_defs_business ON crm_object_defs(business_id);
CREATE INDEX IF NOT EXISTS idx_crm_field_defs_object ON crm_field_defs(object_id);
CREATE INDEX IF NOT EXISTS idx_crm_object_records_object ON crm_object_records(object_id);
CREATE INDEX IF NOT EXISTS idx_crm_object_records_business ON crm_object_records(business_id);
CREATE INDEX IF NOT EXISTS idx_crm_record_values_record ON crm_record_values(record_id);
CREATE INDEX IF NOT EXISTS idx_crm_record_values_field ON crm_record_values(field_id);
