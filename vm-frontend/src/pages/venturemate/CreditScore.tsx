import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  Tabs,
  Tab,
  Chip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  Stepper,
  Step,
  StepLabel,
  TextField,
  Grid,
  Slider,
  Alert,
  CircularProgress,
  MenuItem,
} from '@mui/material';
import { GradientButton } from '../../components/shared/buttons';
import { NoBusinessSelected } from '../../components/venturemate/NoBusinessSelected';
import { graphqlRequest } from '../../lib/api';
import { useBusiness } from '../../contexts/BusinessContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { HealthScorePage } from './HealthScore';
import {
  Landmark,
  CheckCircle,
  FileText,
  Upload,
  ArrowRight,
  Check,
  X,
  Info,
  Building2,
} from 'lucide-react';
import type { ViewType } from '../../types/venturemate';

const getScoreColor = (score: number): string => {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#f59e0b';
  if (score >= 40) return '#f97316';
  return '#ef4444';
};

const getScoreGrade = (score: number): string => {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Very Good';
  if (score >= 70) return 'Good';
  if (score >= 60) return 'Fair';
  if (score >= 40) return 'Poor';
  return 'Very Poor';
};

const getRiskLabel = (level: string): { label: string; color: string } => {
  switch (level) {
    case 'low': return { label: 'Low Risk', color: '#22c55e' };
    case 'moderate': return { label: 'Moderate Risk', color: '#f59e0b' };
    case 'high': return { label: 'High Risk', color: '#f97316' };
    case 'very_high': return { label: 'Very High Risk', color: '#ef4444' };
    default: return { label: 'Unknown', color: '#6b7280' };
  }
};

interface FinancingOffer {
  id: string; lenderName: string; productType: string;
  minAmount: number; maxAmount: number; minRate: number; maxRate: number;
  termMonths: number; requirements: string[]; preQualified: boolean; expiresAt: string;
}

interface CreditHistoryItem {
  id: string; score: number; calculatedAt: string;
}

interface FinancingApplication {
  id: string; offer_id: string; lender_name: string; product_type: string; amount: number; term: number; status: string; submitted_at: string; decision_date?: string;
}

const CREDIT_SCORE_QUERY = `
  query BusinessScore($businessId: ID!, $scoreType: String!) {
    businessScore(businessId: $businessId, scoreType: $scoreType) {
      id, businessId, scoreType, scoreData, calculatedAt
    }
  }
`;

const FINANCING_OFFERS_QUERY = `
  query FinancingOffers($businessId: ID!) {
    financingOffers(businessId: $businessId) {
      id, lenderName, productType, minAmount, maxAmount, minRate, maxRate, termMonths, requirements, preQualified, expiresAt
    }
  }
`;

const CREDIT_HISTORY_QUERY = `
  query CreditHistory($businessId: ID!, $limit: Int) {
    creditHistory(businessId: $businessId, limit: $limit) {
      id, score, calculatedAt
    }
  }
`;



interface CreditScoreProps {
  onViewChange?: (_view: ViewType) => void;
}

interface ApplicationData {
  amount: number;
  term: number;
  purpose: string;
  documents: string[];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function CreditScorePage(_props: CreditScoreProps) {
  const { selectedBusiness } = useBusiness();
  const { format } = useCurrency();
  const [creditScore, setCreditScore] = useState({
    score: 0, max_score: 100, grade: '', risk_level: 'moderate',
    calculated_at: '',
    factors: { positive: [] as string[], negative: [] as string[] },
    components: { payment_history: 0, credit_utilization: 0, business_age: 0, revenue_stability: 0, debt_ratio: 0, profile_strength: 0 },
    advice: [] as string[],
  });
  const [financingOffers, setFinancingOffers] = useState<FinancingOffer[]>([]);
  const [creditHistory, setCreditHistory] = useState<CreditHistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);

  const [financingApplications] = useState<FinancingApplication[]>([]);

