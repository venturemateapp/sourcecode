-- +goose Down
DROP TABLE IF EXISTS website_contact_submissions;
DROP INDEX IF EXISTS ux_user_websites_published_custom_domain_lower;
DROP INDEX IF EXISTS ux_user_websites_custom_domain_lower;
DROP INDEX IF EXISTS ux_user_websites_published_subdomain_lower;
DROP INDEX IF EXISTS ux_user_websites_subdomain_lower;
ALTER TABLE user_websites
    DROP COLUMN IF EXISTS custom_domain_verified_at,
    DROP COLUMN IF EXISTS custom_domain_verification_token,
    DROP COLUMN IF EXISTS custom_domain_status,
    DROP COLUMN IF EXISTS published_revision,
    DROP COLUMN IF EXISTS draft_revision,
    DROP COLUMN IF EXISTS published_business_snapshot,
    DROP COLUMN IF EXISTS published_footer,
    DROP COLUMN IF EXISTS published_navigation,
    DROP COLUMN IF EXISTS published_global_styles,
    DROP COLUMN IF EXISTS published_pages,
    DROP COLUMN IF EXISTS published_custom_domain,
    DROP COLUMN IF EXISTS published_subdomain;
