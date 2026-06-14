import { useState, useEffect } from 'react';
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
} from '@mui/material';
import { GradientButton } from '../../components/shared/buttons';
import { graphqlRequest } from '../../lib/api';
import { useBusiness } from '../../contexts/BusinessContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import {
  TrendingUp,
  TrendingDown,
  Landmark,
  CheckCircle,
  FileText,
  Upload,
  ArrowRight,
  Check,
  X,
  Info,
  Building2,
  // DollarSign, Calendar, Percent removed
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
  id: string; lender_name: string; product_type: 'loan' | 'line_of_credit' | 'equipment_financing' | 'invoice_factoring';
  min_amount: number; max_amount: number; min_rate: number; max_rate: number; term_months: number;
  requirements: string[]; pre_qualified: boolean; expires_at: string;
}

const CREDIT_SCORE_QUERY = `
  query BusinessScore($businessId: ID!, $scoreType: String!) {
    businessScore(businessId: $businessId, scoreType: $scoreType) {
      id, businessId, scoreType, scoreData, calculatedAt
    }
  }
`;

const creditHistory = [
  { id: 'ch_001', score: 68, calculated_at: new Date(Date.now() - 30 * 86400000).toISOString() },
  { id: 'ch_002', score: 65, calculated_at: new Date(Date.now() - 60 * 86400000).toISOString() },
  { id: 'ch_003', score: 70, calculated_at: new Date(Date.now() - 90 * 86400000).toISOString() },
  { id: 'ch_004', score: 72, calculated_at: new Date(Date.now() - 120 * 86400000).toISOString() },
  { id: 'ch_005', score: 68, calculated_at: new Date(Date.now() - 150 * 86400000).toISOString() },
];

const financingOffers: FinancingOffer[] = [
  { id: 'fo_001', lender_name: 'Stripe Capital', product_type: 'loan', min_amount: 5000, max_amount: 250000, min_rate: 6.5, max_rate: 15.0, term_months: 12, requirements: ['6 months revenue history', '$10k+ monthly revenue'], pre_qualified: true, expires_at: new Date(Date.now() + 30 * 86400000).toISOString() },
  { id: 'fo_002', lender_name: 'Brex', product_type: 'line_of_credit', min_amount: 10000, max_amount: 1000000, min_rate: 7.0, max_rate: 18.0, term_months: 6, requirements: ['Incorporated business', '$50k+ monthly revenue'], pre_qualified: true, expires_at: new Date(Date.now() + 45 * 86400000).toISOString() },
  { id: 'fo_003', lender_name: 'Silicon Valley Bank', product_type: 'loan', min_amount: 50000, max_amount: 5000000, min_rate: 8.0, max_rate: 20.0, term_months: 60, requirements: ['2+ years in business', '$1M+ annual revenue', 'Strong credit history'], pre_qualified: false, expires_at: new Date(Date.now() + 60 * 86400000).toISOString() },
];

interface FinancingApplication {
  id: string; offer_id: string; lender_name: string; product_type: string; amount: number; term: number; status: string; submitted_at: string; decision_date?: string;
}

const financingApplications: FinancingApplication[] = [
  { id: 'fa_001', offer_id: 'fo_001', lender_name: 'Stripe Capital', product_type: 'loan', amount: 50000, term: 12, status: 'pending', submitted_at: new Date(Date.now() - 5 * 86400000).toISOString() },
  { id: 'fa_002', offer_id: 'fo_002', lender_name: 'Brex', product_type: 'line_of_credit', amount: 25000, term: 6, status: 'approved', submitted_at: new Date(Date.now() - 30 * 86400000).toISOString(), decision_date: new Date(Date.now() - 25 * 86400000).toISOString() },
];

interface CreditScoreProps {
   
  onViewChange?: (_view: ViewType) => void;
}

interface ApplicationData {
  amount: number;
  term: number;
  purpose: string;
  documents: string[];
}