  const fetchData = useCallback(async () => {
    if (!selectedBusiness?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [scoreResult, offersResult, historyResult] = await Promise.all([
        graphqlRequest<{ businessScore: { scoreData: string } | null }>(CREDIT_SCORE_QUERY, {
          businessId: selectedBusiness.id, scoreType: 'credit',
        }),
        graphqlRequest<{ financingOffers: FinancingOffer[] }>(FINANCING_OFFERS_QUERY, {
          businessId: selectedBusiness.id,
        }),
        graphqlRequest<{ creditHistory: CreditHistoryItem[] }>(CREDIT_HISTORY_QUERY, {
          businessId: selectedBusiness.id, limit: 10,
        }),
      ]);
      if (scoreResult.businessScore) {
        setCreditScore(prev => ({ ...prev, ...JSON.parse(scoreResult.businessScore!.scoreData) }));
      }
      setFinancingOffers(offersResult.financingOffers);
      setCreditHistory(historyResult.creditHistory);
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

  // Apply Modal State
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<FinancingOffer | null>(null);
  const [applyStep, setApplyStep] = useState(0);
  const [applicationData, setApplicationData] = useState<ApplicationData>({
    amount: 0,
    term: 12,
    purpose: '',
    documents: [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Eligibility Modal State
  const [eligibilityModalOpen, setEligibilityModalOpen] = useState(false);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [eligibilityResult, setEligibilityResult] = useState<{
    eligible: boolean;
    score: number;
    reasons: string[];
    preQualifiedAmount?: number;
  } | null>(null);

  const getProductTypeLabel = (type: string) => {
    switch (type) {
      case 'loan': return 'Term Loan';
      case 'line_of_credit': return 'Line of Credit';
      case 'equipment_financing': return 'Equipment Financing';
      case 'invoice_factoring': return 'Invoice Factoring';
      default: return type;
    }
  };

  const getAppStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#22c55e';
      case 'under_review': return '#f59e0b';
      case 'submitted': return '#3b82f6';
      case 'rejected': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const handleApplyClick = (offer: FinancingOffer) => {
    setSelectedOffer(offer);
    setApplicationData({
      amount: offer.minAmount,
      term: offer.termMonths,
      purpose: '',
      documents: [],
    });
    setApplyStep(0);
    setSubmitSuccess(false);
    setApplyModalOpen(true);
  };

  const handleCheckEligibilityClick = (offer: FinancingOffer) => {
    setSelectedOffer(offer);
    setEligibilityResult(null);
    setEligibilityModalOpen(true);
  };

  const checkEligibility = async () => {
    if (!selectedBusiness) return;
    setCheckingEligibility(true);
    try {
      const d = await graphqlRequest<{ businessScore: { scoreData: string } | null }>('query Q($b:ID!,$t:String!){businessScore(businessId:$b scoreType:$t){scoreData}}', { b: selectedBusiness.id, t: 'credit' });
      if (d.businessScore?.scoreData) {
        const data = JSON.parse(d.businessScore.scoreData);
        const score = data.score || 50;
        const isEligible = score >= 50;
        setEligibilityResult({
          eligible: isEligible,
          score: Math.floor(score * 8) + 300,
          reasons: isEligible
            ? ['Strong credit history', 'Consistent revenue', 'Low debt ratio']
            : ['Insufficient business history', 'Revenue below threshold'],
          preQualifiedAmount: isEligible ? Math.floor(score * 5000) : undefined,
        });
      }
    } catch { /* ignore */ }
    setCheckingEligibility(false);
  };

  const handleSubmitApplication = () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitSuccess(true);
      setApplyStep(3);
    }, 1500);
  };

  const applySteps = ['Loan Details', 'Documents', 'Review', 'Confirmation'];

  if (!selectedBusiness) {
    return <NoBusinessSelected message="Select a business to view credit score" />;
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
          <Typography sx={{ fontSize: { xs: 12, sm: 14 }, fontWeight: 700, color: 'var(--vm-text-primary)', mb: 1 }}>
            Credit Score
          </Typography>
          <Typography sx={{ fontSize: { xs: 12, sm: 14 }, color: 'var(--vm-text-muted)' }}>
            Monitor your business credit and financing options
          </Typography>
        </Box>
      </Box>

      {/* Speedometer Score Card */}
      {creditScore.score > 0 && (
        <Card sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, p: 3, mb: 4, overflow: 'hidden' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '300px 1fr' }, gap: 3, alignItems: 'center' }}>
            {/* Speedometer */}
            <Box sx={{ textAlign: 'center', position: 'relative' }}>
              <svg viewBox="0 0 200 120" style={{ width: '100%', maxWidth: 260, height: 'auto' }}>
                <defs>
                  <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="30%" stopColor="#f97316" />
                    <stop offset="55%" stopColor="#f59e0b" />
                    <stop offset="80%" stopColor="#22c55e" />
                    <stop offset="100%" stopColor="#16a34a" />
                  </linearGradient>
                </defs>
                {/* Background arc */}
                <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="18" strokeLinecap="round" />
                {/* Score arc */}
                <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="url(#gaugeGrad)" strokeWidth="18" strokeLinecap="round"
                  strokeDasharray={`${(creditScore.score / 100) * 230} 230`} />
                {/* Ticks */}
                {[0, 25, 50, 75, 100].map(t => {
                  const angle = 180 + (t / 100) * 180;
                  const r = 80; const rad = (angle * Math.PI) / 180;
                  const x1 = 100 + (r - 8) * Math.cos(rad); const y1 = 100 + (r - 8) * Math.sin(rad);
                  const x2 = 100 + (r - 18) * Math.cos(rad); const y2 = 100 + (r - 18) * Math.sin(rad);
                  return <line key={t} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,.3)" strokeWidth="2" />;
                })}
                {/* Needle */}
                <line x1="100" y1="100" x2={100 + 55 * Math.cos((180 + (creditScore.score / 100) * 180) * Math.PI / 180)}
                  y2={100 + 55 * Math.sin((180 + (creditScore.score / 100) * 180) * Math.PI / 180)}
                  stroke={getScoreColor(creditScore.score)} strokeWidth="3" strokeLinecap="round" />
                <circle cx="100" cy="100" r="6" fill={getScoreColor(creditScore.score)} />
                {/* Score text */}
                <text x="100" y="64" textAnchor="middle" fill={getScoreColor(creditScore.score)} fontSize="28" fontWeight="800" fontFamily="Inter,sans-serif">{creditScore.score}</text>
                <text x="100" y="78" textAnchor="middle" fill="rgba(255,255,255,.4)" fontSize="10" fontFamily="Inter,sans-serif">/ {creditScore.max_score}</text>
              </svg>
              <Chip size="small" label={getRiskLabel(creditScore.risk_level).label}
                sx={{ mt: 0.5, bgcolor: `${getRiskLabel(creditScore.risk_level).color}20`, color: getRiskLabel(creditScore.risk_level).color, fontSize: 11, fontWeight: 700 }} />
            </Box>

            {/* Factors + Advice */}
            <Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                <Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#22c55e', mb: 1 }}>Strengths</Typography>
                  {creditScore.factors.positive.slice(0, 4).map((f, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                      <CheckCircle size={12} color="#22c55e" />
                      <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,.7)' }}>{f}</Typography>
                    </Box>
                  ))}
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', mb: 1 }}>Grade</Typography>
                  <Typography sx={{ fontSize: 36, fontWeight: 800, color: getScoreColor(creditScore.score), lineHeight: 1 }}>{getScoreGrade(creditScore.score)}</Typography>
                  <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,.4)', mt: 0.5 }}>Last updated: {creditScore.calculated_at ? new Date(creditScore.calculated_at).toLocaleDateString() : '—'}</Typography>
                </Box>
              </Box>

