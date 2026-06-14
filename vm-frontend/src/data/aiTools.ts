// AI Tools Data
import type { AITool, AppNotification, NavSection } from '../types/venturemate';

export const aiTools: AITool[] = [
  {
    id: 'aitool_001',
    name: 'Generate Startup Idea',
    description: 'Get AI-generated startup ideas based on your interests, skills, and market trends',
    icon: 'Lightbulb',
    category: 'strategy',
    inputs: [
      { name: 'interests', type: 'multiselect', label: 'Your Interests', options: ['AI/ML', 'Fintech', 'Healthcare', 'Climate', 'Education', 'Gaming'], required: true },
      { name: 'skills', type: 'multiselect', label: 'Your Skills', options: ['Engineering', 'Design', 'Marketing', 'Sales', 'Operations'], required: true },
      { name: 'budget', type: 'select', label: 'Initial Budget', options: ['$0-10K', '$10K-50K', '$50K-100K', '$100K+'], required: false }
    ],
    outputs: ['Startup ideas', 'Market analysis', 'Execution roadmap'],
    usageCount: 15
  },
  {
    id: 'aitool_002',
    name: 'Market Research',
    description: 'Comprehensive market research including TAM/SAM/SOM, trends, and opportunities',
    icon: 'TrendingUp',
    category: 'research',
    inputs: [
      { name: 'industry', type: 'text', label: 'Industry', placeholder: 'e.g., SaaS productivity tools', required: true },
      { name: 'region', type: 'select', label: 'Target Region', options: ['Global', 'North America', 'Europe', 'Asia', 'LATAM'], required: true }
    ],
    outputs: ['Market size', 'Growth trends', 'Key players', 'Opportunities', 'Threats'],
    usageCount: 8
  },
  {
    id: 'aitool_003',
    name: 'Pitch Deck Generator',
    description: 'Generate a complete pitch deck with AI-powered content and design',
    icon: 'Presentation',
    category: 'content',
    inputs: [
      { name: 'business_name', type: 'text', label: 'Business Name', required: true },
      { name: 'tagline', type: 'text', label: 'Tagline', required: true },
      { name: 'stage', type: 'select', label: 'Stage', options: ['Idea', 'Pre-seed', 'Seed', 'Series A'], required: true },
      { name: 'funding_amount', type: 'text', label: 'Funding Amount', placeholder: 'e.g., $2M', required: false }
    ],
    outputs: ['Complete pitch deck', 'Slide notes', 'Investor Q&A prep'],
    usageCount: 12
  },
  {
    id: 'aitool_004',
    name: 'Business Plan Writer',
    description: 'Generate a comprehensive business plan with financial projections',
    icon: 'FileText',
    category: 'content',
    inputs: [
      { name: 'business_name', type: 'text', label: 'Business Name', required: true },
      { name: 'industry', type: 'text', label: 'Industry', required: true },
      { name: 'plan_type', type: 'select', label: 'Plan Type', options: ['Internal', 'Investor', 'Bank Loan', 'Grant'], required: true }
    ],
    outputs: ['Executive summary', 'Market analysis', 'Financial projections', 'Operational plan'],
    usageCount: 6
  },
  {
    id: 'aitool_005',
    name: 'Competitor Analysis',
    description: 'Deep dive into your competitors with SWOT analysis and positioning',
    icon: 'Users',
    category: 'research',
    inputs: [
      { name: 'your_company', type: 'text', label: 'Your Company', required: true },
      { name: 'competitors', type: 'text', label: 'Main Competitors', placeholder: 'Comma-separated list', required: true }
    ],
    outputs: ['Competitor profiles', 'SWOT analysis', 'Differentiation strategy'],
    usageCount: 9
  },
  {
    id: 'aitool_006',
    name: 'Financial Forecast',
    description: 'Generate 3-year financial projections with multiple scenarios',
    icon: 'BarChart3',
    category: 'strategy',
    inputs: [
      { name: 'business_model', type: 'select', label: 'Business Model', options: ['SaaS', 'Marketplace', 'E-commerce', 'Consumer', 'Enterprise'], required: true },
      { name: 'current_mrr', type: 'number', label: 'Current MRR', required: false },
      { name: 'target_arr', type: 'number', label: 'Target ARR (Year 3)', required: true }
    ],
    outputs: ['Revenue projections', 'Expense forecast', 'Cash flow analysis', 'Unit economics'],
    usageCount: 4
  },
  {
    id: 'aitool_007',
    name: 'Website Copywriter',
    description: 'Generate conversion-optimized website copy for your landing pages',
    icon: 'Globe',
    category: 'content',
    inputs: [
      { name: 'product_name', type: 'text', label: 'Product Name', required: true },
      { name: 'description', type: 'text', label: 'Brief Description', required: true },
      { name: 'tone', type: 'select', label: 'Tone', options: ['Professional', 'Casual', 'Playful', 'Technical'], required: true }
    ],
    outputs: ['Hero section', 'Feature descriptions', 'CTA copy', 'Testimonials template'],
    usageCount: 7
  },
  {
    id: 'aitool_008',
    name: 'Milestone Planner',
    description: 'AI-generated roadmap with milestones and dependencies',
    icon: 'Target',
    category: 'strategy',
    inputs: [
      { name: 'goal', type: 'text', label: 'Primary Goal', placeholder: 'e.g., Launch MVP', required: true },
      { name: 'deadline', type: 'text', label: 'Target Date', required: true },
      { name: 'team_size', type: 'number', label: 'Team Size', required: false }
    ],
    outputs: ['Milestone timeline', 'Task breakdown', 'Resource allocation', 'Risk assessment'],
    usageCount: 11
  }
];