export function CreditScorePage({ onViewChange: _onViewChange }: CreditScoreProps) {
  const { selectedBusiness } = useBusiness();
  const { format } = useCurrency();
  const [creditScore, setCreditScore] = useState({
    score: 72, max_score: 100, grade: 'Good', risk_level: 'moderate',
    calculated_at: new Date().toISOString(),
    factors: { positive: [] as string[], negative: [] as string[] },
    components: { payment_history: 0, credit_utilization: 0, business_age: 0, revenue_stability: 0, debt_ratio: 0 },
  });
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (!selectedBusiness?.id) return;
    let cancelled = false;
    graphqlRequest<{ businessScore: { scoreData: string } | null }>(CREDIT_SCORE_QUERY, {
      businessId: selectedBusiness.id, scoreType: 'credit',
    }).then(data => {
      const score = data.businessScore;
      if (!cancelled && score) {
        setCreditScore(prev => ({ ...prev, ...JSON.parse(score.scoreData) }));
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [selectedBusiness?.id]);
  
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
      amount: offer.min_amount,
      term: offer.term_months,
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

  const checkEligibility = () => {
    setCheckingEligibility(true);
    // Simulate API call
    setTimeout(() => {
      setCheckingEligibility(false);
      // Random eligibility result for demo
      const isEligible = Math.random() > 0.3;
      setEligibilityResult({
        eligible: isEligible,
        score: Math.floor(Math.random() * 100) + 650,
        reasons: isEligible
          ? ['Strong credit history', 'Consistent revenue', 'Low debt ratio']
          : ['Insufficient business history', 'Revenue below threshold'],
        preQualifiedAmount: isEligible
          ? Math.floor(Math.random() * 200000) + 50000
          : undefined,
      });
    }, 2000);
  };

  const handleSubmitApplication = () => {
    setSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setSubmitting(false);
      setSubmitSuccess(true);
      setApplyStep(3);
    }, 2000);
  };

  const applySteps = ['Loan Details', 'Documents', 'Review', 'Confirmation'];

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
        <GradientButton variant="primary" size="md">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUp size={18} />
            Refresh Score
          </Box>
        </GradientButton>
      </Box>

      {/* Score Card */}
      <Card
        sx={{
          bgcolor: 'var(--vm-bg-secondary)',
          border: '1px solid var(--vm-border-subtle)',
          borderRadius: 3,
          p: 4,
          mb: 4,
          background: `linear-gradient(135deg, ${getScoreColor(creditScore.score)}20 0%, var(--vm-bg-tertiary) 100%)`,
          borderColor: getScoreColor(creditScore.score),
        }}
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: { xs: 3, md: 6 }, alignItems: 'center' }}>
          {/* Score */}
