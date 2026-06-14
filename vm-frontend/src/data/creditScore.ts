// Credit Score Data - Score, History, Financing Offers

export interface CreditScore {
  id: string;
  score: number;
  max_score: number;
  grade: string;
  risk_level: 'low' | 'moderate' | 'high' | 'very_high';
  calculated_at: string;
  expires_at: string;
  factors: {
    positive: string[];
    negative: string[];
  };
  components: {
    payment_history: number;
    credit_utilization: number;
    business_age: number;
    revenue_stability: number;
    debt_ratio: number;
  };
}

export interface CreditScoreHistory {
  id: string;
  score: number;
  calculated_at: string;
}

export interface FinancingOffer {
  id: string;
  lender_name: string;
  lender_logo?: string;
  product_type: 'loan' | 'line_of_credit' | 'equipment_financing' | 'invoice_factoring';
  min_amount: number;
  max_amount: number;
  currency: string;
  min_rate: number;
  max_rate: number;
  term_months: number;
  requirements: string[];
  pre_qualified: boolean;
  expires_at: string;
}

export interface FinancingApplication {
  id: string;
  offer_id: string;
  lender_name: string;
  product_type: string;
  amount_requested: number;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected';
  submitted_at?: string;
  decision_at?: string;
}

export const creditScore: CreditScore = {
  id: 'credit_001',
  score: 785,
  max_score: 850,
  grade: 'A',
  risk_level: 'low',
  calculated_at: '2024-04-01T00:00:00Z',
  expires_at: '2024-07-01T00:00:00Z',
  factors: {
    positive: [
      'Consistent revenue growth over 12 months',
      'Low debt-to-income ratio',
      'Strong payment history with vendors',
      'Established business credit profile',
    ],
    negative: [
      'Limited credit history length',
      'Recent inquiry activity',
    ],
  },
  components: {
    payment_history: 95,
    credit_utilization: 88,
    business_age: 75,
    revenue_stability: 92,
    debt_ratio: 85,
  },
};

export const creditHistory: CreditScoreHistory[] = [
  { id: 'hist_001', score: 785, calculated_at: '2024-04-01T00:00:00Z' },
  { id: 'hist_002', score: 772, calculated_at: '2024-03-01T00:00:00Z' },
  { id: 'hist_003', score: 768, calculated_at: '2024-02-01T00:00:00Z' },
  { id: 'hist_004', score: 755, calculated_at: '2024-01-01T00:00:00Z' },
  { id: 'hist_005', score: 740, calculated_at: '2023-12-01T00:00:00Z' },
  { id: 'hist_006', score: 725, calculated_at: '2023-11-01T00:00:00Z' },
];

export const financingOffers: FinancingOffer[] = [
  {
    id: 'offer_001',
    lender_name: 'Mercury Capital',
    lender_logo: 'https://placeholder.com/mercury.png',
    product_type: 'line_of_credit',
    min_amount: 50000,
    max_amount: 500000,
    currency: 'USD',
    min_rate: 8.5,
    max_rate: 12.5,
    term_months: 12,
    requirements: ['Min 12 months in business', '$100K+ annual revenue', 'Business checking account'],
    pre_qualified: true,
    expires_at: '2024-05-01T00:00:00Z',
  },
  {
    id: 'offer_002',
    lender_name: 'Brex Financing',
    lender_logo: 'https://placeholder.com/brex.png',
    product_type: 'loan',
    min_amount: 100000,
    max_amount: 1000000,
    currency: 'USD',
    min_rate: 10.0,
    max_rate: 15.0,
    term_months: 24,
    requirements: ['Min 6 months in business', 'YC alumni preferred', 'Tech startups only'],
    pre_qualified: true,
    expires_at: '2024-05-15T00:00:00Z',
  },
  {
    id: 'offer_003',
    lender_name: 'Stripe Capital',
    lender_logo: 'https://placeholder.com/stripe.png',
    product_type: 'loan',
    min_amount: 25000,
    max_amount: 250000,
    currency: 'USD',
    min_rate: 9.0,
    max_rate: 14.0,
    term_months: 18,
    requirements: ['Stripe processing history', 'Min $50K processed annually'],
    pre_qualified: false,
    expires_at: '2024-04-30T00:00:00Z',
  },
  {
    id: 'offer_004',
    lender_name: 'Fundbox',
    lender_logo: 'https://placeholder.com/fundbox.png',
    product_type: 'invoice_factoring',
    min_amount: 10000,
    max_amount: 150000,
    currency: 'USD',
    min_rate: 4.5,
    max_rate: 8.0,
    term_months: 3,
    requirements: ['Outstanding invoices', 'B2B customers', 'Min 3 months history'],
    pre_qualified: true,
    expires_at: '2024-05-10T00:00:00Z',
  },
];

export const financingApplications: FinancingApplication[] = [
  {
    id: 'app_001',
    offer_id: 'offer_001',
    lender_name: 'Mercury Capital',
    product_type: 'line_of_credit',
    amount_requested: 200000,
    status: 'approved',
    submitted_at: '2024-03-15T10:00:00Z',
    decision_at: '2024-03-18T14:30:00Z',
  },
  {
    id: 'app_002',
    offer_id: 'offer_002',
    lender_name: 'Brex Financing',
    product_type: 'loan',
    amount_requested: 500000,
    status: 'under_review',
    submitted_at: '2024-04-02T09:00:00Z',
  },
];

export const getScoreColor = (score: number): string => {
  if (score >= 750) return '#22c55e';
  if (score >= 650) return '#f59e0b';
  if (score >= 500) return '#3b82f6';
  return '#ef4444';
};

export const getScoreGrade = (score: number): string => {
  if (score >= 800) return 'A';
  if (score >= 700) return 'B';
  if (score >= 600) return 'C';
  if (score >= 500) return 'D';
  return 'F';
};

export const getRiskLabel = (risk: string): { label: string; color: string } => {
  switch (risk) {
    case 'low': return { label: 'Low Risk', color: '#22c55e' };
    case 'moderate': return { label: 'Moderate Risk', color: '#f59e0b' };
    case 'high': return { label: 'High Risk', color: '#ef4444' };
    default: return { label: 'Very High Risk', color: '#dc2626' };
  }
};