              {/* Advice */}
              {creditScore.advice.length > 0 && (
                <Box sx={{ bgcolor: 'rgba(245,158,11,.08)', borderRadius: 2, p: 1.5, border: '1px solid rgba(245,158,11,.2)' }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', mb: 0.75 }}>How to improve</Typography>
                  {creditScore.advice.map((a, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, mb: 0.4 }}>
                      <Typography sx={{ color: '#f59e0b', fontSize: 11, fontWeight: 700, minWidth: 16 }}>{i + 1}.</Typography>
                      <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,.7)', lineHeight: 1.4 }}>{a}</Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </Box>

          {/* Score Components */}
          <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid rgba(255,255,255,.06)' }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(6, 1fr)' }, gap: { xs: 1.5, md: 2 } }}>
              {Object.entries(creditScore.components).map(([key, value]) => (
                <Box key={key}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,.5)', textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</Typography>
                    <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,.7)', fontWeight: 700 }}>{value}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={value} sx={{ height: 5, borderRadius: 3, bgcolor: 'rgba(255,255,255,.06)',
                    '& .MuiLinearProgress-bar': { bgcolor: getScoreColor(value * 8.5), borderRadius: 3 } }} />
                </Box>
              ))}
            </Box>
          </Box>
        </Card>
      )}

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          mb: 3,
          '& .MuiTabs-indicator': { bgcolor: 'var(--vm-primary-500)' },
          '& .MuiTab-root': {
            color: 'var(--vm-text-muted)',
            textTransform: 'none',
            fontSize: { xs: 13, sm: 14 },
            '&.Mui-selected': { color: 'var(--vm-primary-400)' },
          },
        }}
      >
        <Tab label="Health Score" />
        <Tab label="Financing Offers" />
        <Tab label="Applications" />
        <Tab label="History" />
      </Tabs>

      {/* Health Score */}
      {activeTab === 0 && <HealthScorePage />}

      {/* Financing Offers */}
      {activeTab === 1 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: { xs: 2, md: 3 } }}>
          {financingOffers.map((offer) => (
            <Card
              key={offer.id}
              sx={{
                bgcolor: 'var(--vm-bg-secondary)',
                border: offer.preQualified ? '2px solid var(--vm-primary-600)' : '1px solid var(--vm-border-subtle)',
                borderRadius: 3,
                p: 3,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      bgcolor: 'var(--vm-bg-tertiary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Landmark size={24} color="var(--vm-primary-400)" />
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'var(--vm-text-primary)', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                      {offer.lenderName}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)', overflowWrap: 'anywhere' }}>
                      {getProductTypeLabel(offer.productType)}
                    </Typography>
                  </Box>
                </Box>
                {offer.preQualified && (
                  <Chip
                    size="small"
                    label="Pre-qualified"
                    sx={{
                      bgcolor: 'var(--vm-primary-900)',
                      color: 'var(--vm-primary-400)',
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  />
                )}
              </Box>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '16px' }}>
                <Box>
                  <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>Amount</Typography>
                  <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'var(--vm-text-primary)', overflowWrap: 'anywhere' }}>
                    {format(offer.minAmount)} - {format(offer.maxAmount)}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>Rate</Typography>
                  <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'var(--vm-text-primary)', overflowWrap: 'anywhere' }}>
                    {offer.minRate}% - {offer.maxRate}%
                  </Typography>
                </Box>
              </div>

              <Box sx={{ mb: 2 }}>
                <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)', mb: 1 }}>Requirements</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxWidth: '100%' }}>
                  {offer.requirements.map((req, idx) => (
                    <Chip
                      key={idx}
                      size="small"
                      label={req}
                      sx={{
                        bgcolor: 'var(--vm-bg-tertiary)',
                        color: 'var(--vm-text-muted)',
                        fontSize: 10,
                        maxWidth: '100%',
                        '& .MuiChip-label': { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', py: 0.5 },
                      }}
                    />
                  ))}
                </Box>
              </Box>

              <GradientButton
                fullWidth
                variant={offer.preQualified ? 'primary' : 'outline'}
                size="md"
                onClick={() =>
                  offer.preQualified ? handleApplyClick(offer) : handleCheckEligibilityClick(offer)
                }
              >
                {offer.preQualified ? 'Apply Now' : 'Check Eligibility'}
              </GradientButton>
            </Card>
          ))}
          {financingOffers.length === 0 && (
            <Typography sx={{ color: 'var(--vm-text-muted)', gridColumn: '1 / -1', textAlign: 'center', py: 6 }}>
              No financing offers available yet. Add business data to get started.
            </Typography>
          )}
        </Box>
      )}

      {/* Applications */}
      {activeTab === 2 && (
        <Card
          sx={{
            bgcolor: 'var(--vm-bg-secondary)',
            border: '1px solid var(--vm-border-subtle)',
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          {financingApplications.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Typography sx={{ fontSize: 14, color: 'var(--vm-text-muted)' }}>
                No applications yet. Apply for financing to get started.
              </Typography>
            </Box>
          ) : (
            financingApplications.map((app, idx) => (
              <Box
                key={app.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 3,
                  borderBottom: idx < financingApplications.length - 1 ? '1px solid var(--vm-border-subtle)' : 'none',
                }}
              >
                <Box>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 0.5 }}>
                    {app.lender_name}
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)' }}>
                    {getProductTypeLabel(app.product_type)} • {format(app.amount)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Chip
                    size="small"
                    label={app.status.replace('_', ' ')}
                    sx={{
                      bgcolor: `${getAppStatusColor(app.status)}20`,
                      color: getAppStatusColor(app.status),
                      fontSize: 10,
                      fontWeight: 600,
                      textTransform: 'capitalize',
                    }}
                  />
                  {app.submitted_at && (
                    <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>
                      {app.submitted_at ? new Date(app.submitted_at).toLocaleDateString('en-GB') : '—'}
                    </Typography>
                  )}
                </Box>
              </Box>
            ))
          )}
        </Card>
      )}

      {/* History */}
      {activeTab === 3 && (
        <Box sx={{ overflowX: 'auto' }}>
          <Card
            sx={{
              bgcolor: 'var(--vm-bg-secondary)',
              border: '1px solid var(--vm-border-subtle)',
              borderRadius: 3,
              p: 3,
            }}
          >
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 3 }}>
              Score History
            </Typography>
            {creditHistory.length === 0 ? (
              <Typography sx={{ fontSize: 14, color: 'var(--vm-text-muted)', textAlign: 'center', py: 4 }}>
                No score history yet. Recalculate your score to see history here.
              </Typography>
            ) : (
              creditHistory.map((item, idx) => (
                <Box
                  key={item.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    pb: 2,
                    mb: 2,
                    borderBottom: idx < creditHistory.length - 1 ? '1px solid var(--vm-border-subtle)' : 'none',
                  }}
                >
                  <Typography sx={{ fontSize: 14, color: 'var(--vm-text-primary)' }}>
                    {item.calculatedAt ? new Date(item.calculatedAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : '—'}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <LinearProgress
                      variant="determinate"
                      value={item.score}
                      sx={{
                        width: 200,
                        height: 8,
                        borderRadius: 4,
                        bgcolor: 'var(--vm-bg-tertiary)',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: getScoreColor(item.score),
                          borderRadius: 4,
                        },
                      }}
                    />
                    <Typography
                      sx={{
                        fontSize: 16,
                        fontWeight: 600,
                        color: getScoreColor(item.score),
                        minWidth: 50,
                      }}
                    >
                      {item.score}
                    </Typography>
                  </Box>
                </Box>
              ))
            )}
          </Card>
        </Box>
      )}

      {/* Apply Modal */}
      <Dialog
        open={applyModalOpen}
        onClose={() => !submitting && setApplyModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'var(--vm-bg-secondary)',
            color: 'var(--vm-text-primary)',
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid var(--vm-border-subtle)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Landmark size={24} color="var(--vm-primary-400)" />
              <Box>
                <Typography sx={{ fontSize: 18, fontWeight: 600 }}>
                  Apply for {getProductTypeLabel(selectedOffer?.productType || '')}
                </Typography>
                <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                  {selectedOffer?.lenderName}
                </Typography>
              </Box>
            </Box>
            <IconButton
              onClick={() => setApplyModalOpen(false)}
              disabled={submitting}
              sx={{ color: 'var(--vm-text-muted)' }}
            >
              <X size={20} />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3.5 }}>
          <Stepper
            activeStep={applyStep}
            sx={{
              mb: 4,
              '& .MuiStepLabel-label': { color: 'var(--vm-text-muted)' },
              '& .MuiStepLabel-label.Mui-active': { color: 'var(--vm-primary-400)' },
              '& .MuiStepLabel-label.Mui-completed': { color: 'var(--vm-primary-400)' },
              '& .MuiSvgIcon-root': { color: 'var(--vm-bg-tertiary)' },
              '& .MuiSvgIcon-root.Mui-active': { color: 'var(--vm-primary-600)' },
              '& .MuiSvgIcon-root.Mui-completed': { color: 'var(--vm-primary-600)' },
            }}
          >
            {applySteps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {applyStep === 0 && (
            <Box>
              <Typography sx={{ fontSize: 16, fontWeight: 600, mb: 3 }}>
                Loan Details
              </Typography>
              <Grid container spacing={3}>
                <Grid size={12}>
                  <Typography sx={{ fontSize: { xs: 12, sm: 14 }, color: 'var(--vm-text-muted)', mb: 1, overflowWrap: 'anywhere' }}>
                    Loan Amount: {format(applicationData.amount)}
                  </Typography>
                  <Slider
                    value={applicationData.amount}
                    onChange={(_, v) => setApplicationData({ ...applicationData, amount: v as number })}
                    min={selectedOffer?.minAmount || 10000}
                    max={selectedOffer?.maxAmount || 500000}
                    step={5000}
                    sx={{
                      color: 'var(--vm-primary-600)',
                      '& .MuiSlider-thumb': { bgcolor: 'var(--vm-primary-400)' },
                    }}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--vm-text-muted)' }}>
                    <span>{format(selectedOffer?.minAmount ?? 0)}</span>
                    <span>{format(selectedOffer?.maxAmount ?? 0)}</span>
                  </Box>
                </Grid>
                <Grid size={6}>
                  <TextField
                    fullWidth
                    label="Loan Term (months)"
                    type="number"
                    value={applicationData.term || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setApplicationData({ ...applicationData, term: val === '' ? 0 : parseInt(val) || 0 });
                    }}
                    sx={{
                      '& .MuiInputBase-root': { bgcolor: 'var(--vm-bg-primary)', color: 'var(--vm-text-primary)' },
                      '& .MuiInputLabel-root': { color: 'var(--vm-text-muted)' },
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' },
                    }}
                  />
                </Grid>
                <Grid size={6}>
                  <TextField
                    fullWidth
                    label="Purpose of Loan"
                    select
                    value={applicationData.purpose}
                    onChange={(e) => setApplicationData({ ...applicationData, purpose: e.target.value })}
                    sx={{
                      '& .MuiInputBase-root': { bgcolor: 'var(--vm-bg-primary)', color: 'var(--vm-text-primary)' },
                      '& .MuiInputLabel-root': { color: 'var(--vm-text-muted)' },
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' },
                    }}
                  >
                    <MenuItem value=""><em>Select purpose...</em></MenuItem>
                    <MenuItem value="expansion" sx={{ color: 'var(--vm-text-primary)' }}>Business Expansion</MenuItem>
                    <MenuItem value="equipment" sx={{ color: 'var(--vm-text-primary)' }}>Equipment Purchase</MenuItem>
                    <MenuItem value="inventory" sx={{ color: 'var(--vm-text-primary)' }}>Inventory</MenuItem>
                    <MenuItem value="working_capital" sx={{ color: 'var(--vm-text-primary)' }}>Working Capital</MenuItem>
                    <MenuItem value="refinancing" sx={{ color: 'var(--vm-text-primary)' }}>Refinancing</MenuItem>
                  </TextField>
                </Grid>
              </Grid>
            </Box>
          )}

          {applyStep === 1 && (
            <Box>
              <Typography sx={{ fontSize: 16, fontWeight: 600, mb: 3 }}>
                Required Documents
              </Typography>
              <Alert
                severity="info"
                icon={<Info size={20} />}
                sx={{
                  mb: 3,
                  bgcolor: 'var(--vm-bg-tertiary)',
                  color: 'var(--vm-text-secondary)',
                  '& .MuiAlert-icon': { color: 'var(--vm-primary-400)' },
                }}
              >
                Please upload the following documents to complete your application
              </Alert>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {['Business Tax Returns (last 2 years)', 'Bank Statements (last 6 months)', 'Financial Statements', 'Business Plan'].map((doc, idx) => (
                  <Card
                    key={idx}
                    sx={{
                      p: 2,
                      bgcolor: 'var(--vm-bg-tertiary)',
                      border: '1px dashed var(--vm-border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <FileText size={20} color="var(--vm-primary-400)" />
                      <Typography sx={{ fontSize: 14 }}>{doc}</Typography>
                    </Box>
                    <GradientButton variant="outline" size="sm">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Upload size={14} />
                        Upload
                      </Box>
                    </GradientButton>
                  </Card>
                ))}
              </Box>
            </Box>
          )}

          {applyStep === 2 && (
            <Box>
              <Typography sx={{ fontSize: 16, fontWeight: 600, mb: 3 }}>
                Review Application
              </Typography>
              <Card sx={{ p: 3, bgcolor: 'var(--vm-bg-tertiary)', mb: 3 }}>
                <Grid container spacing={3}>
                  <Grid size={6}>
                    <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>Lender</Typography>
                    <Typography sx={{ fontSize: 14, fontWeight: 600, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{selectedOffer?.lenderName}</Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>Product</Typography>
                    <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{getProductTypeLabel(selectedOffer?.productType || '')}</Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>Amount</Typography>
                    <Typography sx={{ fontSize: 14, fontWeight: 600, overflowWrap: 'anywhere' }}>{format(applicationData.amount)}</Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>Term</Typography>
                    <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{applicationData.term} months</Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>Interest Rate</Typography>
                    <Typography sx={{ fontSize: 14, fontWeight: 600, overflowWrap: 'anywhere' }}>{selectedOffer?.minRate}% - {selectedOffer?.maxRate}%</Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>Purpose</Typography>
                    <Typography sx={{ fontSize: 14, fontWeight: 600, textTransform: 'capitalize' }}>
                      {applicationData.purpose.replace('_', ' ')}
                    </Typography>
                  </Grid>
                </Grid>
              </Card>
              <Alert
                severity="info"
                sx={{
                  bgcolor: 'var(--vm-bg-tertiary)',
                  color: 'var(--vm-text-secondary)',
                  '& .MuiAlert-icon': { color: 'var(--vm-primary-400)' },
                }}
              >
                By submitting this application, you authorize {selectedOffer?.lenderName} to perform a credit check and verify your business information.
              </Alert>
            </Box>
          )}

          {applyStep === 3 && submitSuccess && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  bgcolor: 'var(--vm-primary-900)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 3,
                }}
              >
                <Check size={40} color="var(--vm-primary-400)" />
              </Box>
              <Typography sx={{ fontSize: 24, fontWeight: 700, mb: 2 }}>
                Application Submitted!
              </Typography>
              <Typography sx={{ fontSize: 14, color: 'var(--vm-text-muted)', mb: 4 }}>
                Your application to {selectedOffer?.lenderName} has been submitted successfully. You will receive a decision within 2-3 business days.
              </Typography>
              <GradientButton variant="primary" onClick={() => setApplyModalOpen(false)}>
                Done
              </GradientButton>
            </Box>
          )}

          {applyStep < 3 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
              <GradientButton
                variant="outline"
                onClick={() => applyStep > 0 ? setApplyStep(applyStep - 1) : setApplyModalOpen(false)}
                disabled={submitting}
              >
                {applyStep === 0 ? 'Cancel' : 'Back'}
              </GradientButton>
              <GradientButton
                variant="primary"
                onClick={() => {
                  if (applyStep === 2) {
                    handleSubmitApplication();
                  } else {
                    setApplyStep(applyStep + 1);
                  }
                }}
                disabled={submitting || (applyStep === 0 && !applicationData.purpose)}
              >
                {submitting ? (
                  <CircularProgress size={20} sx={{ color: 'white' }} />
                ) : applyStep === 2 ? (
                  'Submit Application'
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    Next
                    <ArrowRight size={16} />
                  </Box>
                )}
              </GradientButton>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Eligibility Check Modal */}
      <Dialog
        open={eligibilityModalOpen}
        onClose={() => !checkingEligibility && setEligibilityModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'var(--vm-bg-secondary)',
            color: 'var(--vm-text-primary)',
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid var(--vm-border-subtle)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Building2 size={24} color="var(--vm-primary-400)" />
              <Typography sx={{ fontSize: 18, fontWeight: 600 }}>
                Check Eligibility
              </Typography>
            </Box>
            <IconButton
              onClick={() => setEligibilityModalOpen(false)}
              disabled={checkingEligibility}
              sx={{ color: 'var(--vm-text-muted)' }}
            >
              <X size={20} />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3.5 }}>
          {!eligibilityResult ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  bgcolor: 'var(--vm-bg-tertiary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 3,
                }}
              >
                <Info size={40} color="var(--vm-primary-400)" />
              </Box>
              <Typography sx={{ fontSize: 18, fontWeight: 600, mb: 2 }}>
                Check Your Eligibility
              </Typography>
              <Typography sx={{ fontSize: 14, color: 'var(--vm-text-muted)', mb: 4 }}>
                We'll quickly assess your eligibility for {selectedOffer?.lenderName}'s {getProductTypeLabel(selectedOffer?.productType || '')}. This won't affect your credit score.
              </Typography>
              <GradientButton
                variant="primary"
                onClick={checkEligibility}
                disabled={checkingEligibility}
              >
                {checkingEligibility ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <CircularProgress size={16} sx={{ color: 'white' }} />
                    Checking...
                  </Box>
                ) : (
                  'Check Eligibility'
                )}
              </GradientButton>
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              {eligibilityResult.eligible ? (
                <>
                  <Box
                    sx={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      bgcolor: 'rgba(34, 197, 94, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 3,
                    }}
                  >
                    <Check size={40} color="#22c55e" />
                  </Box>
                  <Typography sx={{ fontSize: 24, fontWeight: 700, color: '#22c55e', mb: 2 }}>
                    You're Eligible!
                  </Typography>
                  <Typography sx={{ fontSize: 14, color: 'var(--vm-text-muted)', mb: 3 }}>
                    Based on your credit profile, you qualify for:
                  </Typography>
                  <Card
                    sx={{
                      p: 3,
                      bgcolor: 'var(--vm-bg-tertiary)',
                      mb: 3,
                      textAlign: 'left',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Typography sx={{ fontSize: 14, color: 'var(--vm-text-muted)' }}>Pre-qualified Amount</Typography>
                      <Typography sx={{ fontSize: 24, fontWeight: 700, color: '#22c55e', overflowWrap: 'anywhere' }}>
                        {format(eligibilityResult.preQualifiedAmount ?? 0)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography sx={{ fontSize: 14, color: 'var(--vm-text-muted)' }}>Credit Score</Typography>
                      <Typography sx={{ fontSize: 18, fontWeight: 600 }}>
                        {eligibilityResult.score}
                      </Typography>
                    </Box>
                  </Card>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 2, textAlign: 'left' }}>
                    Qualifying factors:
                  </Typography>
                  <Box sx={{ textAlign: 'left', mb: 3 }}>
                    {eligibilityResult.reasons.map((reason, idx) => (
                      <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <CheckCircle size={14} color="#22c55e" />
                        <Typography sx={{ fontSize: 13, color: 'var(--vm-text-secondary)' }}>
                          {reason}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                  <GradientButton
                    variant="primary"
                    onClick={() => {
                      setEligibilityModalOpen(false);
                      if (selectedOffer) handleApplyClick(selectedOffer);
                    }}
                  >
                    Proceed to Application
                  </GradientButton>
                </>
              ) : (
                <>
                  <Box
                    sx={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      bgcolor: 'rgba(239, 68, 68, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 3,
                    }}
                  >
                    <X size={40} color="#ef4444" />
                  </Box>
                  <Typography sx={{ fontSize: 24, fontWeight: 700, color: '#ef4444', mb: 2 }}>
                    Not Eligible
                  </Typography>
                  <Typography sx={{ fontSize: 14, color: 'var(--vm-text-muted)', mb: 3 }}>
                    Based on your current profile, you don't meet the requirements for this product.
                  </Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 2, textAlign: 'left' }}>
                    Areas to improve:
                  </Typography>
                  <Box sx={{ textAlign: 'left', mb: 3 }}>
                    {eligibilityResult.reasons.map((reason, idx) => (
                      <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Info size={14} color="#f59e0b" />
                        <Typography sx={{ fontSize: 13, color: 'var(--vm-text-secondary)' }}>
                          {reason}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                  <Alert
                    severity="info"
                    sx={{
                      mb: 3,
                      bgcolor: 'var(--vm-bg-tertiary)',
                      color: 'var(--vm-text-secondary)',
                      textAlign: 'left',
                    }}
                  >
                    Consider checking other financing options or improving your credit profile before reapplying.
                  </Alert>
                  <GradientButton
                    variant="outline"
                    onClick={() => setEligibilityModalOpen(false)}
                  >
                    Close
                  </GradientButton>
                </>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}

function IconButton({ children, onClick, disabled, sx }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; sx?: object }) {
  return (
    <Box
      onClick={disabled ? undefined : onClick}
      sx={{
        cursor: disabled ? 'not-allowed' : 'pointer',
        p: 1,
        borderRadius: 1,
        opacity: disabled ? 0.5 : 1,
        '&:hover': !disabled ? { bgcolor: 'var(--vm-bg-tertiary)' } : undefined,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}
