// CRM Data - Contacts, Deals, Activities

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  job_title: string;
  contact_type: 'lead' | 'customer' | 'partner' | 'investor';
  source: string;
  notes: string;
  created_at: string;
  last_contact: string;
  avatar?: string;
}

export interface Deal {
  id: string;
  title: string;
  contact_id: string;
  contact_name: string;
  value: number;
  currency: string;
  stage: 'prospecting' | 'qualification' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  probability: number;
  expected_close_date: string;
  created_at: string;
}

export interface Activity {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'note' | 'task';
  contact_id: string;
  contact_name: string;
  description: string;
  created_at: string;
  created_by: string;
}

export interface CrmDashboardStats {
  total_contacts: number;
  total_deals: number;
  total_value: number;
  win_rate: number;
  deals_by_stage: Record<string, number>;
}

export const contactTypes = [
  { value: 'lead', label: 'Lead', color: '#3b82f6' },
  { value: 'customer', label: 'Customer', color: '#22c55e' },
  { value: 'partner', label: 'Partner', color: '#8b5cf6' },
  { value: 'investor', label: 'Investor', color: '#f59e0b' },
] as const;

export const dealStages = [
  { value: 'prospecting', label: 'Prospecting', color: '#6b7280', probability: 10 },
  { value: 'qualification', label: 'Qualification', color: '#3b82f6', probability: 25 },
  { value: 'proposal', label: 'Proposal', color: '#f59e0b', probability: 50 },
  { value: 'negotiation', label: 'Negotiation', color: '#8b5cf6', probability: 75 },
  { value: 'closed_won', label: 'Closed Won', color: '#22c55e', probability: 100 },
  { value: 'closed_lost', label: 'Closed Lost', color: '#ef4444', probability: 0 },
] as const;

export const crmStats: CrmDashboardStats = {
  total_contacts: 48,
  total_deals: 12,
  total_value: 2850000,
  win_rate: 42,
  deals_by_stage: {
    prospecting: 3,
    qualification: 4,
    proposal: 2,
    negotiation: 2,
    closed_won: 1,
    closed_lost: 0,
  },
};

export const contacts: Contact[] = [
  {
    id: 'contact_001',
    name: 'Sarah Chen',
    email: 'sarah.chen@techcorp.com',
    phone: '+1 (555) 123-4567',
    company: 'TechCorp Inc',
    job_title: 'VP of Engineering',
    contact_type: 'lead',
    source: 'LinkedIn',
    notes: 'Interested in AI automation solutions. Follow up next week.',
    created_at: '2024-03-15T10:00:00Z',
    last_contact: '2024-04-02T14:30:00Z',
    avatar: 'https://i.pravatar.cc/150?u=sarah',
  },
  {
    id: 'contact_002',
    name: 'Michael Rodriguez',
    email: 'mrodriguez@startupxyz.io',
    phone: '+1 (555) 987-6543',
    company: 'StartupXYZ',
    job_title: 'CEO',
    contact_type: 'investor',
    source: 'Referral',
    notes: 'Angel investor looking for AI startups. Met at demo day.',
    created_at: '2024-02-20T09:00:00Z',
    last_contact: '2024-04-01T11:00:00Z',
    avatar: 'https://i.pravatar.cc/150?u=michael',
  },
  {
    id: 'contact_003',
    name: 'Emily Watson',
    email: 'emily.w@globaltech.com',
    phone: '+1 (555) 456-7890',
    company: 'GlobalTech Solutions',
    job_title: 'Procurement Manager',
    contact_type: 'customer',
    source: 'Website',
    notes: 'Existing customer. Looking to expand license.',
    created_at: '2024-01-10T08:00:00Z',
    last_contact: '2024-04-03T16:45:00Z',
    avatar: 'https://i.pravatar.cc/150?u=emily',
  },
  {
    id: 'contact_004',
    name: 'David Kim',
    email: 'david.kim@venturecap.com',
    phone: '+1 (555) 234-5678',
    company: 'Venture Capital Partners',
    job_title: 'Partner',
    contact_type: 'investor',
    source: 'Warm Intro',
    notes: 'Series A investor. Interested in follow-on round.',
    created_at: '2024-03-01T14:00:00Z',
    last_contact: '2024-04-02T10:00:00Z',
    avatar: 'https://i.pravatar.cc/150?u=david',
  },
  {
    id: 'contact_005',
    name: 'Lisa Thompson',
    email: 'lisa@innovatetech.co',
    phone: '+1 (555) 876-5432',
    company: 'InnovateTech',
    job_title: 'CTO',
    contact_type: 'partner',
    source: 'Conference',
    notes: 'Potential integration partner. Technical discussion pending.',
    created_at: '2024-03-20T11:30:00Z',
    last_contact: '2024-03-28T09:15:00Z',
    avatar: 'https://i.pravatar.cc/150?u=lisa',
  },
];

