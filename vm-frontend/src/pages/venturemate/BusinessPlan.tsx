import { useState } from 'react';
import { Box, Card, Chip, Typography, ToggleButtonGroup, ToggleButton, IconButton } from '@mui/material';
import { BookOpen, Building2, FileText, Sparkles, LayoutGrid, Monitor, ChevronDown, ChevronUp, TrendingUp, Users, DollarSign, Target, CheckCircle, Lightbulb } from 'lucide-react';
import { AICreationStudio, type ProposedChange } from '../../components/venturemate/AICreationStudio';
import { PlanViewer } from '../../components/venturemate/PlanViewer';
import { NoBusinessSelected } from '../../components/venturemate/NoBusinessSelected';
import { useBusiness } from '../../contexts/BusinessContext';
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
  const [expanded, setExpanded] = useState(true);
  const sectionId = section.id || '';
  const Icon = SECTION_ICONS[sectionId] || FileText;
  const sectionColor = SECTION_COLORS[sectionId] || accent;

  return (
    <Card sx={{
      bgcolor: 'var(--vm-bg-tertiary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 2.5, overflow: 'hidden',
      borderLeft: `3px solid ${sectionColor}`,
    }}>
      <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.25, cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
        <Box sx={{ flexShrink: 0, width: 32, height: 32, borderRadius: 1.5, display: 'grid', placeItems: 'center', bgcolor: `${sectionColor}20`, color: sectionColor }}>
          <Icon size={16} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ color: 'var(--vm-text-primary)', fontSize: 14, fontWeight: 800 }}>{section.title}</Typography>
          <Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 10 }}>Section {index + 1}</Typography>
        </Box>
        <IconButton size="small" sx={{ color: 'var(--vm-text-muted)' }}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </IconButton>
      </Box>
      {expanded && (
        <Box sx={{ px: 2, pb: 2 }}>
          <Box sx={{ height: 1, bgcolor: 'var(--vm-border-subtle)', mb: 1.5 }} />
          <Typography sx={{ color: 'var(--vm-text-secondary)', fontSize: 13, lineHeight: 1.85, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{section.content}</Typography>
          {section.subsections && section.subsections.map((sub, si) => (
            <Box key={si} sx={{ mt: 1.5, p: 1.5, borderRadius: 2, bgcolor: 'rgba(255,255,255,.03)', border: `1px solid ${sectionColor}15` }}>
              <Typography sx={{ color: sectionColor, fontSize: 12, fontWeight: 700, mb: 0.5 }}>{sub.title}</Typography>
              <Typography sx={{ color: 'var(--vm-text-secondary)', fontSize: 12, lineHeight: 1.7 }}>{sub.content}</Typography>
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
      <Box sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 2.5, bgcolor: 'var(--vm-bg-tertiary)', border: proposed ? `1px solid ${accent}40` : '1px solid var(--vm-border-subtle)' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
          <Box>
            <Typography sx={{ color: 'var(--vm-text-primary)', fontSize: { xs: 20, sm: 26 }, fontWeight: 900 }}>{plan.title || 'Business Plan'}</Typography>
            <Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 11, mt: 0.5 }}>Version {plan.version || '1.0'} · {sections.length} sections</Typography>
          </Box>
          <Chip icon={<FileText size={14} />} label={proposed ? 'Awaiting approval' : 'Approved'} size="small" color={proposed ? 'warning' : 'success'} variant="outlined" />
        </Box>
        {plan.executiveSummary && (
          <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 2, bgcolor: `${accent}08`, border: `1px solid ${accent}15` }}>
            <Typography sx={{ color: `${accent}cc`, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.08em', display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <TrendingUp size={13} /> Executive Summary
            </Typography>
            <Typography sx={{ color: 'var(--vm-text-secondary)', fontSize: 13, lineHeight: 1.75, mt: 0.75, whiteSpace: 'pre-wrap' }}>{plan.executiveSummary}</Typography>
          </Box>
        )}
      </Box>
      <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        {sections.map((section, index) => (
          <SectionCard key={section.id || `${section.title}-${index}`} section={section} index={index} accent={accent} />
        ))}
        {sections.length === 0 && <Typography sx={{ color: 'var(--vm-text-muted)', py: 4, textAlign: 'center' }}>This version has no sections yet.</Typography>}
      </Box>
    </Box>
  );
}

export function BusinessPlan() {
  const { selectedBusiness } = useBusiness();
  const [viewMode, setViewMode] = useState<'grid' | 'slide'>('slide');
  if (!selectedBusiness) return <NoBusinessSelected message="Select a business to generate its business plan with AI." />;

  const plan = selectedBusiness.businessPlan;
  const brand = selectedBusiness.brandKit;
  const hasPlan = Boolean(plan?.sections?.length || plan?.executiveSummary);
  const primary = brand?.primaryColor || '#10b981';

  return (
    <Box sx={{ p: { xs: 1.25, sm: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <BookOpen size={19} color="var(--vm-primary-400)" />
        <Chip icon={<Building2 size={14} />} label={selectedBusiness.name} size="small" />
        <Chip icon={<Sparkles size={13} />} label="AI writes · You approve" size="small" color="success" variant="outlined" />
        {hasPlan && (
          <>
            <ToggleButtonGroup size="small" value={viewMode} onChange={(_, v) => v && setViewMode(v)} exclusive sx={{ ml: 'auto', '& .MuiToggleButton-root': { color: 'var(--vm-text-muted)', borderColor: 'var(--vm-border-subtle)', '&.Mui-selected': { color: 'var(--vm-primary-400)', bgcolor: 'rgba(16,185,129,.1)' } } }}>
              <ToggleButton value="grid"><LayoutGrid size={14} /></ToggleButton>
              <ToggleButton value="slide"><Monitor size={14} /></ToggleButton>
            </ToggleButtonGroup>
          </>
        )}
      </Box>

      <AICreationStudio
        domain="business-plan"
        title="AI Business Plan"
        description="The plan is generated from the approved business profile, brand, team, milestones, metrics, and financial records. Each section is written by a specialised AI agent."
        placeholder="Example: Generate a complete investor-ready business plan from my business details."
        starterPrompts={[
          'Generate a complete business plan from everything known about my business.',
          'Rewrite the executive summary to be clearer and more convincing.',
          'Add a detailed go-to-market section without inventing customer numbers.',
          'Make the plan more realistic for a Ghanaian startup at my current stage.',
        ]}
        emptyLabel="No approved business plan exists. Ask AI to generate the first complete version."
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
