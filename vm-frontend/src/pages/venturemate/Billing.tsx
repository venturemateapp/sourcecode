import { useState, useMemo } from 'react';
import { Box, Typography, Card, Tabs, Tab, Chip, useTheme, useMediaQuery } from '@mui/material';
import {
  CreditCard,
  TrendingUp,
  CheckCircle,
  Calendar,
  Shield,
  Zap,
  Rocket,
  Sparkles,
} from 'lucide-react';
import type { Plan } from '../../contexts/SubscriptionContext';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { GradientButton } from '../../components/shared/buttons';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/shared/toast';

const planColors: Record<string, string> = { free: '#6b7280', starter: '#10b981', growth: '#3b82f6', scale: '#8b5cf6' };

interface SubscriptionPlan {
  id: string;
  displayName: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  features: { text: string; included: boolean }[];
  popular?: boolean;
  color: string;
  sortOrder: number;
}

function mapPlanToSubscriptionPlan(plan: Plan): SubscriptionPlan {
  const popular: Record<string, boolean> = { free: false, starter: false, growth: true, scale: false };
  return {
    id: plan.name,
    displayName: plan.displayName,
    description: plan.description,
    priceMonthly: plan.priceMonthly,
    priceYearly: plan.priceYearly,
    features: plan.features,
    color: planColors[plan.name] || '#6b7280',
    popular: popular[plan.name] || false,
    sortOrder: plan.sortOrder,
  };
}

const featureComparison = [
  {
    category: 'Business Management',
    features: [
      { name: 'Businesses', free: '1', starter: '3', growth: '10', scale: 'Unlimited' },
      { name: 'Team Members', free: '1', starter: '3', growth: '10', scale: 'Unlimited' },
      { name: 'Storage', free: '1 GB', starter: '10 GB', growth: '100 GB', scale: '1 TB' },
    ],
  },
  {
    category: 'AI Features',
    features: [
      { name: 'AI Assistant', free: '200K tokens/mo', starter: '2M tokens/mo', growth: '10M tokens/mo', scale: '50M tokens/mo' },
      { name: 'AI Outputs', free: 'Basic', starter: 'Basic', growth: 'Advanced', scale: 'Advanced' },
      { name: 'Pitch Decks', free: '1 basic', starter: '5 basic', growth: 'Unlimited advanced', scale: 'Unlimited advanced' },
      { name: 'Business Plans', free: '1 basic', starter: '5 basic', growth: 'Unlimited advanced', scale: 'Unlimited advanced' },
    ],
  },
  {
    category: 'Growth Tools',
    features: [
      { name: 'CRM', free: false, starter: true, growth: true, scale: true },
      { name: 'Invoicing', free: false, starter: true, growth: true, scale: true },
      { name: 'Banking Integrations', free: false, starter: true, growth: true, scale: true },
      { name: 'Website Creator', free: false, starter: true, growth: true, scale: true },
      { name: 'Document Vault', free: false, starter: true, growth: true, scale: true },
      { name: 'Social Media Scheduler', free: false, starter: true, growth: true, scale: true },
      { name: 'Marketplace Access', free: false, starter: true, growth: true, scale: true },
      { name: 'Workflow Automation', free: false, starter: false, growth: true, scale: true },
    ],
  },
  {
    category: 'Insights & Management',
    features: [
      { name: 'Credit Score', free: 'Overview', starter: 'Full', growth: 'Full', scale: 'Full' },
      { name: 'Health Score', free: true, starter: true, growth: true, scale: true },
      { name: 'Investor Matching', free: false, starter: false, growth: true, scale: true },
      { name: 'Advanced Branding', free: false, starter: false, growth: true, scale: true },
      { name: 'Dedicated Account Manager', free: false, starter: false, growth: false, scale: true },
      { name: 'API Access', free: false, starter: false, growth: false, scale: true },
    ],
  },
  {
    category: 'Support',
    features: [
      { name: 'Support Level', free: 'Community', starter: 'Email', growth: 'Priority Email', scale: 'Dedicated Priority' },
      { name: 'White-Glove Onboarding', free: false, starter: false, growth: false, scale: true },
    ],
  },
];

