import { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Card, LinearProgress, Chip, CircularProgress } from '@mui/material';
import { GradientButton } from '../../components/shared/buttons';
import { NoBusinessSelected } from '../../components/venturemate/NoBusinessSelected';
import {
  TrendingUp,
  CheckCircle,
  Shield,
  Target,
  Users,
  DollarSign,
  Globe,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import type { ViewType } from '../../types/venturemate';
import { graphqlRequest } from '../../lib/api';
import { useBusiness } from '../../contexts/BusinessContext';

const getScoreColor = (score: number): string => {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#f59e0b';
  return '#ef4444';
};

const getScoreStatus = (score: number): { label: string; color: string } => {
  if (score >= 80) return { label: 'Healthy', color: '#22c55e' };
  if (score >= 60) return { label: 'Needs Attention', color: '#f59e0b' };
  return { label: 'Critical', color: '#ef4444' };
};

const getImpactColor = (impact: string): string => {
  switch (impact) {
    case 'high': return '#ef4444';
    case 'medium': return '#f59e0b';
    case 'low': return '#6b7280';
    default: return '#6b7280';
  }
};

const getEffortColor = (effort: string): string => {
  switch (effort) {
    case 'high': return '#ef4444';
    case 'medium': return '#f59e0b';
    case 'low': return '#22c55e';
    default: return '#6b7280';
  }
};

const componentLabels: Record<string, string> = {
  compliance: 'Compliance & Legal',
  revenue_viability: 'Revenue Viability',
  market_fit: 'Market Fit',
  team_structure: 'Team Structure',
  financial_sustainability: 'Financial Sustainability',
  digital_presence: 'Digital Presence',
};

const componentView: Record<string, ViewType> = {
  compliance: 'business-settings',
  revenue_viability: 'financial-forecast',
  market_fit: 'market-research',
  team_structure: 'team',
  financial_sustainability: 'banking',
  digital_presence: 'websites',
};

const HEALTH_SCORE_QUERY = `
  query BusinessScore($businessId: ID!, $scoreType: String!) {
    businessScore(businessId: $businessId, scoreType: $scoreType) {
      id, businessId, scoreType, scoreData, calculatedAt
    }
  }
`;

const RECALCULATE_HEALTH_MUTATION = `
  mutation RecalculateHealthScore($businessId: ID!) {
    recalculateHealthScore(businessId: $businessId) {
      id, businessId, scoreType, scoreData, calculatedAt
    }
  }
`;

interface HealthScoreProps {
   
  onViewChange?: (_view: ViewType) => void;
}

const componentIcons: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  compliance: Shield,
  revenue_viability: TrendingUp,
  market_fit: Target,
  team_structure: Users,
  financial_sustainability: DollarSign,
  digital_presence: Globe,
};

