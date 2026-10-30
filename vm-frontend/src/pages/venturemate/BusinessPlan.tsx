import { useState } from 'react';
import { Box, Card, Chip, Typography, ToggleButtonGroup, ToggleButton, IconButton } from '@mui/material';
import { BookOpen, Building2, FileText, LayoutGrid, Monitor, ChevronDown, ChevronUp, TrendingUp, Users, DollarSign, Target, CheckCircle, Lightbulb } from 'lucide-react';
import { AICreationStudio, type ProposedChange } from '../../components/venturemate/AICreationStudio';
import { PlanViewer } from '../../components/venturemate/PlanViewer';
import { NoBusinessSelected } from '../../components/venturemate/NoBusinessSelected';
import { useBusiness } from '../../contexts/BusinessContext';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { useToast } from '../../components/shared/toast';
import { PageHeader, GlassCard } from '../../components/shared';
import type { BusinessPlan as BusinessPlanType, PlanSection } from '../../types/venturemate';

function parsePlan(change: ProposedChange): BusinessPlanType | null {
  try { return JSON.parse(change.newValue) as BusinessPlanType; } catch { return null; }
}

const SECTION_ICONS: Record<string, any> = {
  cover: BookOpen, 'executive-summary': TrendingUp, 'company-summary': Building2,
  'market-opportunity': TrendingUp, 'target-audience': Users, 'products-services': Lightbulb,
  'marketing-sales': Target, 'financial-plan': DollarSign, 'goal-planning': CheckCircle, appendix: FileText,
};

const SECTION_COLORS: Record<string, string> = {
  cover: '#6366f1', 'executive-summary': '#10b981', 'company-summary': '#3b82f6',
  'market-opportunity': '#f59e0b', 'target-audience': '#ec4899', 'products-services': '#8b5cf6',
  'marketing-sales': '#06b6d4', 'financial-plan': '#ef4444', 'goal-planning': '#22c55e', appendix: '#64748b',
};

