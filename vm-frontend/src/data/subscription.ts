// Subscription & Billing Data — aligned with backend (free / pro / pro_plus)

export type PlanType = 'free' | 'pro' | 'pro_plus';

export interface PlanFeature {
  text: string
  included: boolean
}

export interface SubscriptionPlan {
  id: PlanType;
  name: string;
  displayName: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  features: PlanFeature[];
  limits: {
    businesses: number;
    teamMembers: number;
    storageGB: number;
    aiCredits: number;
    websites: number;
  };
  popular?: boolean;
  color: string;
  icon: string;
  sortOrder: number;
}

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'free',
    displayName: 'Free',
    description: 'Get started with the basics for your startup journey',
    priceMonthly: 0,
    priceYearly: 0,
    features: [
      { text: '1 business', included: true },
      { text: '2 team members', included: true },
      { text: 'Basic pitch deck builder', included: true },
      { text: 'AI assistant (50 messages/month)', included: true },
      { text: 'Basic website builder', included: true },
      { text: 'Community support', included: true },
    ],
    limits: { businesses: 1, teamMembers: 2, storageGB: 1, aiCredits: 50, websites: 1 },
    color: '#6b7280',
    icon: 'Zap',
    sortOrder: 0,
  },
  {
    id: 'pro',
    name: 'pro',
    displayName: 'Pro',
    description: 'Perfect for solo founders and small teams ready to grow',
    priceMonthly: 29,
    priceYearly: 290,
    features: [
      { text: '3 businesses', included: true },
      { text: '10 team members', included: true },
      { text: 'Advanced pitch deck & business plan', included: true },
      { text: 'AI assistant (500 messages/month)', included: true },
      { text: 'Pro website builder', included: true },
      { text: 'CRM & basic banking', included: true },
      { text: 'Email support', included: true },
    ],
    limits: { businesses: 3, teamMembers: 10, storageGB: 10, aiCredits: 500, websites: 3 },
    popular: true,
    color: '#10b981',
    icon: 'Rocket',
    sortOrder: 1,
  },
  {
    id: 'pro_plus',
    name: 'pro_plus',
    displayName: 'Pro+',
    description: 'For growing startups that need the full platform',
    priceMonthly: 99,
    priceYearly: 990,
    features: [
      { text: 'Unlimited businesses', included: true },
      { text: 'Unlimited team members', included: true },
      { text: 'Everything in Pro', included: true },
      { text: 'Unlimited AI assistant', included: true },
      { text: 'Advanced CRM & Banking', included: true },
      { text: 'Social media & Marketplace', included: true },
      { text: 'Credit & Health scores', included: true },
      { text: 'Priority support', included: true },
    ],
    limits: { businesses: -1, teamMembers: -1, storageGB: 100, aiCredits: -1, websites: -1 },
    color: '#8b5cf6',
    icon: 'TrendingUp',
    sortOrder: 2,
  },
];

export const featureComparison = [
  {
    category: 'Business Management',
    features: [
      { name: 'Businesses', free: '1', pro: '3', pro_plus: 'Unlimited' },
      { name: 'Team Members', free: '2', pro: '10', pro_plus: 'Unlimited' },
      { name: 'Storage', free: '1 GB', pro: '10 GB', pro_plus: '100 GB' },
    ],
  },
  {
    category: 'AI Features',
    features: [
      { name: 'AI Assistant', free: '50/mo', pro: '500/mo', pro_plus: 'Unlimited' },
      { name: 'Pitch Deck Builder', free: 'Basic', pro: 'Advanced', pro_plus: 'Premium' },
      { name: 'Business Plan Writer', free: false, pro: true, pro_plus: true },
    ],
  },
  {
    category: 'Growth Tools',
    features: [
      { name: 'CRM', free: false, pro: 'Basic', pro_plus: 'Advanced' },
      { name: 'Banking', free: false, pro: 'Basic', pro_plus: 'Full' },
      { name: 'Social Media', free: false, pro: false, pro_plus: true },
      { name: 'Marketplace', free: false, pro: 'Browse', pro_plus: 'Full' },
    ],
  },
  {
    category: 'Insights',
    features: [
      { name: 'Credit Score', free: false, pro: 'Basic', pro_plus: 'Full' },
      { name: 'Health Score', free: false, pro: false, pro_plus: true },
      { name: 'Analytics', free: 'Basic', pro: 'Advanced', pro_plus: 'Full' },
    ],
  },
  {
    category: 'Support',
    features: [
      { name: 'Support', free: 'Community', pro: 'Email', pro_plus: 'Priority' },
      { name: 'Website Builder', free: 'Basic', pro: 'Pro', pro_plus: 'Advanced' },
    ],
  },
];

// Helpers
export const getPlanById = (id: PlanType) => subscriptionPlans.find(p => p.id === id);

export const getUsagePercentage = (used: number, limit: number): number => {
  if (limit === -1) return 0;
  return Math.min(100, (used / limit) * 100);
};

export const formatLimit = (value: number): string => {
  if (value === -1) return 'Unlimited';
  return value.toLocaleString();
};

export const canUpgrade = (from: PlanType, to: PlanType): boolean => {
  const planOrder: PlanType[] = ['free', 'pro', 'pro_plus'];
  return planOrder.indexOf(to) > planOrder.indexOf(from);
};

export const getUpgradePath = (current: PlanType): PlanType[] => {
  const planOrder: PlanType[] = ['free', 'pro', 'pro_plus'];
  const currentIdx = planOrder.indexOf(current);
  return planOrder.slice(currentIdx + 1);
};

// Map backend Plan to static SubscriptionPlan for fallback
import type { Plan } from '../contexts/SubscriptionContext';
export const mapPlanToSubscriptionPlan = (plan: Plan): SubscriptionPlan => {
  const staticFallback = getPlanById(plan.name as PlanType);
  return {
    id: plan.name as PlanType,
    name: plan.name,
    displayName: plan.displayName,
    description: plan.description,
    priceMonthly: plan.priceMonthly,
    priceYearly: plan.priceYearly,
    features: plan.features,
    limits: staticFallback?.limits ?? { businesses: 1, teamMembers: 2, storageGB: 1, aiCredits: 50, websites: 1 },
    color: staticFallback?.color ?? '#6b7280',
    icon: staticFallback?.icon ?? 'Zap',
    sortOrder: plan.sortOrder,
  };
};