export function HealthScorePage({ onViewChange }: HealthScoreProps) {
  const { selectedBusiness } = useBusiness();
  const milestones = selectedBusiness?.milestones || [];
  const completedMiles = milestones.filter((m: { status: string }) => m.status === 'completed').length;
  const overdueMiles = milestones.filter((m: { status: string }) => m.status === 'overdue').length;
  const milestoneProgress = milestones.length > 0 ? (completedMiles / milestones.length) * 100 : 0;
  const [healthScore, setHealthScore] = useState({
    overallScore: 0, calculatedAt: '',
    components: {} as Record<string, { score: number; weight: number }>,
    recommendations: [] as Array<{ id: string; component: string; title: string; description: string; impact: string; effort: string }>,
    priorityActions: [] as Array<{ id: string; title: string; description: string; component: string; deadline: string; completed: boolean }>,
  });
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);

  const fetchData = useCallback(async () => {
    if (!selectedBusiness?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await graphqlRequest<{ businessScore: { scoreData: string } | null }>(HEALTH_SCORE_QUERY, {
        businessId: selectedBusiness.id, scoreType: 'health',
      });
      if (data.businessScore) {
        setHealthScore(prev => ({ ...prev, ...JSON.parse(data.businessScore!.scoreData) }));
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [selectedBusiness?.id]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const handleRefresh = async () => {
    if (!selectedBusiness?.id) return;
    setRecalculating(true);
    try {
      await graphqlRequest(RECALCULATE_HEALTH_MUTATION, {
        businessId: selectedBusiness.id,
      });
      await fetchData();
    } catch {
      // silently fail
    } finally {
      setRecalculating(false);
    }
  };

  if (!selectedBusiness) {
    return <NoBusinessSelected message="Select a business to view health score" />;
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
        <Box>
          <Typography sx={{ fontSize: { xs: 22, sm: 28 }, fontWeight: 700, color: 'var(--vm-text-primary)', mb: 1 }}>
            Health Score
          </Typography>
          <Typography sx={{ fontSize: { xs: 13, sm: 15, md: 16 }, color: 'var(--vm-text-muted)' }}>
            Assess your startup's overall health and readiness
          </Typography>
        </Box>
        <GradientButton variant="primary" size="md" onClick={handleRefresh} disabled={recalculating}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {recalculating ? <CircularProgress size={18} sx={{ color: 'white' }} /> : <RefreshCw size={18} />}
            {recalculating ? 'Calculating...' : 'Refresh'}
          </Box>
        </GradientButton>
      </Box>

      {/* Main Score Card */}
      <Card sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, p: 3, mb: 4, overflow: 'hidden' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '280px 1fr' }, gap: 3, alignItems: 'center' }}>
          {/* Speedometer */}
          <Box sx={{ textAlign: 'center', position: 'relative' }}>
            <svg viewBox="0 0 200 120" style={{ width: '100%', maxWidth: 240, height: 'auto' }}>
              <defs>
                <linearGradient id="healthGauge" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="33%" stopColor="#f59e0b" />
                  <stop offset="66%" stopColor="#22c55e" />
                  <stop offset="100%" stopColor="#16a34a" />
                </linearGradient>
              </defs>
              <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="18" strokeLinecap="round" />
              <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="url(#healthGauge)" strokeWidth="18" strokeLinecap="round"
                strokeDasharray={`${(healthScore.overallScore / 100) * 230} 230`} />
              {[0, 25, 50, 75, 100].map(t => {
                const angle = 180 + (t / 100) * 180; const rad = (angle * Math.PI) / 180; const r = 80;
                return <line key={t} x1={100 + (r - 8) * Math.cos(rad)} y1={100 + (r - 8) * Math.sin(rad)}
                  x2={100 + (r - 18) * Math.cos(rad)} y2={100 + (r - 18) * Math.sin(rad)} stroke="rgba(255,255,255,.3)" strokeWidth="2" />;
              })}
              <line x1="100" y1="100" x2={100 + 55 * Math.cos((180 + (healthScore.overallScore / 100) * 180) * Math.PI / 180)}
                y2={100 + 55 * Math.sin((180 + (healthScore.overallScore / 100) * 180) * Math.PI / 180)}
                stroke={getScoreColor(healthScore.overallScore)} strokeWidth="3" strokeLinecap="round" />
              <circle cx="100" cy="100" r="6" fill={getScoreColor(healthScore.overallScore)} />
              <text x="100" y="64" textAnchor="middle" fill={getScoreColor(healthScore.overallScore)} fontSize="28" fontWeight="800" fontFamily="Inter,sans-serif">{healthScore.overallScore}</text>
              <text x="100" y="78" textAnchor="middle" fill="rgba(255,255,255,.4)" fontSize="10" fontFamily="Inter,sans-serif">/ 100</text>
            </svg>
            <Chip size="small" label={getScoreStatus(healthScore.overallScore).label}
              sx={{ mt: 0.5, bgcolor: `${getScoreStatus(healthScore.overallScore).color}20`, color: getScoreStatus(healthScore.overallScore).color, fontSize: 11, fontWeight: 700, '& .MuiChip-label': { overflowWrap: 'anywhere' } }} />
          </Box>

          <Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
              <Box>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#22c55e', mb: 1 }}>Recommendations</Typography>
                {healthScore.recommendations.slice(0, 3).map(r => (
                  <Box key={r.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                    <ArrowRight size={12} color="var(--vm-primary-400)" />
                    <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,.7)', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{r.title}</Typography>
                  </Box>
                ))}
              </Box>
              <Box>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', mb: 1 }}>Priority Actions</Typography>
                {healthScore.priorityActions.filter(a => !a.completed).slice(0, 3).map(a => (
                  <Box key={a.id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, mb: 0.5 }}>
                    <TrendingUp size={12} color="#f59e0b" style={{ marginTop: 2 }} />
                    <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,.7)', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{a.title}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
            {/* Milestone Progress */}
            {milestones.length > 0 && (
              <Box sx={{ bgcolor: 'rgba(255,255,255,.03)', borderRadius: 2, p: 1.5, mt: 1 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.6)', mb: 0.5 }}>MILESTONES</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                      <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,.4)' }}>{completedMiles}/{milestones.length} done</Typography>
                      <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,.4)' }}>{overdueMiles} overdue</Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={milestoneProgress} sx={{ height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,.06)',
                      '& .MuiLinearProgress-bar': { bgcolor: '#22c55e', borderRadius: 2 } }} />
                  </Box>
                  <Chip size="small" label={`${Math.round(milestoneProgress)}%`} sx={{ fontSize: 10, color: '#22c55e', bgcolor: 'rgba(34,197,94,.12)' }} />
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      </Card>

      {/* Components Grid */}
      <Typography sx={{ fontSize: 18, fontWeight: 700, color: 'var(--vm-text-primary)', mb: 3 }}>
        Health Components
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: { xs: 2, md: 3 }, mb: 4 }}>
        {Object.entries(healthScore.components).map(([key, data]) => {
          const Icon = componentIcons[key];
          return (
            <Card
              key={key}
              onClick={() => onViewChange?.(componentView[key])}
              sx={{
                bgcolor: 'var(--vm-bg-secondary)',
                border: '1px solid var(--vm-border-subtle)',
                borderRadius: 3,
                p: 3,
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: 'var(--vm-primary-600)',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    bgcolor: `${getScoreColor(data.score)}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {Icon && <Icon size={22} color={getScoreColor(data.score)} />}
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)', overflowWrap: 'anywhere' }}>
                    {componentLabels[key]}
                  </Typography>
                  <Typography sx={{ fontSize: 20, fontWeight: 700, color: getScoreColor(data.score) }}>
                    {data.score}%
                  </Typography>
                </Box>
              </Box>
              <LinearProgress
                variant="determinate"
                value={data.score}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  bgcolor: 'var(--vm-bg-tertiary)',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: getScoreColor(data.score),
                    borderRadius: 3,
                  },
                }}
              />
            </Card>
          );
        })}
      </Box>

      {/* Recommendations */}
      <Typography sx={{ fontSize: 18, fontWeight: 700, color: 'var(--vm-text-primary)', mb: 3 }}>
        Recommendations
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: { xs: 2, md: 3 }, mb: 4 }}>
        {healthScore.recommendations.map((rec) => (
          <Card
            key={rec.id}
            onClick={() => onViewChange?.(componentView[rec.component])}
            sx={{
              bgcolor: 'var(--vm-bg-secondary)',
              border: '1px solid var(--vm-border-subtle)',
              borderRadius: 3,
              p: 3,
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': {
                borderColor: 'var(--vm-primary-600)',
                transform: 'translateY(-2px)',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Chip
                size="small"
                label={rec.impact}
                sx={{
                  bgcolor: `${getImpactColor(rec.impact)}20`,
                  color: getImpactColor(rec.impact),
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  '& .MuiChip-label': { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', py: 0.5, overflowWrap: 'anywhere' },
                }}
              />
              <Chip
                size="small"
                label={rec.effort}
                sx={{
                  bgcolor: `${getEffortColor(rec.effort)}20`,
                  color: getEffortColor(rec.effort),
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  '& .MuiChip-label': { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', py: 0.5, overflowWrap: 'anywhere' },
                }}
              />
            </Box>
            <Typography sx={{ fontSize: 15, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 1, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
              {rec.title}
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'var(--vm-text-secondary)', mb: 2, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
              {rec.description}
            </Typography>
            <Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)', textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Category: {rec.component.replace('_', ' ')}
            </Typography>
          </Card>
        ))}
      </Box>

      {/* Priority Actions */}
      <Typography sx={{ fontSize: 18, fontWeight: 700, color: 'var(--vm-text-primary)', mb: 3 }}>
        Priority Actions
      </Typography>
      <Card
        sx={{
          bgcolor: 'var(--vm-bg-secondary)',
          border: '1px solid var(--vm-border-subtle)',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        {healthScore.priorityActions.map((action, idx) => (
          <Box
            key={action.id}
            onClick={() => onViewChange?.(componentView[action.component])}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 3,
              borderBottom: idx < healthScore.priorityActions.length - 1 ? '1px solid var(--vm-border-subtle)' : 'none',
              bgcolor: action.completed ? 'rgba(34, 197, 94, 0.05)' : 'transparent',
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': { bgcolor: 'var(--vm-bg-hover)' },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 2,
                  bgcolor: action.completed ? 'rgba(34, 197, 94, 0.2)' : 'var(--vm-bg-tertiary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {action.completed ? (
                  <CheckCircle size={16} color="#22c55e" />
                ) : (
                  <ArrowRight size={16} color="var(--vm-text-muted)" />
                )}
              </Box>
              <Box>
<Typography
                    sx={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: action.completed ? 'var(--vm-text-muted)' : 'var(--vm-text-primary)',
                      textDecoration: action.completed ? 'line-through' : 'none',
                      overflowWrap: 'anywhere',
                      wordBreak: 'break-word',
                    }}
                  >
                    {action.title}
                  </Typography>
                <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                    {action.description}
                  </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip
                size="small"
                label={action.component.replace('_', ' ')}
                sx={{
                  bgcolor: 'var(--vm-bg-tertiary)',
                  color: 'var(--vm-text-muted)',
                  fontSize: 10,
                  textTransform: 'capitalize',
                  '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
                }}
              />
              <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Due: {action.deadline ? new Date(action.deadline).toLocaleDateString('en-GB') : '—'}
              </Typography>
            </Box>
          </Box>
        ))}
      </Card>
    </Box>
  );
}
