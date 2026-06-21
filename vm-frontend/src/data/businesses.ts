// Business Data
import type { Business, TeamMember } from '../types/venturemate';

export const businesses: Business[] = [
  {
    id: 'biz_001',
    userId: 'user_001',
    name: 'NeuroTask AI',
    tagline: 'AI-powered task automation for knowledge workers',
    description: 'NeuroTask AI helps knowledge workers automate repetitive tasks using advanced AI agents. Our platform integrates with 100+ tools and learns user workflows to suggest automations.',
    industry: 'Artificial Intelligence',
    stage: 'mvp',
    foundedDate: '2024-01-20',
    location: 'San Francisco, CA',
    website: 'neurotask.venturemate.net',
    brandKit: {
      logo: 'https://placeholder.com/logo-neurotask.png',
      logoWhite: 'https://placeholder.com/logo-neurotask-white.png',
      logoIcon: 'https://placeholder.com/icon-neurotask.png',
      primaryColor: '#059669',
      secondaryColor: '#10b981',
      accentColor: '#34d399',
      darkColor: '#064e3b',
      fontHeading: 'Inter',
      fontBody: 'Inter',
      patterns: ['grid', 'dots'],
      socialBanners: [
        { id: 'sb_001', platform: 'linkedin', url: 'https://placeholder.com/banner-linkedin.png' },
        { id: 'sb_002', platform: 'twitter', url: 'https://placeholder.com/banner-twitter.png' }
      ]
    },
    pitchDeck: {
      id: 'pd_001',
      title: 'NeuroTask AI - Pitch Deck',
      slides: [
        {
          id: 'slide_001',
          type: 'title',
          title: 'NeuroTask AI',
          content: 'AI-powered task automation for knowledge workers',
          order: 1,
          layout: 'center'
        },
        {
          id: 'slide_002',
          type: 'problem',
          title: 'The Problem',
          content: 'Knowledge workers spend 60% of their time on repetitive tasks',
          bullets: [
            'Average worker switches between 10+ apps daily',
            'Context switching costs 23 minutes per interruption',
            '$1.2T lost annually to productivity inefficiencies',
            'Current automation tools require technical expertise'
          ],
          order: 2,
          layout: 'split'
        },
        {
          id: 'slide_003',
          type: 'solution',
          title: 'Our Solution',
          content: 'AI agents that learn and automate your workflows',
          bullets: [
            'Natural language workflow creation',
            'Learns from your actions automatically',
            'Integrates with 100+ tools',
            'No-code automation builder'
          ],
          order: 3,
          layout: 'split'
        },
        {
          id: 'slide_004',
          type: 'market',
          title: 'Market Opportunity',
          content: '$86B productivity software market growing 14% YoY',
          chart: {
            type: 'bar',
            labels: ['2023', '2024', '2025', '2026', '2027'],
            datasets: [
              { label: 'Market Size ($B)', data: [86, 98, 112, 128, 146], color: '#059669' }
            ]
          },
          order: 4,
          layout: 'chart'
        },
        {
          id: 'slide_005',
          type: 'product',
          title: 'Product',
          content: 'End-to-end automation platform with AI at its core',
          bullets: [
            'Workflow Recorder - Captures actions in real-time',
            'AI Suggestions - Proposes automations based on patterns',
            'Smart Scheduler - Optimizes task timing',
            'Analytics Dashboard - Track time saved'
          ],
          order: 5,
          layout: 'grid'
        },
        {
          id: 'slide_006',
          type: 'traction',
          title: 'Traction',
          content: 'Strong early traction with enterprise clients',
          bullets: [
            '500+ beta users',
            '$12K MRR',
            '92% user retention',
            '3 enterprise pilots ($150K ARR potential)',
            'Featured in TechCrunch'
          ],
          order: 6,
          layout: 'stats'
        },
        {
          id: 'slide_007',
          type: 'business-model',
          title: 'Business Model',
          content: 'SaaS with freemium model',
          bullets: [
            'Free: 50 automations/month',
            'Pro: $29/user/month - Unlimited automations',
            'Enterprise: $99/user/month - Advanced features + SSO',
            'API access: Usage-based pricing'
          ],
          order: 7,
          layout: 'pricing'
        },
        {
          id: 'slide_008',
          type: 'team',
          title: 'Team',
          content: 'Experienced founders with proven track record',
          bullets: [
            'Alex Chen - CEO (Ex-Google PM, 2 exits)',
            'Sarah Kim - CTO (Ex-OpenAI, PhD Stanford)',
            'Mike Johnson - CPO (Ex-Notion, Product Lead)',
            '4 engineers + 2 designers'
          ],
          order: 8,
          layout: 'team'
        },
        {
          id: 'slide_009',
          type: 'financials',
          title: 'Financial Projections',
          content: 'Path to $10M ARR in 3 years',
          chart: {
            type: 'line',
            labels: ['Q1', 'Q2', 'Q3', 'Q4', 'Year 2', 'Year 3'],
            datasets: [
              { label: 'Revenue ($K)', data: [12, 35, 85, 180, 800, 2500], color: '#059669' },
              { label: 'Customers', data: [50, 120, 280, 500, 1500, 4000], color: '#10b981' }
            ]
          },
          order: 9,
          layout: 'chart'
        },
        {
          id: 'slide_010',
          type: 'ask',
          title: 'The Ask',
          content: 'Raising $2M Seed Round',
          bullets: [
            '$800K - Engineering (expand team to 12)',
            '$600K - Sales & Marketing',
            '$400K - Product development',
            '$200K - Operations & Legal',
            '18-month runway to Series A'
          ],
          order: 10,
          layout: 'center'
        }
      ],
      template: 'modern-tech',
      lastModified: '2024-04-03T10:00:00Z',
      exportFormats: ['pdf', 'pptx'],
      shareLink: 'https://venturemate.net/p/neurotask-deck',
      views: 147
    },
    businessPlan: {
      id: 'bp_001',
      title: 'NeuroTask AI - Business Plan',
      sections: [
        {
          id: 'bps_001',
          title: 'Executive Summary',
          content: 'NeuroTask AI is building the future of workplace automation with AI-powered agents that learn and execute workflows automatically.',
          aiGenerated: true,
          order: 1
        },
        {
          id: 'bps_002',
          title: 'Company Overview',
          content: 'Founded in 2024 by former Google and OpenAI engineers, NeuroTask AI is positioned to capture the growing AI automation market.',
          aiGenerated: false,
          order: 2
        },
        {
          id: 'bps_003',
          title: 'Market Analysis',
          content: 'The productivity software market is experiencing rapid growth driven by AI adoption and remote work trends.',
          subsections: [
            { id: 'bps_003_1', title: 'TAM/SAM/SOM', content: 'TAM: $86B, SAM: $12B, SOM: $500M', aiGenerated: true, order: 1 },
            { id: 'bps_003_2', title: 'Market Trends', content: 'Remote work acceleration, AI adoption at enterprise level, No-code movement growth', aiGenerated: true, order: 2 }
          ],
          aiGenerated: true,
          order: 3
        },
        {
          id: 'bps_004',
          title: 'Product Strategy',
          content: 'Our AI-first approach differentiates us from traditional automation tools.',
          aiGenerated: false,
          order: 4
        },
        {
          id: 'bps_005',
          title: 'Go-to-Market Strategy',
          content: 'Land-and-expand strategy targeting mid-market companies with product-led growth.',
          aiGenerated: true,
          order: 5
        },
        {
          id: 'bps_006',
          title: 'Financial Plan',
          content: 'Projected to reach profitability by Q4 2026 with $10M ARR.',
          aiGenerated: true,
          order: 6
        }
      ],
      executiveSummary: 'NeuroTask AI is an AI-powered automation platform that helps knowledge workers save 10+ hours per week by automatically learning and executing repetitive workflows.',
      lastModified: '2024-04-02T15:00:00Z',
      version: '1.2',
      exportFormats: ['pdf', 'docx', 'md']
    },
    milestones: [
      {
        id: 'ms_001',
        title: 'Launch Private Beta',
        description: 'Release beta to 100 selected users',
        status: 'completed',
        priority: 'critical',
        dueDate: '2024-02-01',
        completedDate: '2024-01-28',
        category: 'product',
        assignee: 'Sarah Kim'
      },
      {
        id: 'ms_002',
        title: 'Reach 500 Users',
        description: 'Hit 500 active beta users milestone',
        status: 'completed',
        priority: 'high',
        dueDate: '2024-03-15',
        completedDate: '2024-03-10',
        category: 'marketing',
        assignee: 'Alex Chen'
      },
      {
        id: 'ms_003',
        title: 'Close Seed Round',
        description: 'Raise $2M seed funding',
        status: 'in-progress',
        priority: 'critical',
        dueDate: '2024-05-30',
        category: 'funding',
        assignee: 'Alex Chen',
        aiSuggestions: ['Update pitch deck with latest metrics', 'Schedule follow-up with Sequoia', 'Prepare data room']
      },
      {
        id: 'ms_004',
        title: 'Launch Public Beta',
        description: 'Open platform to public with freemium model',
        status: 'in-progress',
        priority: 'high',
        dueDate: '2024-04-15',
        category: 'product',
        assignee: 'Mike Johnson'
      },
      {
        id: 'ms_005',
        title: 'Hire Head of Sales',
        description: 'Recruit experienced SaaS sales leader',
        status: 'pending',
        priority: 'high',
        dueDate: '2024-05-01',
        category: 'team',
        assignee: 'Alex Chen',
        aiSuggestions: ['Post on AngelList', 'Reach out to Sara from previous company', 'Consider external recruiter']
      },
      {
        id: 'ms_006',
        title: 'Reach $50K MRR',
        description: 'Achieve $50,000 monthly recurring revenue',
        status: 'pending',
        priority: 'critical',
        dueDate: '2024-08-01',
        category: 'marketing',
        assignee: 'Team'
      },
      {
        id: 'ms_007',
        title: 'SOC 2 Compliance',
        description: 'Complete SOC 2 Type II certification',
        status: 'pending',
        priority: 'medium',
        dueDate: '2024-09-01',
        category: 'legal',
        assignee: 'Sarah Kim'
      }
    ],
    team: [
      {
        id: 'tm_001',
        userId: 'usr_001',
        name: 'Alex Chen',
        email: 'alex@neurotask.ai',
        role: 'Founder & CEO',
        title: 'Chief Executive Officer',
        avatar: '/img1.jpeg',
        equity: 42,
        status: 'active',
        joinedDate: '2024-01-20',
        responsibilities: ['Strategy', 'Fundraising', 'Hiring', 'Product Vision']
      },
      {
        id: 'tm_002',
        name: 'Sarah Kim',
        email: 'sarah@neurotask.ai',
        role: 'Co-founder',
        title: 'Chief Technology Officer',
        avatar: '/img2.jpeg',
        equity: 28,
        status: 'active',
        joinedDate: '2024-01-20',
        responsibilities: ['Engineering', 'AI/ML', 'Technical Architecture']
      },
      {
        id: 'tm_003',
        name: 'Mike Johnson',
        email: 'mike@neurotask.ai',
        role: 'Co-founder',
        title: 'Chief Product Officer',
        avatar: '/img3.jpeg',
        equity: 18,
        status: 'active',
        joinedDate: '2024-02-01',
        responsibilities: ['Product Design', 'User Experience', 'Growth']
      },
      {
        id: 'tm_004',
        name: 'Priya Sharma',
        email: 'priya@neurotask.ai',
        role: 'Employee',
        title: 'Lead AI Engineer',
        avatar: '/img4.jpeg',
        equity: 2,
        status: 'active',
        joinedDate: '2024-02-15',
        responsibilities: ['Model Training', 'NLP Pipelines', 'Research']
      },
      {
        id: 'tm_005',
        name: 'Marcus Johnson',
        email: 'marcus@neurotask.ai',
        role: 'Employee',
        title: 'Senior Full-Stack Engineer',
        avatar: '/img1.jpeg',
        equity: 1.5,
        status: 'active',
        joinedDate: '2024-03-01',
        responsibilities: ['Frontend Architecture', 'API Design', 'Performance']
      },
      {
        id: 'tm_006',
        name: 'Aisha Patel',
        email: 'aisha@neurotask.ai',
        role: 'Employee',
        title: 'Head of Design',
        avatar: '/img2.jpeg',
        equity: 1.5,
        status: 'active',
        joinedDate: '2024-03-01',
        responsibilities: ['UI/UX Design', 'Design Systems', 'Brand Direction']
      },
      {
        id: 'tm_007',
        name: 'James Wilson',
        email: 'james@neurotask.ai',
        role: 'Employee',
        title: 'Head of Sales',
        avatar: '/img3.jpeg',
        equity: 1,
        status: 'active',
        joinedDate: '2024-03-15',
        responsibilities: ['Enterprise Sales', 'Partnerships', 'Revenue Growth']
      },
      {
        id: 'tm_008',
        name: 'Emily Chen',
        email: 'emily@neurotask.ai',
        role: 'Employee',
        title: 'Growth Marketing Manager',
        avatar: '/img4.jpeg',
        equity: 0.8,
        status: 'active',
        joinedDate: '2024-03-20',
        responsibilities: ['Paid Acquisition', 'Content Marketing', 'Analytics']
      },
      {
        id: 'tm_009',
        name: 'Tyler Brooks',
        email: 'tyler@neurotask.ai',
        role: 'Employee',
        title: 'DevOps Engineer',
        avatar: '/img1.jpeg',
        equity: 0.8,
        status: 'active',
        joinedDate: '2024-03-25',
        responsibilities: ['Infrastructure', 'CI/CD', 'Security']
      },
      {
        id: 'tm_010',
        name: 'David Park',
        email: 'david@neurotask.ai',
        role: 'Employee',
        title: 'Product Manager',
        avatar: '/img2.jpeg',
        equity: 0.5,
        status: 'pending',
        joinedDate: '2024-04-15',
        responsibilities: ['Roadmap', 'User Research', 'Feature Prioritization']
      },
      {
        id: 'tm_011',
        name: 'Lisa Wong',
        email: 'lisa@neurotask.ai',
        role: 'Employee',
        title: 'Customer Success Lead',
        avatar: '/img3.jpeg',
        equity: 0.5,
        status: 'pending',
        joinedDate: '2024-04-20',
        responsibilities: ['Onboarding', 'Support', 'Customer Feedback']
      }
    ],
    documents: [
      {
        id: 'doc_001',
        name: 'Incorporation Documents.pdf',
        type: 'pdf',
        size: '2.4 MB',
        url: '/docs/incorporation.pdf',
        category: 'legal',
        uploadedBy: 'Alex Chen',
        uploadedAt: '2024-01-20T00:00:00Z',
        lastModified: '2024-01-20T00:00:00Z',
        tags: ['legal', 'incorporation', 'delaware'],
        sharedWith: ['tm_001', 'tm_002', 'tm_003']
      },
      {
        id: 'doc_002',
        name: 'Founder Agreement.pdf',
        type: 'pdf',
        size: '1.2 MB',
        url: '/docs/founder-agreement.pdf',
        category: 'legal',
        uploadedBy: 'Alex Chen',
        uploadedAt: '2024-01-21T00:00:00Z',
        lastModified: '2024-01-21T00:00:00Z',
        tags: ['legal', 'founders', 'equity'],
        sharedWith: ['tm_001', 'tm_002', 'tm_003']
      },
      {
        id: 'doc_003',
        name: 'Financial Model v2.xlsx',
        type: 'xlsx',
        size: '856 KB',
        url: '/docs/financial-model.xlsx',
        category: 'financial',
        uploadedBy: 'Sarah Kim',
        uploadedAt: '2024-03-15T00:00:00Z',
        lastModified: '2024-04-01T00:00:00Z',
        tags: ['financial', 'forecast', 'model'],
        sharedWith: ['tm_001', 'tm_002', 'tm_003']
      },
      {
        id: 'doc_004',
        name: 'Product Roadmap Q2.pdf',
        type: 'pdf',
        size: '3.1 MB',
        url: '/docs/roadmap-q2.pdf',
        category: 'product',
        uploadedBy: 'Mike Johnson',
        uploadedAt: '2024-03-20T00:00:00Z',
        lastModified: '2024-03-20T00:00:00Z',
        tags: ['product', 'roadmap', 'planning'],
        sharedWith: ['tm_001', 'tm_002', 'tm_003']
      },
      {
        id: 'doc_005',
        name: 'Brand Guidelines.pdf',
        type: 'pdf',
        size: '15.2 MB',
        url: '/docs/brand-guidelines.pdf',
        category: 'marketing',
        uploadedBy: 'Mike Johnson',
        uploadedAt: '2024-02-15T00:00:00Z',
        lastModified: '2024-02-15T00:00:00Z',
        tags: ['brand', 'design', 'guidelines'],
        sharedWith: ['tm_001', 'tm_002', 'tm_003']
      }
    ],
    websiteConfig: {
      id: 'web_001',
      subdomain: 'neurotask',
      status: 'published',
      template: 'saas-modern',
      pages: [
        {
          id: 'page_001',
          slug: '/',
          title: 'Home',
          isHome: true,
          metaDescription: 'AI-powered task automation for knowledge workers',
          sections: [
            {
              id: 'sec_001',
              type: 'hero',
              order: 1,
              visible: true,
              content: {
                headline: 'Automate Your Workflows with AI',
                subheadline: 'Save 10+ hours every week with intelligent automation',
                ctaPrimary: 'Start Free Trial',
                ctaSecondary: 'Watch Demo'
              }
            },
            {
              id: 'sec_002',
              type: 'features',
              order: 2,
              visible: true,
              content: {
                title: 'Powerful Features',
                features: [
                  { icon: 'robot', title: 'AI Workflows', description: 'Natural language automation' },
                  { icon: 'integration', title: '100+ Integrations', description: 'Connect your tools' }
                ]
              }
            }
          ]
        }
      ],
      seo: {
        title: 'NeuroTask AI - Automate Your Workflows',
        description: 'AI-powered task automation for knowledge workers',
        keywords: ['AI automation', 'workflow', 'productivity']
      },
      analytics: {
        googleAnalyticsId: 'GA-XXXXXXXX'
      },
      lastPublished: '2024-04-01T00:00:00Z'
    },
    financials: {
      fundingRaised: 500000,
      fundingRounds: [
        {
          id: 'fr_001',
          name: 'Pre-Seed',
          type: 'pre-seed',
          amount: 500000,
          date: '2024-02-15',
          investors: ['Alex Chen', 'Friends & Family'],
          valuation: 2500000
        }
      ],
      revenue: {
        currentMRR: 12000,
        currentARR: 144000,
        growthRate: 28,
        history: [
          { month: 'Jan 2024', value: 0 },
          { month: 'Feb 2024', value: 2000 },
          { month: 'Mar 2024', value: 7000 },
          { month: 'Apr 2024', value: 12000 }
        ]
      },
      expenses: {
        monthlyBurn: 35000,
        breakdown: [
          { category: 'Engineering', amount: 18000, percentage: 51 },
          { category: 'Marketing', amount: 8000, percentage: 23 },
          { category: 'Operations', amount: 5000, percentage: 14 },
          { category: 'Legal', amount: 4000, percentage: 12 }
        ]
      },
      runway: 14,
      burnRate: 35000,
      projections: [
        { year: 2024, revenue: 180000, expenses: 420000, profit: -240000, customers: 500 },
        { year: 2025, revenue: 960000, expenses: 780000, profit: 180000, customers: 2000 },
        { year: 2026, revenue: 3000000, expenses: 2100000, profit: 900000, customers: 5500 }
      ]
    },
    metrics: {
      totalUsers: 523,
      activeUsers: 412,
      retentionRate: 92,
      churnRate: 8,
      nps: 67,
      cac: 45,
      ltv: 850,
      customMetrics: [
        { id: 'cm_001', name: 'Automations Created', value: 12500, target: 20000, unit: 'count' },
        { id: 'cm_002', name: 'Time Saved', value: 45000, target: 100000, unit: 'hours' }
      ]
    },
    aiGenerated: {
      ideas: [
        {
          id: 'idea_001',
          title: 'AI Meeting Summarizer',
          description: 'Automatically summarize meetings and create action items',
          industry: 'Productivity',
          marketSize: '$5B',
          difficulty: 'medium',
          potential: 'high',
          generatedAt: '2024-03-15T00:00:00Z'
        }
      ],
      marketResearch: {
        id: 'mr_001',
        marketSize: '$86B productivity software market',
        tam: 86000000000,
        sam: 12000000000,
        som: 500000000,
        trends: ['AI adoption accelerating', 'Remote work driving productivity needs', 'No-code movement'],
        opportunities: ['SMB market underserved', 'Integration fatigue', 'AI agents mainstream'],
        threats: ['Big tech competition', 'Economic downturn', 'Privacy concerns'],
        generatedAt: '2024-03-01T00:00:00Z'
      },
      competitorAnalysis: {
        id: 'ca_001',
        competitors: [
          {
            id: 'comp_001',
            name: 'Zapier',
            website: 'zapier.com',
            strengths: ['Market leader', 'Wide integration', 'Brand recognition'],
            weaknesses: ['Complex for non-tech', 'Expensive', 'Limited AI'],
            marketShare: 35,
            funding: '$2.5B valuation'
          },
          {
            id: 'comp_002',
            name: 'Make',
            website: 'make.com',
            strengths: ['Visual builder', 'Powerful workflows'],
            weaknesses: ['Learning curve', 'Smaller ecosystem'],
            marketShare: 8
          }
        ],
        swot: {
          strengths: ['AI-first', 'Natural language', 'Experienced team'],
          weaknesses: ['Limited integrations', 'Small team', 'New brand'],
          opportunities: ['AI agent wave', 'SMB market', 'API-first platform'],
          threats: ['Zapier AI', 'Microsoft Power Automate', 'Talent war']
        },
        generatedAt: '2024-03-10T00:00:00Z'
      },
      financialForecast: {
        id: 'ff_001',
        assumptions: ['ARPU: $35/month', 'Monthly churn: 5%', 'CAC: $150'],
        projections: [
          { year: 2024, revenue: 180000, expenses: 420000, profit: -240000, customers: 500 },
          { year: 2025, revenue: 960000, expenses: 780000, profit: 180000, customers: 2000 },
          { year: 2026, revenue: 3000000, expenses: 2100000, profit: 900000, customers: 5500 }
        ],
        scenarios: [
          {
            name: 'conservative',
            projections: [
              { year: 2024, revenue: 120000, expenses: 400000, profit: -280000, customers: 350 },
              { year: 2025, revenue: 600000, expenses: 700000, profit: -100000, customers: 1200 },
              { year: 2026, revenue: 1800000, expenses: 1600000, profit: 200000, customers: 3500 }
            ]
          },
          {
            name: 'moderate',
            projections: [
              { year: 2024, revenue: 180000, expenses: 420000, profit: -240000, customers: 500 },
              { year: 2025, revenue: 960000, expenses: 780000, profit: 180000, customers: 2000 },
              { year: 2026, revenue: 3000000, expenses: 2100000, profit: 900000, customers: 5500 }
            ]
          },
          {
            name: 'optimistic',
            projections: [
              { year: 2024, revenue: 240000, expenses: 450000, profit: -210000, customers: 700 },
              { year: 2025, revenue: 1500000, expenses: 900000, profit: 600000, customers: 3000 },
              { year: 2026, revenue: 5000000, expenses: 2800000, profit: 2200000, customers: 8500 }
            ]
          }
        ],
        generatedAt: '2024-03-20T00:00:00Z'
      }
    },
    status: 'active',
    createdAt: '2024-01-20T00:00:00Z'
  },
  {
    id: 'biz_002',
    userId: 'user_001',
    name: 'GreenCart',
    tagline: 'Sustainable grocery delivery with zero waste',
    description: 'GreenCart delivers organic groceries in reusable packaging, eliminating single-use plastics.',
    industry: 'Food & Beverage',
    stage: 'idea',
    foundedDate: '2024-03-15',
    location: 'Austin, TX',
    brandKit: {
      logo: 'https://placeholder.com/logo-greencart.png',
      logoWhite: 'https://placeholder.com/logo-greencart-white.png',
      logoIcon: 'https://placeholder.com/icon-greencart.png',
      primaryColor: '#16a34a',
      secondaryColor: '#22c55e',
      accentColor: '#4ade80',
      darkColor: '#14532d',
      fontHeading: 'Poppins',
      fontBody: 'Open Sans',
      patterns: ['leaves', 'organic'],
      socialBanners: []
    },
    pitchDeck: {
      id: 'pd_002',
      title: 'GreenCart - Pitch Deck',
      slides: [
        {
          id: 'slide_201',
          type: 'title',
          title: 'GreenCart',
          content: 'Sustainable grocery delivery with zero waste',
          order: 1,
          layout: 'center'
        }
      ],
      template: 'eco-friendly',
      lastModified: '2024-04-01T00:00:00Z',
      exportFormats: ['pdf'],
      views: 23
    },
    businessPlan: {
      id: 'bp_002',
      title: 'GreenCart - Business Plan',
      sections: [],
      executiveSummary: 'GreenCart delivers organic groceries in reusable packaging.',
      lastModified: '2024-03-20T00:00:00Z',
      version: '1.0',
      exportFormats: ['pdf', 'docx']
    },
    milestones: [
      {
        id: 'ms_201',
        title: 'Validate Idea',
        description: 'Survey 100 potential customers',
        status: 'in-progress',
        priority: 'high',
        dueDate: '2024-04-30',
        category: 'product',
        assignee: 'Alex Chen'
      }
    ],
    team: [
      {
        id: 'tm_201',
        userId: 'usr_001',
        name: 'Alex Chen',
        email: 'alex@greencart.eco',
        role: 'Founder & CEO',
        title: 'Chief Executive Officer',
        avatar: '/img1.jpeg',
        equity: 55,
        status: 'active',
        joinedDate: '2024-03-15',
        responsibilities: ['Strategy', 'Fundraising', 'Operations', 'Partnerships']
      },
      {
        id: 'tm_202',
        name: 'Marcus Johnson',
        email: 'marcus@greencart.eco',
        role: 'Co-founder',
        title: 'Chief Technology Officer',
        avatar: '/img2.jpeg',
        equity: 25,
        status: 'active',
        joinedDate: '2024-03-20',
        responsibilities: ['Engineering', 'Platform', 'Integrations']
      },
      {
        id: 'tm_203',
        name: 'Aisha Patel',
        email: 'aisha@greencart.eco',
        role: 'Co-founder',
        title: 'Chief Design Officer',
        avatar: '/img3.jpeg',
        equity: 15,
        status: 'active',
        joinedDate: '2024-03-20',
        responsibilities: ['Brand', 'UX/UI', 'Packaging Design']
      },
      {
        id: 'tm_204',
        name: 'Rachel Green',
        email: 'rachel@greencart.eco',
        role: 'Employee',
        title: 'Operations Manager',
        avatar: '/img4.jpeg',
        equity: 2,
        status: 'active',
        joinedDate: '2024-04-01',
        responsibilities: ['Supply Chain', 'Logistics', 'Vendor Relations']
      },
      {
        id: 'tm_205',
        name: 'Tom Miller',
        email: 'tom@greencart.eco',
        role: 'Employee',
        title: 'Sustainability Lead',
        avatar: '/img1.jpeg',
        equity: 1.5,
        status: 'active',
        joinedDate: '2024-04-05',
        responsibilities: ['Sustainability Metrics', 'Packaging R&D', 'Certifications']
      },
      {
        id: 'tm_206',
        name: 'Sofia Martinez',
        email: 'sofia@greencart.eco',
        role: 'Employee',
        title: 'Community Manager',
        avatar: '/img2.jpeg',
        equity: 1,
        status: 'active',
        joinedDate: '2024-04-10',
        responsibilities: ['Social Media', 'Customer Engagement', 'Events']
      },
      {
        id: 'tm_207',
        name: 'Pending',
        email: '',
        role: 'Employee',
        title: 'Head of Finance',
        avatar: '/img3.jpeg',
        equity: 0,
        status: 'pending',
        joinedDate: '',
        responsibilities: ['Financial Planning', 'Forecasting', 'Investor Reporting']
      }
    ],
    documents: [],
    websiteConfig: {
      id: 'web_002',
      subdomain: 'greencart',
      status: 'draft',
      template: 'eco-modern',
      pages: [],
      seo: {
        title: 'GreenCart - Zero Waste Grocery',
        description: 'Sustainable grocery delivery',
        keywords: ['sustainable', 'grocery', 'zero waste']
      },
      analytics: {}
    },
    financials: {
      fundingRaised: 0,
      fundingRounds: [],
      revenue: {
        currentMRR: 0,
        currentARR: 0,
        growthRate: 0,
        history: []
      },
      expenses: {
        monthlyBurn: 2000,
        breakdown: [
          { category: 'Operations', amount: 1000, percentage: 50 },
          { category: 'Marketing', amount: 500, percentage: 25 },
          { category: 'Legal', amount: 500, percentage: 25 }
        ]
      },
      runway: 6,
      burnRate: 2000,
      projections: [
        { year: 2024, revenue: 0, expenses: 24000, profit: -24000, customers: 0 },
        { year: 2025, revenue: 120000, expenses: 180000, profit: -60000, customers: 200 },
        { year: 2026, revenue: 600000, expenses: 450000, profit: 150000, customers: 800 }
      ]
    },
    metrics: {
      totalUsers: 0,
      activeUsers: 0,
      retentionRate: 0,
      churnRate: 0,
      nps: 0,
      cac: 0,
      ltv: 0,
      customMetrics: []
    },
    aiGenerated: { ideas: [] },
    status: 'active',
    createdAt: '2024-03-15T00:00:00Z'
  }
];

export const getBusinessById = (id: string) => businesses.find(b => b.id === id);

// Add a new business to the list
export const addBusiness = (businessData: Partial<Business>): Business => {
  const newBusiness: Business = {
    ...businessData,
    id: `biz_${Date.now()}`,
    createdAt: new Date().toISOString(),
  } as Business;
  
  businesses.push(newBusiness);
  return newBusiness;
};

// Update team members for a business
export const updateBusinessTeam = (businessId: string, team: TeamMember[]): void => {
  const business = businesses.find(b => b.id === businessId);
  if (business) {
    business.team = team;
  }
};