export const deals: Deal[] = [
  {
    id: 'deal_001',
    title: 'Enterprise License - TechCorp',
    contact_id: 'contact_001',
    contact_name: 'Sarah Chen',
    value: 150000,
    currency: 'USD',
    stage: 'negotiation',
    probability: 75,
    expected_close_date: '2024-04-15',
    created_at: '2024-03-15T10:00:00Z',
  },
  {
    id: 'deal_002',
    title: 'Seed Investment - Angel Round',
    contact_id: 'contact_002',
    contact_name: 'Michael Rodriguez',
    value: 500000,
    currency: 'USD',
    stage: 'proposal',
    probability: 50,
    expected_close_date: '2024-05-01',
    created_at: '2024-02-20T09:00:00Z',
  },
  {
    id: 'deal_003',
    title: 'License Expansion - GlobalTech',
    contact_id: 'contact_003',
    contact_name: 'Emily Watson',
    value: 75000,
    currency: 'USD',
    stage: 'closed_won',
    probability: 100,
    expected_close_date: '2024-04-01',
    created_at: '2024-01-10T08:00:00Z',
  },
  {
    id: 'deal_004',
    title: 'Series A Investment',
    contact_id: 'contact_004',
    contact_name: 'David Kim',
    value: 2000000,
    currency: 'USD',
    stage: 'qualification',
    probability: 25,
    expected_close_date: '2024-06-15',
    created_at: '2024-03-01T14:00:00Z',
  },
  {
    id: 'deal_005',
    title: 'Partnership Agreement - InnovateTech',
    contact_id: 'contact_005',
    contact_name: 'Lisa Thompson',
    value: 125000,
    currency: 'USD',
    stage: 'prospecting',
    probability: 10,
    expected_close_date: '2024-05-30',
    created_at: '2024-03-20T11:30:00Z',
  },
];

export const activities: Activity[] = [
  {
    id: 'act_001',
    type: 'call',
    contact_id: 'contact_001',
    contact_name: 'Sarah Chen',
    description: 'Discussed enterprise requirements and pricing options.',
    created_at: '2024-04-02T14:30:00Z',
    created_by: 'Alex Chen',
  },
  {
    id: 'act_002',
    type: 'email',
    contact_id: 'contact_002',
    contact_name: 'Michael Rodriguez',
    description: 'Sent pitch deck and financial projections.',
    created_at: '2024-04-01T11:00:00Z',
    created_by: 'Alex Chen',
  },
  {
    id: 'act_003',
    type: 'meeting',
    contact_id: 'contact_003',
    contact_name: 'Emily Watson',
    description: 'Quarterly business review and expansion discussion.',
    created_at: '2024-04-03T16:45:00Z',
    created_by: 'Sarah Kim',
  },
  {
    id: 'act_004',
    type: 'note',
    contact_id: 'contact_004',
    contact_name: 'David Kim',
    description: 'Follow-up required: Send term sheet and cap table.',
    created_at: '2024-04-02T10:00:00Z',
    created_by: 'Alex Chen',
  },
  {
    id: 'act_005',
    type: 'task',
    contact_id: 'contact_005',
    contact_name: 'Lisa Thompson',
    description: 'Schedule technical integration call with engineering team.',
    created_at: '2024-03-28T09:15:00Z',
    created_by: 'Mike Johnson',
  },
];