export const notifications: AppNotification[] = [
  {
    id: 'notif_001',
    userId: '',
    type: 'message',
    title: 'New message from Sequoia Capital',
    description: 'Thanks for sharing the deck, Alex. We would love to schedule...',
    read: false,
    createdAt: '2024-04-03T18:30:00Z',
    actionUrl: '/messages/conv_001',
    actionLabel: 'View Message'
  },
  {
    id: 'notif_002',
    userId: '',
    type: 'match',
    title: 'New Investor Match!',
    description: 'First Round Capital is looking for startups like NeuroTask AI',
    read: false,
    createdAt: '2024-04-03T12:00:00Z',
    actionUrl: '/network/investors/inv_005',
    actionLabel: 'View Profile'
  },
  {
    id: 'notif_003',
    userId: '',
    type: 'milestone',
    title: 'Milestone approaching',
    description: 'Close Seed Round is due in 30 days',
    read: true,
    createdAt: '2024-04-02T00:00:00Z',
    actionUrl: '/businesses/biz_001/milestones',
    actionLabel: 'View Milestones'
  },
  {
    id: 'notif_004',
    userId: '',
    type: 'ai-complete',
    title: 'Market Research Complete',
    description: 'AI has generated your market research report for NeuroTask AI',
    read: true,
    createdAt: '2024-04-01T15:00:00Z',
    actionUrl: '/businesses/biz_001/ai-tools/market-research',
    actionLabel: 'View Report'
  }
];

export const navSections: NavSection[] = [
  {
    title: 'OVERVIEW',
    items: [
      { label: 'Dashboard', icon: 'LayoutDashboard', view: 'dashboard' },
      { label: 'My Businesses', icon: 'Building2', view: 'businesses' }
    ]
  },
  {
    title: 'BUSINESS TOOLS',
    items: [
      { label: 'AI Assistant', icon: 'Bot', view: 'ai-assistant', badge: 3 },
      { label: 'Pitch Deck', icon: 'Presentation', view: 'pitch-deck' },
      { label: 'Business Plan', icon: 'FileText', view: 'business-plan' },
      { label: 'Branding Kit', icon: 'Palette', view: 'branding-kit' },
      { label: 'Website Builder', icon: 'Globe', view: 'website-builder' },
      { label: 'Milestones', icon: 'Target', view: 'milestones', badge: 2 },
      { label: 'Documents', icon: 'FolderOpen', view: 'documents' },
      { label: 'Team', icon: 'Users', view: 'team' }
    ]
  },
  {
    title: 'NETWORK',
    items: [
      { label: 'Investors', icon: 'Landmark', view: 'investors', badge: 5 },
      { label: 'Co-founders', icon: 'UserPlus', view: 'cofounders', badge: 1 },
      { label: 'Messages', icon: 'MessageSquare', view: 'messages', badge: 2 }
    ]
  },
  {
    title: 'AI TOOLS',
    items: [
      { label: 'Generate Idea', icon: 'Lightbulb', view: 'generate-idea' },
      { label: 'Market Research', icon: 'TrendingUp', view: 'market-research' },
      { label: 'Financial Forecast', icon: 'BarChart3', view: 'financial-forecast' }
    ]
  },
  {
    title: 'ACCOUNT',
    items: [
      { label: 'Profile', icon: 'User', view: 'profile' },
      { label: 'Billing', icon: 'CreditCard', view: 'billing' },
      { label: 'Settings', icon: 'Settings', view: 'settings' }
    ]
  }
];
