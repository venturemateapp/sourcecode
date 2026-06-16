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

export function HealthScorePage({ onViewChange: _onViewChange }: HealthScoreProps) {
  const { selectedBusiness } = useBusiness();
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
      <Card
        sx={{
          bgcolor: 'var(--vm-bg-secondary)',
          border: `2px solid ${getScoreColor(healthScore.overallScore)}`,
          borderRadius: 3,
          p: 4,
          mb: 4,
          background: `linear-gradient(135deg, ${getScoreColor(healthScore.overallScore)}15 0%, var(--vm-bg-tertiary) 100%)`,
        }}
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: { xs: 3, md: 6 }, alignItems: 'center' }}>
          {/* Overall Score */}
          <Box sx={{ textAlign: 'center' }}>
            <Typography sx={{ fontSize: 14, color: 'var(--vm-text-muted)', mb: 1 }}>
              Overall Health Score
            </Typography>
            <Typography
              sx={{
                fontSize: { xs: 48, md: 80 },
                fontWeight: 700,
                color: getScoreColor(healthScore.overallScore),
                lineHeight: 1,
              }}
            >
              {healthScore.overallScore}
            </Typography>
            <Typography sx={{ fontSize: 14, color: 'var(--vm-text-muted)' }}>
              of 100
            </Typography>
          </Box>

          {/* Status */}
          <Box sx={{ textAlign: 'center' }}>
            <Typography sx={{ fontSize: 14, color: 'var(--vm-text-muted)', mb: 1 }}>
              Status
            </Typography>
            <Typography
              sx={{
                fontSize: { xs: 24, md: 32 },
                fontWeight: 700,
                color: getScoreStatus(healthScore.overallScore).color,
                mb: 1,
              }}
            >
              {getScoreStatus(healthScore.overallScore).label}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                              {healthScore.overallScore >= 80 ? (
                  <CheckCircle size={20} color="#22c55e" />
                ) : (
                  <TrendingUp size={20} color="#f59e0b" />
                )}
              <Typography sx={{ fontSize: 13, color: 'var(--vm-text-secondary)' }}>
                {healthScore.overallScore >= 80 
                  ? 'Your startup is in great shape!' 
                  : 'Some areas need attention'}
              </Typography>
            </Box>
          </Box>

          {/* Priority Actions */}
          <Box>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 2 }}>
              Priority Actions ({healthScore.priorityActions.filter(a => !a.completed).length})
            </Typography>
            {healthScore.priorityActions.filter(a => !a.completed).slice(0, 2).map((action) => (
              <Box key={action.id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                <ArrowRight size={14} color="var(--vm-primary-400)" style={{ marginTop: 3 }} />
                <Typography sx={{ fontSize: 12, color: 'var(--vm-text-secondary)' }}>
                  {action.title}
                </Typography>
              </Box>
            ))}
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
              sx={{
                bgcolor: 'var(--vm-bg-secondary)',
                border: '1px solid var(--vm-border-subtle)',
                borderRadius: 3,
                p: 3,
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
                  <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)' }}>
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
            sx={{
              bgcolor: 'var(--vm-bg-secondary)',
              border: '1px solid var(--vm-border-subtle)',
              borderRadius: 3,
              p: 3,
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
                }}
              />
            </Box>
            <Typography sx={{ fontSize: 15, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 1 }}>
              {rec.title}
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'var(--vm-text-secondary)', mb: 2 }}>
              {rec.description}
            </Typography>
            <Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)', textTransform: 'capitalize' }}>
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
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 3,
              borderBottom: idx < healthScore.priorityActions.length - 1 ? '1px solid var(--vm-border-subtle)' : 'none',
              bgcolor: action.completed ? 'rgba(34, 197, 94, 0.05)' : 'transparent',
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
                  }}
                >
                  {action.title}
                </Typography>
                <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>
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
                }}
              />
              <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>
                Due: {new Date(action.deadline).toLocaleDateString()}
              </Typography>
            </Box>
          </Box>
        ))}
      </Card>
    </Box>
  );
}
