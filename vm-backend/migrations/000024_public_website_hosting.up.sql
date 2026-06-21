-- +goose Up
-- Published snapshots keep draft edits private until the owner explicitly republishes.
ALTER TABLE user_websites
    ADD COLUMN IF NOT EXISTS published_subdomain VARCHAR(255) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS published_custom_domain VARCHAR(255) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS published_pages JSONB,
    ADD COLUMN IF NOT EXISTS published_global_styles JSONB,
    ADD COLUMN IF NOT EXISTS published_navigation JSONB,
    ADD COLUMN IF NOT EXISTS published_footer JSONB,
    ADD COLUMN IF NOT EXISTS published_business_snapshot JSONB,
    ADD COLUMN IF NOT EXISTS draft_revision INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS published_revision INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS custom_domain_status VARCHAR(20) NOT NULL DEFAULT 'none',
    ADD COLUMN IF NOT EXISTS custom_domain_verification_token VARCHAR(128) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS custom_domain_verified_at TIMESTAMPTZ;

UPDATE user_websites
SET subdomain = LOWER(TRIM(BOTH '-' FROM REGEXP_REPLACE(TRIM(subdomain), '[^a-zA-Z0-9-]+', '-', 'g'))),
    custom_domain = LOWER(TRIM(TRAILING '.' FROM TRIM(custom_domain)));

-- Resolve legacy duplicate reservations deterministically before creating snapshots/indexes.
WITH ranked AS (
    SELECT id, subdomain,
           ROW_NUMBER() OVER (PARTITION BY LOWER(subdomain) ORDER BY created_at, id) AS rn
    FROM user_websites
    WHERE subdomain <> ''
)
UPDATE user_websites w
SET subdomain = LEFT(r.subdomain, 54) || '-' || LEFT(w.id::text, 8)
FROM ranked r
WHERE w.id = r.id AND r.rn > 1;

-- Legacy custom domains were not verified. Keep one draft reservation and clear duplicates.
WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY LOWER(custom_domain) ORDER BY created_at, id) AS rn
    FROM user_websites
    WHERE custom_domain <> ''
)
UPDATE user_websites w
SET custom_domain = '', custom_domain_status = 'none'
FROM ranked r
WHERE w.id = r.id AND r.rn > 1;

-- Preserve sites that were already live, but never expose reserved or malformed hostnames.
UPDATE user_websites
SET published_subdomain = subdomain,
    published_custom_domain = '',
    published_pages = pages,
    published_global_styles = global_styles,
    published_navigation = navigation,
    published_footer = footer,
    published_business_snapshot = (SELECT jsonb_build_object(
        'name', b.name, 'tagline', b.tagline, 'description', b.description,
        'industry', b.industry, 'location', b.location, 'brandKit', b.brand_kit
    ) FROM businesses b WHERE b.id = user_websites.business_id),
    published_revision = GREATEST(draft_revision, 1)
WHERE status = 'published'
  AND published_revision = 0
  AND LENGTH(subdomain) BETWEEN 3 AND 63
  AND subdomain ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$'
  AND subdomain NOT IN (
      'admin','api','app','auth','blog','cdn','dashboard','docs','help','mail','smtp',
      'status','support','www','venturemate','sites','assets','static','graphql','billing'
  );

CREATE UNIQUE INDEX IF NOT EXISTS ux_user_websites_subdomain_lower
    ON user_websites (LOWER(subdomain)) WHERE subdomain <> '';
CREATE UNIQUE INDEX IF NOT EXISTS ux_user_websites_published_subdomain_lower
    ON user_websites (LOWER(published_subdomain)) WHERE published_subdomain <> '' AND status = 'published';
CREATE UNIQUE INDEX IF NOT EXISTS ux_user_websites_custom_domain_lower
    ON user_websites (LOWER(custom_domain)) WHERE custom_domain <> '';
CREATE UNIQUE INDEX IF NOT EXISTS ux_user_websites_published_custom_domain_lower
    ON user_websites (LOWER(published_custom_domain)) WHERE published_custom_domain <> '' AND status = 'published';

CREATE TABLE IF NOT EXISTS website_contact_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_id UUID NOT NULL REFERENCES user_websites(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL DEFAULT '',
    email VARCHAR(320) NOT NULL DEFAULT '',
    phone VARCHAR(80) NOT NULL DEFAULT '',
    company VARCHAR(255) NOT NULL DEFAULT '',
    message TEXT NOT NULL DEFAULT '',
    metadata JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'new',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_website_contact_submissions_business
    ON website_contact_submissions (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_website_contact_submissions_website
    ON website_contact_submissions (website_id, created_at DESC);
