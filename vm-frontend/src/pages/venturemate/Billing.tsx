import { useState, useMemo } from 'react';
import { Box, Typography, Card, Tabs, Tab, Chip, LinearProgress, Dialog, useTheme, useMediaQuery } from '@mui/material';
import {
  CreditCard,
  Receipt,
  TrendingUp,
  CheckCircle,
  Calendar,
  Shield,
  Zap,
  Rocket,
} from 'lucide-react';
import type { Plan } from '../../contexts/SubscriptionContext';
import { useSubscription } from '../../contexts/SubscriptionContext';
import type { ViewType } from '../../types/venturemate';
import { GradientButton } from '../../components/shared/buttons';
import { useAuth } from '../../contexts/AuthContext';

type PlanType = 'free' | 'pro' | 'pro_plus';

interface SubscriptionPlan {
  id: PlanType;
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
  const planColors: Record<string, string> = { free: '#6b7280', pro: '#10b981', pro_plus: '#8b5cf6' };
  const popular: Record<string, boolean> = { free: false, pro: true, pro_plus: false };
  return {
    id: plan.name as PlanType,
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

const fallbackPlanIcons: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  free: Zap,
  pro: Rocket,
  pro_plus: TrendingUp,
};

interface BillingProps {
  onViewChange?: (_view: ViewType) => void;
}

export function BillingPage(_props: BillingProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuth();
  const { subscription, plans, changePlan, planName } = useSubscription();

  const [activeTab, setActiveTab] = useState(0);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [selectedUpgradePlan, setSelectedUpgradePlan] = useState<string | null>(null);
  const [upgrading, setUpgrading] = useState(false);

  const displayPlans: SubscriptionPlan[] = useMemo(
    () => plans.length > 0 ? plans.map(mapPlanToSubscriptionPlan) : [],
    [plans]
  );

  const currentPlanData = useMemo(
    () => displayPlans.find(p => p.id === (planName as PlanType)),
    [displayPlans, planName]
  );

  const currentPlanId = planName as PlanType;
  const nextPlans = useMemo(
    () => displayPlans.filter(p => {
      const order: Record<string, number> = { free: 0, pro: 1, pro_plus: 2 };
      return (order[p.id] || 0) > (order[currentPlanId] || 0);
    }),
    [displayPlans, currentPlanId]
  );

  const handleUpgrade = (planId: string) => {
    setSelectedUpgradePlan(planId);
    setShowUpgradeDialog(true);
  };

  const handleConfirmUpgrade = async () => {
    if (!selectedUpgradePlan || !user?.id) return;
    setUpgrading(true);
    const ok = await changePlan(user.id, selectedUpgradePlan);
    setUpgrading(false);
    if (ok) setShowUpgradeDialog(false);
  };

  const getSavings = (plan: SubscriptionPlan) => {
    if (plan.priceYearly === 0) return 0;
    const monthlyCost = plan.priceMonthly * 12;
    const savings = monthlyCost - plan.priceYearly;
    return Math.round((savings / monthlyCost) * 100);
  };

  const usage = subscription ? (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>Businesses</Typography>
          <Typography sx={{ fontSize: 12, color: 'var(--vm-text-primary)' }}>N/A</Typography>
        </Box>
        <LinearProgress variant="determinate" value={0} sx={{ height: 6, borderRadius: 3, bgcolor: 'var(--vm-bg-hover)', '& .MuiLinearProgress-bar': { bgcolor: currentPlanData?.color, borderRadius: 3 } }} />
      </Box>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>Team Members</Typography>
          <Typography sx={{ fontSize: 12, color: 'var(--vm-text-primary)' }}>N/A</Typography>
        </Box>
        <LinearProgress variant="determinate" value={0} sx={{ height: 6, borderRadius: 3, bgcolor: 'var(--vm-bg-hover)', '& .MuiLinearProgress-bar': { bgcolor: currentPlanData?.color, borderRadius: 3 } }} />
      </Box>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>Storage</Typography>
          <Typography sx={{ fontSize: 12, color: 'var(--vm-text-primary)' }}>N/A</Typography>
        </Box>
        <LinearProgress variant="determinate" value={0} sx={{ height: 6, borderRadius: 3, bgcolor: 'var(--vm-bg-hover)', '& .MuiLinearProgress-bar': { bgcolor: currentPlanData?.color, borderRadius: 3 } }} />
      </Box>
    </Box>
  ) : null;

  const selectedPlanName = selectedUpgradePlan ? displayPlans.find(p => p.id === selectedUpgradePlan)?.displayName : '';

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
          <GradientButton variant="primary" size="md" onClick={() => {
            setSelectedUpgradePlan(nextPlans[0].id);
            setShowUpgradeDialog(true);
          }}>
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
                <Typography sx={{ fontSize: { xs: 20, sm: 24 }, fontWeight: 700, color: currentPlanData?.color || 'var(--vm-text-primary)' }}>
                  {currentPlanData?.displayName || 'Free'}
                </Typography>
              </Box>
            </Box>
            <Typography sx={{ fontSize: { xs: 28, sm: 32 }, fontWeight: 700, color: 'var(--vm-text-primary)', mb: 0.5 }}>
              ${currentPlanData?.priceMonthly || 0}
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)' }}>
              per month
            </Typography>
          </Box>

