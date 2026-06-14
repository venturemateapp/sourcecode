// Health Score Data - Startup Health Assessment

export interface StartupHealthScore {
  id: string;
  business_id: string;
  overall_score: number;
  calculated_at: string;
  components: {
    compliance: { score: number; weight: number };
    revenue_viability: { score: number; weight: number };
    market_fit: { score: number; weight: number };
    team_structure: { score: number; weight: number };
    financial_sustainability: { score: number; weight: number };
    digital_presence: { score: number; weight: number };
  };
  recommendations: HealthRecommendation[];
  priority_actions: PriorityAction[];
}

export interface HealthRecommendation {
  id: string;
  component: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
}

export interface PriorityAction {
  id: string;
  title: string;
  description: string;
  component: string;
  deadline: string;
  completed: boolean;
}

export const healthScore: StartupHealthScore = {
  id: 'health_001',
  business_id: 'biz_001',
  overall_score: 78,
  calculated_at: '2024-04-04T00:00:00Z',
  components: {
    compliance: { score: 85, weight: 15 },
    revenue_viability: { score: 72, weight: 25 },
    market_fit: { score: 80, weight: 20 },
    team_structure: { score: 75, weight: 15 },
    financial_sustainability: { score: 82, weight: 15 },
    digital_presence: { score: 88, weight: 10 },
  },
  recommendations: [
    {
      id: 'rec_001',
      component: 'revenue_viability',
      title: 'Diversify Revenue Streams',
      description: 'Current revenue is concentrated in one product line. Consider expanding to enterprise tiers or add-on services.',
      impact: 'high',
      effort: 'medium',
    },
    {
      id: 'rec_002',
      component: 'team_structure',
      title: 'Hire Head of Sales',
      description: 'Sales function is currently handled by founders. Dedicated sales leadership will accelerate growth.',
      impact: 'high',
      effort: 'medium',
    },
    {
      id: 'rec_003',
      component: 'market_fit',
      title: 'Conduct Customer Discovery',
      description: 'Schedule 20 customer interviews to validate new feature roadmap and pricing strategy.',
      impact: 'medium',
      effort: 'low',
    },
    {
      id: 'rec_004',
      component: 'compliance',
      title: 'Complete SOC 2 Type II',
      description: 'Enterprise customers require SOC 2. Start audit process within next quarter.',
      impact: 'medium',
      effort: 'high',
    },
    {
      id: 'rec_005',
      component: 'financial_sustainability',
      title: 'Extend Runway',
      description: 'Current runway is 14 months. Consider cost optimization or additional funding to reach 24 months.',
      impact: 'high',
      effort: 'medium',
    },
  ],
  priority_actions: [
    {
      id: 'action_001',
      title: 'Close Seed Round',
      description: 'Secure $2M seed funding to extend runway and scale team',
      component: 'financial_sustainability',
      deadline: '2024-05-30',
      completed: false,
    },
    {
      id: 'action_002',
      title: 'Launch Public Beta',
      description: 'Release product to public with freemium model',
      component: 'market_fit',
      deadline: '2024-04-15',
      completed: false,
    },
    {
      id: 'action_003',
      title: 'Hire Head of Sales',
      description: 'Recruit experienced SaaS sales leader',
      component: 'team_structure',
      deadline: '2024-05-01',
      completed: false,
    },
    {
      id: 'action_004',
      title: 'File Annual Report',
      description: 'Submit Delaware annual franchise tax report',
      component: 'compliance',
      deadline: '2024-03-01',
      completed: true,
    },
  ],
};

export const componentLabels: Record<string, string> = {
  compliance: 'Compliance',
  revenue_viability: 'Revenue Viability',
  market_fit: 'Market Fit',
  team_structure: 'Team Structure',
  financial_sustainability: 'Financial Sustainability',
  digital_presence: 'Digital Presence',
};

export const componentIcons: Record<string, string> = {
  compliance: 'Shield',
  revenue_viability: 'TrendingUp',
  market_fit: 'Target',
  team_structure: 'Users',
  financial_sustainability: 'DollarSign',
  digital_presence: 'Globe',
};

export const getScoreColor = (score: number): string => {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#f59e0b';
  return '#ef4444';
};

export const getScoreStatus = (score: number): { label: string; color: string } => {
  if (score >= 80) return { label: 'Excellent', color: '#22c55e' };
  if (score >= 60) return { label: 'Good', color: '#f59e0b' };
  return { label: 'Needs Attention', color: '#ef4444' };
};

export const getImpactColor = (impact: string): string => {
  switch (impact) {
    case 'high': return '#ef4444';
    case 'medium': return '#f59e0b';
    case 'low': return '#3b82f6';
    default: return '#6b7280';
  }
};

export const getEffortColor = (effort: string): string => {
  switch (effort) {
    case 'high': return '#f59e0b';
    case 'medium': return '#3b82f6';
    case 'low': return '#22c55e';
    default: return '#6b7280';
  }
};