function SectionCard({ section, index, accent }: { section: PlanSection; index: number; accent: string }) {
  const [expanded, setExpanded] = useState(false);
  const sectionId = section.id || '';
  const Icon = SECTION_ICONS[sectionId] || FileText;
  const sectionColor = SECTION_COLORS[sectionId] || accent;

  return (
    <Card sx={{
      bgcolor: 'rgba(255,255,255,.02)', border: '1px solid var(--vm-border-subtle)', borderRadius: '14px', overflow: 'hidden',
      transition: 'border-color .2s, box-shadow .2s',
      '&:hover': { borderColor: `${sectionColor}55`, boxShadow: '0 6px 24px rgba(0,0,0,.28)' },
    }}>
      <Box sx={{ px: 2, py: 1.75, display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace', color: 'var(--vm-text-muted)', minWidth: 22 }}>
          {String(index + 1).padStart(2, '0')}
        </Typography>
        <Box sx={{ flexShrink: 0, width: 34, height: 34, borderRadius: '10px', display: 'grid', placeItems: 'center', bgcolor: `${sectionColor}1c`, color: sectionColor, border: `1px solid ${sectionColor}30` }}>
          <Icon size={16} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ color: 'var(--vm-text-primary)', fontSize: 14, fontWeight: 750 }}>{section.title}</Typography>
          {!expanded && section.content && (
            <Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 11.5, mt: 0.25, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>{section.content}</Typography>
          )}
        </Box>
        <IconButton size="small" sx={{ color: 'var(--vm-text-muted)', bgcolor: 'rgba(255,255,255,.03)', border: '1px solid var(--vm-border-subtle)', '&:hover': { bgcolor: 'rgba(255,255,255,.07)' } }}>
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </IconButton>
      </Box>
      {expanded && (
        <Box sx={{ px: 2.25, pb: 2.25, pt: 0.25 }}>
          <Box sx={{ height: 1, bgcolor: 'var(--vm-border-subtle)', mb: 2 }} />
          <Typography sx={{ color: 'var(--vm-text-secondary)', fontSize: 13.5, lineHeight: 1.9, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{section.content}</Typography>
          {section.subsections?.map((sub, si) => (
            <Box key={si} sx={{ mt: 1.5, p: 2, borderRadius: '12px', bgcolor: 'rgba(255,255,255,.03)', border: '1px solid var(--vm-border-subtle)', borderLeft: `2px solid ${sectionColor}` }}>
              <Typography sx={{ color: sectionColor, fontSize: 12.5, fontWeight: 700, mb: 0.5 }}>{sub.title}</Typography>
              <Typography sx={{ color: 'var(--vm-text-secondary)', fontSize: 12.5, lineHeight: 1.75 }}>{sub.content}</Typography>
            </Box>
          ))}
        </Box>
      )}
    </Card>
  );
}

function PlanPreview({ plan, primary, proposed = false }: { plan: BusinessPlanType; primary?: string; proposed?: boolean }) {
  const sections = plan.sections || [];
  const accent = primary || '#10b981';
  return (
    <Box>
      <GlassCard sx={{ p: { xs: 2.5, sm: 3.5 }, borderRadius: '16px', border: proposed ? `1px solid ${accent}45` : '1px solid var(--vm-border-subtle)' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap' }}>
          <Box>
            <Typography sx={{ color: 'var(--vm-text-primary)', fontSize: { xs: 22, sm: 26 }, fontWeight: 850, letterSpacing: '-0.02em' }}>{plan.title || 'Business Plan'}</Typography>
            <Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 11.5, mt: 0.75, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box component="span" sx={{ px: 1, py: 0.25, borderRadius: 99, bgcolor: 'rgba(255,255,255,.05)', border: '1px solid var(--vm-border-subtle)', fontSize: 10, fontWeight: 700 }}>v{plan.version || '1.0'}</Box>
              {sections.length} sections
            </Typography>
          </Box>
          <Chip icon={<FileText size={13} />} label={proposed ? 'Review' : 'Approved'} size="small" color={proposed ? 'warning' : 'success'} variant="outlined" />
        </Box>
        {plan.executiveSummary && (
          <Box sx={{ mt: 2.5, p: 2.25, borderRadius: '12px', bgcolor: `${accent}0a`, border: `1px solid ${accent}22` }}>
            <Typography sx={{ color: accent, fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <TrendingUp size={13} /> Executive Summary
            </Typography>
            <Typography sx={{ color: 'var(--vm-text-secondary)', fontSize: 13.5, lineHeight: 1.85, mt: 1.25, whiteSpace: 'pre-wrap' }}>{plan.executiveSummary}</Typography>
          </Box>
        )}
      </GlassCard>
      <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        {sections.map((section, index) => (
          <SectionCard key={section.id || `${section.title}-${index}`} section={section} index={index} accent={accent} />
        ))}
        {!sections.length && <Typography sx={{ color: 'var(--vm-text-muted)', py: 4, textAlign: 'center' }}>No sections yet.</Typography>}
      </Box>
    </Box>
  );
}

export function BusinessPlan() {
  const { selectedBusiness, businesses } = useBusiness();
  const { subscription } = useSubscription();
  const toast = useToast();
  const [viewMode, setViewMode] = useState<'grid' | 'slide'>('slide');
  if (!selectedBusiness) return <NoBusinessSelected message="Select a business to generate its business plan with AI." />;

  const maxBusinessPlans = subscription?.plan?.limits?.maxBusinessPlans;
  const businessPlanCount = businesses.filter(b => b.businessPlan?.sections?.length || b.businessPlan?.executiveSummary).length;
  const limitReached = maxBusinessPlans !== -1 && businessPlanCount >= (maxBusinessPlans ?? Infinity);

  const handleBeforeGenerate = () => {
    if (limitReached) {
      toast.warning('Upgrade required', {
        description: `You've reached the maximum of ${maxBusinessPlans} business plans on your ${subscription?.plan?.displayName || subscription?.plan?.name || 'current'} plan. Upgrade to add more.`,
      });
      return false;
    }
    return true;
  };

  const plan = selectedBusiness.businessPlan;
  const brand = selectedBusiness.brandKit;
  const hasPlan = Boolean(plan?.sections?.length || plan?.executiveSummary);
  const primary = brand?.primaryColor || '#10b981';

  return (
    <Box sx={{ p: { xs: 1.25, sm: 2, md: 3 } }}>
      <PageHeader
        icon={<BookOpen size={18} />}
        title="Business Plan"
        subtitle="AI-generated investor-ready plan with 10 specialised sections"
        businessName={selectedBusiness.name}
        actions={hasPlan ? (
          <ToggleButtonGroup size="small" value={viewMode} onChange={(_, v) => v && setViewMode(v)} exclusive sx={{ '& .MuiToggleButton-root': { color: 'var(--vm-text-muted)', borderColor: 'var(--vm-border-subtle)', '&.Mui-selected': { color: 'var(--vm-primary-400)', bgcolor: 'rgba(16,185,129,.1)' } } }}>
            <ToggleButton value="grid"><LayoutGrid size={14} /></ToggleButton>
            <ToggleButton value="slide"><Monitor size={14} /></ToggleButton>
          </ToggleButtonGroup>
        ) : undefined}
      />

      <AICreationStudio
        domain="business-plan" title="" description=""
        builderMode
        placeholder="Generate a complete investor-ready business plan from my business details."
        starterPrompts={[
          'Generate a complete business plan from everything known about my business.',
          'Rewrite the executive summary to be clearer and more convincing.',
          'Add a detailed go-to-market section without inventing customer numbers.',
          'Make the plan more realistic for a Ghanaian startup at my current stage.',
        ]}
        emptyLabel="No approved business plan exists. Ask AI to generate the first complete version."
        onBeforeGenerate={handleBeforeGenerate}
        renderCurrent={() => {
          if (!hasPlan) return null;
          if (viewMode === 'slide') return <PlanViewer title={plan.title || 'Business Plan'} summary={plan.executiveSummary || ''} sections={plan.sections || []} version={plan.version || '1.0'} logo={brand?.logo || brand?.logoWhite} businessName={selectedBusiness.name} />;
          return <PlanPreview plan={plan} primary={primary} />;
        }}
        renderProposal={(change: ProposedChange) => {
          const proposed = parsePlan(change);
          if (!proposed) return <Typography color="error">The AI returned an invalid business-plan preview.</Typography>;
          if (viewMode === 'slide') return <PlanViewer title={proposed.title || 'Business Plan'} summary={proposed.executiveSummary || ''} sections={proposed.sections || []} version={proposed.version || '1.0'} logo={brand?.logo || brand?.logoWhite} businessName={selectedBusiness.name} />;
          return <PlanPreview plan={proposed} primary={primary} proposed />;
        }}
      />
    </Box>
  );
}