          {/* Usage */}
          <Box>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 2 }}>
              Usage This Month
            </Typography>
            {usage}
          </Box>

          {/* Billing Info */}
          <Box>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 2 }}>
              Subscription Details
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <CreditCard size={16} color="var(--vm-text-muted)" />
                <Typography sx={{ fontSize: 13, color: 'var(--vm-text-secondary)' }}>
                  {subscription?.plan.displayName || currentPlanData?.displayName || 'Free'} Plan
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Calendar size={16} color="var(--vm-text-muted)" />
                <Typography sx={{ fontSize: 13, color: 'var(--vm-text-secondary)' }}>
                  {subscription?.currentPeriodEnd
                    ? `Renews ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
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
        <Tab label="Invoices" />
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
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
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
                    position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
                    bgcolor: 'var(--vm-primary-600)', color: '#ffffff !important', fontSize: 11, fontWeight: 700, height: 24,
                    '& .MuiChip-label': { color: '#ffffff !important', px: 1.5 },
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
                  <Typography sx={{ fontSize: { xs: 17, sm: 18 }, fontWeight: 700, color: 'var(--vm-text-primary)', mb: 0.5 }}>
                    {plan.displayName}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)', px: 1 }}>
                    {plan.description}
                  </Typography>
                </Box>

                {/* Price */}
                <Box sx={{ textAlign: 'center', mb: { xs: 2.5, sm: 3 } }}>
                  <Typography sx={{ fontSize: { xs: 28, sm: 32 }, fontWeight: 700, color: 'var(--vm-text-primary)' }}>
                    ${billingPeriod === 'monthly' ? plan.priceMonthly : Math.round(plan.priceYearly / 12)}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>per month</Typography>
                  {billingPeriod === 'yearly' && plan.priceYearly > 0 && (
                    <Typography sx={{ fontSize: 11, color: '#22c55e', mt: 0.5, fontWeight: 500 }}>
                      Save {getSavings(plan)}%
                    </Typography>
                  )}
                </Box>

                {/* Features */}
                <Box sx={{ mb: { xs: 2.5, sm: 3 } }}>
                  {plan.features.map((feature, idx) => (
                    <Box key={idx} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25, mb: 1.25 }}>
                      <CheckCircle size={14} color={feature.included ? plan.color : 'var(--vm-text-muted)'} style={{ marginTop: 2, flexShrink: 0 }} />
                      <Typography sx={{ fontSize: { xs: 12, sm: 13 }, color: feature.included ? 'var(--vm-text-secondary)' : 'var(--vm-text-muted)', lineHeight: 1.4 }}>
                        {feature.text}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                {/* CTA */}
                <GradientButton
                  fullWidth
                  variant={plan.id === currentPlanId ? 'outline' : 'primary'}
                  size="md"
                  disabled={plan.id === currentPlanId}
                  onClick={() => handleUpgrade(plan.id)}
                  sx={{
                    color: '#fff !important',
                    '&.Mui-disabled': { color: '#fff !important' },
                  }}
                >
                  {plan.id === currentPlanId ? 'Current Plan' : 'Upgrade'}
                </GradientButton>
              </Card>
            ))}
          </Box>
        </>
      )}

      {/* Invoices Tab */}
      {activeTab === 1 && (
        <Box sx={{ overflowX: 'auto' }}>
          <Card sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, overflow: 'hidden' }}>
            <Box sx={{ p: { xs: 3, sm: 4 }, textAlign: 'center' }}>
              <Receipt size={32} color="var(--vm-text-muted)" style={{ margin: '0 auto 12px' }} />
              <Typography sx={{ fontSize: 15, color: 'var(--vm-text-muted)', mb: 1 }}>
                No invoices yet
              </Typography>
              <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)' }}>
                Invoices will appear here once you upgrade to a paid plan.
              </Typography>
            </Box>
          </Card>
        </Box>
      )}

      {/* Features Tab */}
      {activeTab === 2 && (
        <Box sx={{ overflowX: 'auto' }}>
          <Card sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, overflow: 'hidden' }}>
            {featureComparison.map((category) => (
              <Box key={category.category}>
                <Box sx={{ bgcolor: 'var(--vm-bg-tertiary)', p: { xs: 1.5, sm: 2 } }}>
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
                    {(['free', 'pro', 'pro_plus'] as PlanType[]).map((plan) => (
                      <Box key={plan} sx={{ textAlign: 'center' }}>
                        {typeof feature[plan] === 'boolean' ? (
                          feature[plan] ? (
                            <CheckCircle size={16} color="#22c55e" style={{ margin: '0 auto' }} />
                          ) : (
                            <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>—</Typography>
                          )
                        ) : (
                          <Typography sx={{
                            fontSize: { xs: 11, sm: 12 },
                            color: plan === currentPlanId ? 'var(--vm-primary-400)' : 'var(--vm-text-secondary)',
                            fontWeight: plan === currentPlanId ? 600 : 400,
                          }}>
                            {feature[plan] as string}
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

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onClose={() => !upgrading && setShowUpgradeDialog(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <Box sx={{
          p: { xs: 3, sm: 4 }, bgcolor: 'var(--vm-bg-secondary)',
          height: { xs: '100vh', sm: 'auto' },
          display: { xs: 'flex', sm: 'block' },
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: { xs: 'center', sm: 'flex-start' },
        }}>
          <Typography sx={{ fontSize: { xs: 20, sm: 22 }, fontWeight: 700, color: 'var(--vm-text-primary)', mb: 2, textAlign: { xs: 'center', sm: 'left' } }}>
            Upgrade to {selectedPlanName}
          </Typography>
          <Typography sx={{ fontSize: { xs: 14, sm: 15 }, color: 'var(--vm-text-secondary)', mb: { xs: 4, sm: 3 }, textAlign: { xs: 'center', sm: 'left' } }}>
            You are about to upgrade from {currentPlanData?.displayName || 'Free'} to {selectedPlanName}.
            The new plan will take effect immediately.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: { xs: 'center', sm: 'flex-end' }, flexDirection: { xs: 'column-reverse', sm: 'row' } }}>
            <GradientButton variant="outline" size="md" onClick={() => setShowUpgradeDialog(false)} disabled={upgrading} fullWidth={isMobile}>
              Cancel
            </GradientButton>
            <GradientButton variant="primary" size="md" onClick={handleConfirmUpgrade} disabled={upgrading} fullWidth={isMobile}>
              {upgrading ? 'Upgrading...' : 'Confirm Upgrade'}
            </GradientButton>
          </Box>
        </Box>
      </Dialog>
    </Box>
  );
}
