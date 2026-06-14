-- +goose Up
CREATE TABLE IF NOT EXISTS investors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    logo TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL,
    focus_industries JSONB NOT NULL DEFAULT '[]',
    stages JSONB NOT NULL DEFAULT '[]',
    check_size JSONB NOT NULL DEFAULT '{"min": 0, "max": 0}',
    aum BIGINT,
    portfolio JSONB NOT NULL DEFAULT '[]',
    team JSONB NOT NULL DEFAULT '[]',
    thesis TEXT NOT NULL,
    criteria JSONB NOT NULL DEFAULT '[]',
    match_score INT,
    status TEXT NOT NULL DEFAULT 'not-connected',
    connected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO investors (id, name, type, logo, location, focus_industries, stages, check_size, aum, portfolio, team, thesis, criteria, match_score, status, connected_at) VALUES
('inv_001', 'Sequoia Capital', 'vc', '', 'Menlo Park, CA', '["AI/ML", "SaaS", "Fintech"]', '["seed", "series-a", "series-b", "series-c"]', '{"min": 1000000, "max": 100000000}', 85000000000, '[]', '[]', 'Backing bold founders building category-defining companies', '["Strong technical team", "Large market opportunity"]', 92, 'connected', '2024-03-15T00:00:00Z'),
('inv_002', 'Andreessen Horowitz', 'vc', '', 'Menlo Park, CA', '["Crypto", "AI/ML", "Enterprise"]', '["seed", "series-a", "series-b"]', '{"min": 500000, "max": 50000000}', 35000000000, '[]', '[]', 'Software is eating the world', '["Technical founders", "Network effects"]', 88, 'pending', NULL),
('inv_003', 'Naval Ravikant', 'angel', '', 'San Francisco, CA', '["AI/ML", "Marketplaces", "Crypto"]', '["seed", "pre-seed"]', '{"min": 100000, "max": 5000000}', NULL, '[]', '[]', 'Building the future with leverage', '["Founder-market fit", "Deep tech"]', 85, 'pending', NULL),
('inv_004', 'Y Combinator', 'accelerator', '', 'Mountain View, CA', '["AI/ML", "SaaS", "Developer Tools", "Healthcare"]', '["pre-seed", "seed"]', '{"min": 125000, "max": 500000}', 10000000000, '[]', '[]', 'Build something people want', '["Clear value prop", "Growth potential"]', 78, 'not-connected', NULL),
('inv_005', 'Tiger Global', 'pe', '', 'New York, NY', '["Enterprise", "Fintech", "Consumer"]', '["series-b", "series-c", "growth"]', '{"min": 10000000, "max": 500000000}', 90000000000, '[]', '[]', 'Investing in the best companies globally', '["Proven unit economics", "Large TAM"]', 72, 'not-connected', NULL)
ON CONFLICT (id) DO NOTHING;
