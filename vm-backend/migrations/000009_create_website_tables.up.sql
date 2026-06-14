-- +goose Up
CREATE TABLE IF NOT EXISTS website_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    thumbnail VARCHAR(500) NOT NULL DEFAULT '',
    category VARCHAR(50) NOT NULL DEFAULT 'startup',
    template_data JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_websites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    template_id UUID REFERENCES website_templates(id),
    subdomain VARCHAR(255) NOT NULL DEFAULT '',
    custom_domain VARCHAR(255) NOT NULL DEFAULT '',
    pages JSONB NOT NULL DEFAULT '[]',
    global_styles JSONB NOT NULL DEFAULT '{}',
    navigation JSONB NOT NULL DEFAULT '{}',
    footer JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    published_at TIMESTAMPTZ,
    last_modified TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_websites_business_id ON user_websites(business_id);
CREATE INDEX IF NOT EXISTS idx_user_websites_status ON user_websites(status);
CREATE INDEX IF NOT EXISTS idx_website_templates_category ON website_templates(category);

-- Insert default startup templates (idempotent)
INSERT INTO website_templates (name, description, thumbnail, category, template_data)
SELECT 'SaaS Modern', 'Clean, modern design for SaaS startups', '', 'saas', '{
  "brandDefaults": {"primaryColor": "#10b981", "secondaryColor": "#059669", "fontHeading": "Inter", "fontBody": "Inter"},
  "pages": [
    {"slug": "/", "title": "Home", "sections": [
      {"type": "hero", "name": "Hero", "defaultProps": {"headline": "Build something amazing", "subheadline": "The platform for modern startups", "ctaPrimary": "Get Started", "ctaSecondary": "Learn More", "background": "gradient", "align": "center"}},
      {"type": "features", "name": "Features", "defaultProps": {"title": "Why choose us", "subtitle": "Everything you need", "columns": 3, "features": [{"icon": "Zap", "title": "Fast", "description": "Lightning quick"}, {"icon": "Shield", "title": "Secure", "description": "Enterprise-grade"}, {"icon": "Scale", "title": "Scalable", "description": "Grows with you"}]}},
      {"type": "testimonials", "name": "Testimonials", "defaultProps": {"title": "Loved by founders", "style": "cards", "testimonials": [{"quote": "Game changer!", "author": "Sarah C.", "role": "CEO"}]}},
      {"type": "pricing", "name": "Pricing", "defaultProps": {"title": "Simple pricing", "plans": [{"name": "Starter", "price": 29, "features": ["5 Projects", "Basic Support"]}, {"name": "Pro", "price": 99, "popular": true, "features": ["Unlimited", "Priority Support"]}]}},
      {"type": "cta", "name": "CTA", "defaultProps": {"headline": "Ready to get started?", "cta": "Start Free Trial"}}
    ]},
    {"slug": "/about", "title": "About", "sections": [
      {"type": "text", "name": "Our Story", "defaultProps": {"title": "Our Story", "content": "Building the future.", "align": "center"}},
      {"type": "team", "name": "Team", "defaultProps": {"title": "Meet the team", "members": [{"name": "Alex Chen", "role": "CEO"}, {"name": "Sarah Kim", "role": "CTO"}]}},
      {"type": "stats", "name": "Stats", "defaultProps": {"title": "By the numbers", "stats": [{"value": "10K+", "label": "Customers"}, {"value": "99.9%", "label": "Uptime"}]}}
    ]},
    {"slug": "/contact", "title": "Contact", "sections": [
      {"type": "contact", "name": "Contact Form", "defaultProps": {"title": "Get in touch", "showName": true, "showCompany": true}}
    ]}
  ]
}'
WHERE NOT EXISTS (SELECT 1 FROM website_templates WHERE name = 'SaaS Modern');

INSERT INTO website_templates (name, description, thumbnail, category, template_data)
SELECT 'Startup Bold', 'Bold, vibrant design for early-stage startups', '', 'startup', '{
  "brandDefaults": {"primaryColor": "#6366f1", "secondaryColor": "#4f46e5", "fontHeading": "Poppins", "fontBody": "Open Sans"},
  "pages": [
    {"slug": "/", "title": "Home", "sections": [
      {"type": "hero", "name": "Hero", "defaultProps": {"headline": "Start building your dream", "subheadline": "From idea to launch", "align": "left", "background": "gradient"}},
      {"type": "stats", "name": "Stats", "defaultProps": {"title": "Our impact", "stats": [{"value": "50K+", "label": "Users"}, {"value": "1M+", "label": "Hours Saved"}]}},
      {"type": "features", "name": "Features", "defaultProps": {"title": "Powerful features", "columns": 2, "features": [{"icon": "Zap", "title": "Fast", "description": "Lightning quick"}]}},
      {"type": "cta", "name": "CTA", "defaultProps": {"headline": "Ready? Let''s go!", "cta": "Get Started"}}
    ]}
  ]
}'
WHERE NOT EXISTS (SELECT 1 FROM website_templates WHERE name = 'Startup Bold');

INSERT INTO website_templates (name, description, thumbnail, category, template_data)
SELECT 'Agency Minimal', 'Minimal, elegant design for agencies', '', 'agency', '{
  "brandDefaults": {"primaryColor": "#18181b", "secondaryColor": "#71717a", "fontHeading": "Playfair Display", "fontBody": "Inter"},
  "pages": [
    {"slug": "/", "title": "Home", "sections": [
      {"type": "hero", "name": "Hero", "defaultProps": {"headline": "We create digital experiences", "background": "image", "align": "center"}},
      {"type": "text", "name": "Intro", "defaultProps": {"title": "What we do", "content": "We create digital experiences that matter.", "align": "center"}},
      {"type": "testimonials", "name": "Testimonials", "defaultProps": {"title": "Client love", "style": "cards", "testimonials": [{"quote": "Amazing work!", "author": "Client"}]}},
      {"type": "contact", "name": "Contact", "defaultProps": {"title": "Get in touch", "showName": true}}
    ]}
  ]
}'
WHERE NOT EXISTS (SELECT 1 FROM website_templates WHERE name = 'Agency Minimal');