<Box sx={{ textAlign: 'center' }}>
           <Typography sx={{ fontSize: { xs: 12, sm: 14 }, color: 'var(--vm-text-muted)', mb: 1 }}>
             Business Credit Score
           </Typography>
           <Typography
             sx={{
               fontSize: { xs: 36, sm: 48, md: 72 },
               fontWeight: 700,
               color: getScoreColor(creditScore.score),
               lineHeight: 1,
             }}
           >
             {creditScore.score}
           </Typography>
           <Typography sx={{ fontSize: { xs: 12, sm: 14 } }}>
             of {creditScore.max_score}
           </Typography>
         </Box>

          {/* Grade */}
          <Box sx={{ textAlign: 'center' }}>
            <Typography sx={{ fontSize: 14, color: 'var(--vm-text-muted)', mb: 1 }}>
              Grade
            </Typography>
            <Typography
              sx={{
                fontSize: { xs: 40, md: 64 },
                fontWeight: 700,
                color: getScoreColor(creditScore.score),
                lineHeight: 1,
              }}
            >
              {getScoreGrade(creditScore.score)}
            </Typography>
            <Chip
              size="small"
              label={getRiskLabel(creditScore.risk_level).label}
              sx={{
                bgcolor: `${getRiskLabel(creditScore.risk_level).color}20`,
                color: getRiskLabel(creditScore.risk_level).color,
                fontSize: 12,
                fontWeight: 600,
                mt: 1,
              }}
            />
          </Box>

          {/* Factors */}
          <Box>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 2 }}>
              Key Factors
            </Typography>
            {creditScore.factors.positive.slice(0, 2).map((factor, idx) => (
              <Box key={idx} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                <CheckCircle size={14} color="#22c55e" style={{ marginTop: 3 }} />
                <Typography sx={{ fontSize: 12, color: 'var(--vm-text-secondary)' }}>
                  {factor}
                </Typography>
              </Box>
            ))}
            {creditScore.factors.negative.slice(0, 1).map((factor, idx) => (
              <Box key={idx} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <TrendingDown size={14} color="#ef4444" style={{ marginTop: 3 }} />
                <Typography sx={{ fontSize: 12, color: 'var(--vm-text-secondary)' }}>
                  {factor}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Score Components */}
        <Box sx={{ mt: 4 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 2 }}>
            Score Components
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' }, gap: { xs: 2, md: 3 } }}>
            {Object.entries(creditScore.components).map(([key, value]) => (
              <Box key={key}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)', textTransform: 'capitalize' }}>
                    {key.replace('_', ' ')}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: 'var(--vm-text-primary)' }}>
                    {value}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={value}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    bgcolor: 'var(--vm-bg-tertiary)',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: getScoreColor(value * 8.5),
                      borderRadius: 3,
                    },
                  }}
                />
              </Box>
            ))}
          </Box>
        </Box>
      </Card>

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
        <Tab label="Financing Offers" />
        <Tab label="Applications" />
        <Tab label="History" />
      </Tabs>

      {/* Financing Offers */}
      {activeTab === 0 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: { xs: 2, md: 3 } }}>
          {financingOffers.map((offer) => (
            <Card
              key={offer.id}
              sx={{
                bgcolor: 'var(--vm-bg-secondary)',
                border: offer.pre_qualified ? '2px solid var(--vm-primary-600)' : '1px solid var(--vm-border-subtle)',
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
                    <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'var(--vm-text-primary)' }}>
                      {offer.lender_name}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>
                      {getProductTypeLabel(offer.product_type)}
                    </Typography>
                  </Box>
                </Box>
                {offer.pre_qualified && (
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
                  <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'var(--vm-text-primary)' }}>
                    {format(offer.min_amount)} - {format(offer.max_amount)}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>Rate</Typography>
                  <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'var(--vm-text-primary)' }}>
                    {offer.min_rate}% - {offer.max_rate}%
                  </Typography>
                </Box>
              </div>

              <Box sx={{ mb: 2 }}>
                <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)', mb: 1 }}>Requirements</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {offer.requirements.map((req, idx) => (
                    <Chip
                      key={idx}
                      size="small"
                      label={req}
                      sx={{
                        bgcolor: 'var(--vm-bg-tertiary)',
                        color: 'var(--vm-text-muted)',
                        fontSize: 10,
                      }}
                    />
                  ))}
                </Box>
              </Box>

              <GradientButton
                fullWidth
                variant={offer.pre_qualified ? 'primary' : 'outline'}
                size="md"
                onClick={() =>
                  offer.pre_qualified ? handleApplyClick(offer) : handleCheckEligibilityClick(offer)
                }
              >
                {offer.pre_qualified ? 'Apply Now' : 'Check Eligibility'}
              </GradientButton>
            </Card>
          ))}
        </Box>
      )}

      {/* Applications */}
      {activeTab === 1 && (
        <Card
          sx={{
            bgcolor: 'var(--vm-bg-secondary)',
            border: '1px solid var(--vm-border-subtle)',
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          {financingApplications.map((app, idx) => (
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
                  {getProductTypeLabel(app.product_type)} • ${app.amount.toLocaleString()}
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
                    {new Date(app.submitted_at).toLocaleDateString()}
                  </Typography>
                )}
              </Box>
            </Box>
          ))}
        </Card>
      )}

      {/* History */}
      {activeTab === 2 && (
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
            Score History (Last 6 Months)
          </Typography>
          {creditHistory.map((item, idx) => (
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
                {new Date(item.calculated_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <LinearProgress
                  variant="determinate"
                  value={(item.score / 850) * 100}
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
          ))}
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
                  Apply for {getProductTypeLabel(selectedOffer?.product_type || '')}
                </Typography>
                <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)' }}>
                  {selectedOffer?.lender_name}
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
        <DialogContent sx={{ pt: 3 }}>
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
<Typography sx={{ fontSize: { xs: 12, sm: 14 }, color: 'var(--vm-text-muted)', mb: 1 }}>
              Loan Amount: ${applicationData.amount.toLocaleString()}
            </Typography>
                  <Slider
                    value={applicationData.amount}
                    onChange={(_, v) => setApplicationData({ ...applicationData, amount: v as number })}
                    min={selectedOffer?.min_amount || 10000}
                    max={selectedOffer?.max_amount || 500000}
                    step={5000}
                    sx={{
                      color: 'var(--vm-primary-600)',
                      '& .MuiSlider-thumb': { bgcolor: 'var(--vm-primary-400)' },
                    }}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--vm-text-muted)' }}>
                    <span>${selectedOffer?.min_amount.toLocaleString()}</span>
                    <span>${selectedOffer?.max_amount.toLocaleString()}</span>
                  </Box>
                </Grid>
                <Grid size={6}>
                  <TextField
                    fullWidth
                    label="Loan Term (months)"
                    type="number"
                    value={applicationData.term}
                    onChange={(e) => setApplicationData({ ...applicationData, term: parseInt(e.target.value) })}
                    sx={{
                      '& .MuiInputLabel-root': { color: 'var(--vm-text-muted)' },
                      '& .MuiInputLabel-root.Mui-focused': { color: 'var(--vm-primary-400)' },
                      '& .MuiOutlinedInput-root': {
                        color: 'var(--vm-text-primary)',
                        '& fieldset': { borderColor: 'var(--vm-border-subtle)' },
                        '&:hover fieldset': { borderColor: 'var(--vm-primary-600)' },
                        '&.Mui-focused fieldset': { borderColor: 'var(--vm-primary-600)' },
                      },
                    }}
                  />
                </Grid>
                <Grid size={6}>
                  <TextField
                    fullWidth
                    label="Purpose of Loan"
                    select
                    SelectProps={{ native: true }}
                    value={applicationData.purpose}
                    onChange={(e) => setApplicationData({ ...applicationData, purpose: e.target.value })}
                    sx={{
                      '& .MuiInputLabel-root': { color: 'var(--vm-text-muted)' },
                      '& .MuiInputLabel-root.Mui-focused': { color: 'var(--vm-primary-400)' },
                      '& .MuiOutlinedInput-root': {
                        color: 'var(--vm-text-primary)',
                        '& fieldset': { borderColor: 'var(--vm-border-subtle)' },
                        '&:hover fieldset': { borderColor: 'var(--vm-primary-600)' },
                        '&.Mui-focused fieldset': { borderColor: 'var(--vm-primary-600)' },
                      },
                    }}
                  >
                    <option value="">Select purpose...</option>
                    <option value="expansion">Business Expansion</option>
                    <option value="equipment">Equipment Purchase</option>
                    <option value="inventory">Inventory</option>
                    <option value="working_capital">Working Capital</option>
                    <option value="refinancing">Refinancing</option>
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
                    <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{selectedOffer?.lender_name}</Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>Product</Typography>
                    <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{getProductTypeLabel(selectedOffer?.product_type || '')}</Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>Amount</Typography>
                    <Typography sx={{ fontSize: 14, fontWeight: 600 }}>${applicationData.amount.toLocaleString()}</Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>Term</Typography>
                    <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{applicationData.term} months</Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>Interest Rate</Typography>
                    <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{selectedOffer?.min_rate}% - {selectedOffer?.max_rate}%</Typography>
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
                By submitting this application, you authorize {selectedOffer?.lender_name} to perform a credit check and verify your business information.
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
                Your application to {selectedOffer?.lender_name} has been submitted successfully. You will receive a decision within 2-3 business days.
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
        <DialogContent sx={{ pt: 3 }}>
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
                We'll quickly assess your eligibility for {selectedOffer?.lender_name}'s {getProductTypeLabel(selectedOffer?.product_type || '')}. This won't affect your credit score.
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
                      <Typography sx={{ fontSize: 24, fontWeight: 700, color: '#22c55e' }}>
                        ${eligibilityResult.preQualifiedAmount?.toLocaleString()}
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

// IconButton component for the modals
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