const fallbackPlanIcons: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  free: Shield,
  starter: Zap,
  growth: Rocket,
  scale: Sparkles,
};

export function BillingPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuth();
  const { subscription, plans, planName } = useSubscription();
  const { format: fmtCurrency } = useCurrency();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState(0);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  const displayPlans: SubscriptionPlan[] = useMemo(
    () => plans.length > 0 ? plans.map(mapPlanToSubscriptionPlan) : [],
    [plans]
  );

  const currentPlanData = useMemo(
    () => displayPlans.find(p => p.id === planName),
    [displayPlans, planName]
  );

  const currentPlanId = planName;
  const nextPlans = useMemo(
    () => displayPlans.filter(p => {
      const order: Record<string, number> = { free: 0, starter: 1, growth: 2, scale: 3 };
      return (order[p.id] || 0) > (order[currentPlanId] || 0);
    }),
    [displayPlans, currentPlanId]
  );

  const getSavings = (plan: SubscriptionPlan) => {
    if (plan.priceYearly === 0) return 0;
    const monthlyCost = plan.priceMonthly * 12;
    const savings = monthlyCost - plan.priceYearly;
    return Math.round((savings / monthlyCost) * 100);
  };

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, maxWidth: '100%' }}>
      {/* Header */}
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'flex-start', sm: 'center' },
        justifyContent: 'space-between',
        gap: { xs: 2, sm: 0 },
        mb: { xs: 3, sm: 4 },
      }}>
        <Box>
          <Typography sx={{ fontSize: { xs: 24, sm: 28 }, fontWeight: 700, color: 'var(--vm-text-primary)', mb: 1 }}>
            Billing & Subscription
          </Typography>
          <Typography sx={{ fontSize: { xs: 14, sm: 15 }, color: 'var(--vm-text-muted)' }}>
            Manage your subscription, payment methods, and billing history
          </Typography>
        </Box>
        {nextPlans.length > 0 && (
          <GradientButton variant="outline" size="md" disabled sx={{ opacity: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrendingUp size={18} />
              Upgrade Plan
            </Box>
          </GradientButton>
        )}
      </Box>

      {/* Current Plan Card */}
      <Card
        sx={{
          bgcolor: 'var(--vm-bg-secondary)',
          border: '1px solid var(--vm-border-subtle)',
          borderRadius: 3,
          p: { xs: 2.5, sm: 3, md: 4 },
          mb: { xs: 3, sm: 4 },
          background: `linear-gradient(135deg, ${currentPlanData?.color || '#6b7280'}20 0%, var(--vm-bg-tertiary) 100%)`,
          borderColor: currentPlanData?.color,
        }}
      >
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: { xs: 3, md: 4, lg: 6 },
        }}>
          {/* Plan Info */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box
                sx={{
                  width: { xs: 48, sm: 56 },
                  height: { xs: 48, sm: 56 },
                  borderRadius: 2,
                  bgcolor: `${currentPlanData?.color || '#6b7280'}30`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {currentPlanData && (() => {
                  const Icon = fallbackPlanIcons[currentPlanData.id] || Zap;
                  return <Icon size={isMobile ? 24 : 28} color={currentPlanData.color} />;
                })()}
              </Box>
              <Box>
                <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)' }}>
                  Current Plan
                </Typography>
                <Typography sx={{ fontSize: { xs: 20, sm: 24 }, fontWeight: 700, color: currentPlanData?.color || 'var(--vm-text-primary)', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                  {currentPlanData?.displayName || 'Free'}
                </Typography>
              </Box>
            </Box>
            <Typography sx={{ fontSize: { xs: 28, sm: 32 }, fontWeight: 700, color: 'var(--vm-text-primary)', mb: 0.5 }}>
                {fmtCurrency(currentPlanData?.priceMonthly || 0)}
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)' }}>
              per month
            </Typography>
          </Box>

          {/* Billing Info */}
          <Box>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 2 }}>
              Subscription Details
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <CreditCard size={16} color="var(--vm-text-muted)" />
                <Typography sx={{ fontSize: 13, color: 'var(--vm-text-secondary)', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                  {subscription?.plan.displayName || currentPlanData?.displayName || 'Free'} Plan
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Calendar size={16} color="var(--vm-text-muted)" />
                <Typography sx={{ fontSize: 13, color: 'var(--vm-text-secondary)' }}>
                  {subscription?.currentPeriodEnd
                    ? `Renews ${new Date(subscription.currentPeriodEnd).toLocaleDateString('en-GB')}`
                    : 'No active billing period'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Shield size={16} color="var(--vm-text-muted)" />
                <Typography sx={{ fontSize: 13, color: 'var(--vm-text-secondary)' }}>
                  {subscription?.status === 'active' ? 'Active' : subscription?.status || 'Active'}
                  {subscription?.cancelAtPeriodEnd ? ' (canceled)' : ''}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Card>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{
          mb: { xs: 2, sm: 3 },
          '& .MuiTabs-indicator': { bgcolor: 'var(--vm-primary-500)' },
          '& .MuiTab-root': {
            color: 'var(--vm-text-muted)',
            textTransform: 'none',
            fontSize: { xs: 13, sm: 14 },
            minWidth: { xs: 'auto', sm: 120 },
            px: { xs: 1.5, sm: 2 },
            '&.Mui-selected': { color: 'var(--vm-primary-400)' },
          },
        }}
        variant={isMobile ? 'scrollable' : 'standard'}
        scrollButtons={isMobile ? 'auto' : false}
      >
        <Tab label="Plans" />
        <Tab label="Features" />
      </Tabs>

      {/* Plans Tab */}
      {activeTab === 0 && (
        <>
          {/* Billing Toggle */}
          {displayPlans.some(p => p.priceYearly > 0) && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: { xs: 3, sm: 4 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1, bgcolor: 'var(--vm-bg-secondary)', borderRadius: 2 }}>
                <GradientButton variant={billingPeriod === 'monthly' ? 'primary' : 'outline'} size="sm" onClick={() => setBillingPeriod('monthly')}>
                  Monthly
                </GradientButton>
                <GradientButton variant={billingPeriod === 'yearly' ? 'primary' : 'outline'} size="sm" onClick={() => setBillingPeriod('yearly')}>
                  Yearly
                  <Chip size="small" label="Save 15%" sx={{
                    ml: 1,
                    bgcolor: billingPeriod === 'yearly' ? 'var(--vm-primary-200)' : 'var(--vm-primary-900)',
                    color: billingPeriod === 'yearly' ? 'var(--vm-primary-950)' : 'var(--vm-primary-300)',
                    fontSize: 10, fontWeight: 700, height: 20,
                  }} />
                </GradientButton>
              </Box>
            </Box>
          )}

          {/* Plans Grid */}
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' },
            gap: { xs: 2.5, sm: 3 },
          }}>
            {displayPlans.map((plan) => (
              <Card
                key={plan.id}
                sx={{
                  bgcolor: 'var(--vm-bg-secondary)',
                  border: plan.id === currentPlanId
                    ? `2px solid ${plan.color}`
                    : plan.popular
                      ? `2px solid var(--vm-primary-600)`
                      : '1px solid var(--vm-border-subtle)',
                  borderRadius: 3,
                  p: { xs: 2.5, sm: 3 },
                  position: 'relative',
                  opacity: plan.id === currentPlanId ? 1 : 0.95,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: plan.id !== currentPlanId ? 'translateY(-4px)' : 'none',
                    boxShadow: plan.id !== currentPlanId ? '0 12px 24px rgba(0,0,0,0.2)' : 'none',
                  },
                }}
              >
                {/* Badges */}
                {plan.popular && plan.id !== currentPlanId && (
                  <Chip size="small" label="Most Popular" sx={{
                    position: 'absolute', top: 12, right: 12,
                    bgcolor: 'var(--vm-primary-600)', color: '#ffffff !important', fontSize: 10, fontWeight: 700, height: 22, zIndex: 2,
                    '& .MuiChip-label': { color: '#ffffff !important', px: 1 },
                  }} />
                )}

                {/* Plan Header */}
                <Box sx={{ textAlign: 'center', mb: { xs: 2.5, sm: 3 } }}>
                  <Box sx={{
                    width: 48, height: 48, borderRadius: 2, bgcolor: `${plan.color}20`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2,
                  }}>
                    {(() => {
                      const Icon = fallbackPlanIcons[plan.id] || Zap;
                      return <Icon size={24} color={plan.color} />;
                    })()}
                  </Box>
                  <Typography sx={{ fontSize: { xs: 17, sm: 18 }, fontWeight: 700, color: 'var(--vm-text-primary)', mb: 0.5, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                    {plan.displayName}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)', px: 1, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                    {plan.description}
                  </Typography>
                </Box>

                {/* Price */}
                <Box sx={{ textAlign: 'center', mb: { xs: 2.5, sm: 3 } }}>
                  <Typography sx={{ fontSize: { xs: 28, sm: 32 }, fontWeight: 700, color: 'var(--vm-text-primary)' }}>
                    {fmtCurrency(billingPeriod === 'monthly' ? plan.priceMonthly : Math.round(plan.priceYearly / 12))}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>per month</Typography>
                  {billingPeriod === 'yearly' && plan.priceYearly > 0 && (
                    <Typography sx={{ fontSize: 11, color: '#22c55e', mt: 0.5, fontWeight: 500 }}>
                      Save {getSavings(plan)}%
                    </Typography>
                  )}
                </Box>

                {/* Features */}
                <Box sx={{ mb: { xs: 2.5, sm: 3 }, maxHeight: { xs: 200, sm: 260 }, overflowY: 'auto' }}>
                  {plan.features.map((feature, idx) => (
                    <Box key={idx} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25, mb: 1.25 }}>
                      <CheckCircle size={14} color={feature.included ? plan.color : 'var(--vm-text-muted)'} style={{ marginTop: 2, flexShrink: 0 }} />
                      <Typography sx={{ fontSize: { xs: 12, sm: 13 }, color: feature.included ? 'var(--vm-text-secondary)' : 'var(--vm-text-muted)', lineHeight: 1.4, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                        {feature.text}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                {/* CTA */}
                <GradientButton
                  fullWidth
                  variant={plan.id === currentPlanId ? 'outline' : 'outline'}
                  size="md"
                  disabled
                  sx={{
                    color: '#fff !important',
                    '&.Mui-disabled': { color: 'rgba(255,255,255,.3) !important' },
                  }}
                >
                  {plan.id === currentPlanId ? 'Current Plan' : 'Coming Soon'}
                </GradientButton>
              </Card>
            ))}
          </Box>

          {/* Refer & Earn */}
          <Card sx={{ mt: 3, bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, p: { xs: 2.5, sm: 3 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'rgba(16,185,129,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp size={20} color="#10b981" />
              </Box>
              <Box>
                <Typography sx={{ fontSize: 16, fontWeight: 700, color: 'var(--vm-text-primary)' }}>
                  Refer & Earn
                </Typography>
                <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>
                  Share VentureMate and earn free AI tokens or subscription credits
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 200, bgcolor: 'var(--vm-bg-tertiary)', borderRadius: 2, p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)', mb: 0.5 }}>Your referral link</Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'var(--vm-primary-400)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.id ? `https://venturemate.net/signup?ref=${user.id.slice(0, 8)}` : 'Sign in to get your link'}
                  </Typography>
                </Box>
                <GradientButton variant="outline" size="sm" onClick={() => {
                  if (user?.id) {
                    navigator.clipboard.writeText(`https://venturemate.net/signup?ref=${user.id.slice(0, 8)}`);
                    toast.warning('Link copied!', { description: 'Share it with your network to earn rewards.', duration: 3000 });
                  }
                }} sx={{ flexShrink: 0 }}>
                  Copy Link
                </GradientButton>
              </Box>
              <Box sx={{ display: 'flex', gap: { xs: 1.5, sm: 3 }, flexWrap: 'wrap' }}>
                {[
                  { label: 'Per referral', value: '5M AI tokens' },
                  { label: 'Paid referral', value: fmtCurrency(10) + ' credit' },
                  { label: 'Your earnings', value: fmtCurrency(0) },
                ].map(s => (
                  <Box key={s.label} sx={{ textAlign: 'center', px: { xs: 1, sm: 2 } }}>
                    <Typography sx={{ fontSize: 16, fontWeight: 700, color: 'var(--vm-primary-400)' }}>{s.value}</Typography>
                    <Typography sx={{ fontSize: 10, color: 'var(--vm-text-muted)' }}>{s.label}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Card>
        </>
      )}

      {/* Features Tab */}
      {activeTab === 1 && (
        <Box sx={{ overflowX: 'auto' }}>
          <Card sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, overflow: 'hidden' }}>
            {/* Column headers */}
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1.5fr 1fr 1fr 1fr', sm: '2fr 1fr 1fr 1fr' },
              gap: { xs: 1, sm: 2 },
              p: { xs: 1.5, sm: 2 },
              borderBottom: '1px solid var(--vm-border-subtle)',
              bgcolor: 'var(--vm-bg-tertiary)',
              alignItems: 'center',
              position: 'sticky', top: 0, zIndex: 1,
            }}>
              <Typography sx={{ fontSize: { xs: 11, sm: 12 }, fontWeight: 700, color: 'var(--vm-text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
                Feature
              </Typography>
              {displayPlans.map(plan => (
                <Box key={plan.id} sx={{ textAlign: 'center' }}>
                  <Typography sx={{
                    fontSize: { xs: 11, sm: 12 }, fontWeight: 700,
                    color: plan.id === currentPlanId ? 'var(--vm-primary-400)' : 'var(--vm-text-secondary)',
                  }}>
                    {plan.displayName}
                  </Typography>
                  <Typography sx={{ fontSize: 9, color: 'var(--vm-text-muted)', mt: 0.25 }}>
                    {fmtCurrency(plan.priceMonthly)}/mo
                  </Typography>
                </Box>
              ))}
            </Box>
            {featureComparison.map((category) => (
              <Box key={category.category}>
                <Box sx={{ bgcolor: 'var(--vm-bg-tertiary)', p: { xs: 1.5, sm: 2 }, borderBottom: '1px solid var(--vm-border-subtle)' }}>
                  <Typography sx={{ fontSize: { xs: 13, sm: 14 }, fontWeight: 600, color: 'var(--vm-text-primary)' }}>
                    {category.category}
                  </Typography>
                </Box>
                {category.features.map((feature: Record<string, string | boolean>) => (
                  <Box key={feature.name as string} sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1.5fr 1fr 1fr 1fr', sm: '2fr 1fr 1fr 1fr' },
                    gap: { xs: 1, sm: 2 },
                    p: { xs: 1.5, sm: 2 },
                    borderBottom: '1px solid var(--vm-border-subtle)',
                    alignItems: 'center',
                  }}>
                    <Typography sx={{ fontSize: { xs: 12, sm: 13 }, color: 'var(--vm-text-secondary)' }}>
                      {feature.name as string}
                    </Typography>
                    {displayPlans.map((plan) => (
                      <Box key={plan.id} sx={{ textAlign: 'center' }}>
                        {typeof feature[plan.id] === 'boolean' ? (
                          feature[plan.id] ? (
                            <CheckCircle size={16} color="#22c55e" style={{ margin: '0 auto' }} />
                          ) : (
                            <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>—</Typography>
                          )
                        ) : (
                          <Typography sx={{
                            fontSize: { xs: 11, sm: 12 },
                            color: plan.id === currentPlanId ? 'var(--vm-primary-400)' : 'var(--vm-text-secondary)',
                            fontWeight: plan.id === currentPlanId ? 600 : 400,
                          }}>
                            {feature[plan.id] as string}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Box>
                ))}
              </Box>
            ))}
          </Card>
        </Box>
      )}
    </Box>
  );
}
