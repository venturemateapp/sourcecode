import { useState } from 'react';
import { Box, Chip, Typography, ToggleButtonGroup, ToggleButton, IconButton } from '@mui/material';
import { Presentation, LayoutGrid, Monitor, ChevronDown, ChevronUp, TrendingUp, Users, DollarSign, Target, Lightbulb, Shield, Menu, Star } from 'lucide-react';
import { AICreationStudio, type ProposedChange } from '../../components/venturemate/AICreationStudio';
import { SlideViewer } from '../../components/venturemate/SlideViewer';
import { NoBusinessSelected } from '../../components/venturemate/NoBusinessSelected';
import { useBusiness } from '../../contexts/BusinessContext';
import { PageHeader, GlassCard } from '../../components/shared';
import type { PitchDeck as PitchDeckType, Slide, ViewType } from '../../types/venturemate';

function parseDeck(change: ProposedChange): PitchDeckType | null {
  try { return JSON.parse(change.newValue) as PitchDeckType; } catch { return null; }
}

const SLIDE_ICONS: Record<string, any> = {
  title: Star, cover: Star, problem: Lightbulb, solution: Target, market: TrendingUp,
  product: Menu, 'business-model': DollarSign, traction: TrendingUp, competition: Shield,
  team: Users, financials: DollarSign, ask: Target, closing: Star,
};

const SLIDE_COLORS: Record<string, string> = {
  cover: '#6366f1', title: '#6366f1', problem: '#ef4444', solution: '#10b981',
  market: '#f59e0b', product: '#8b5cf6', 'business-model': '#06b6d4', traction: '#22c55e',
  competition: '#f97316', team: '#3b82f6', financials: '#ec4899', ask: '#14b8a6',
};

function SlideCard({ slide, primary, dark }: { slide: Slide; primary: string; dark: string }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = SLIDE_ICONS[slide.type] || Presentation;
  const color = SLIDE_COLORS[slide.type] || primary;

  return (
    <GlassCard sx={{
      p: 0, overflow: 'hidden',
      background: `radial-gradient(circle at 85% 15%, ${color}66, transparent 30%), linear-gradient(135deg, ${dark}, #07130f)`,
    }}>
      <Box sx={{ p: 1.75, cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 1.25 }} onClick={() => setExpanded(!expanded)}>
        <Box sx={{ flexShrink: 0, width: 28, height: 28, borderRadius: 1.5, display: 'grid', placeItems: 'center', bgcolor: 'rgba(255,255,255,.1)' }}>
          <Icon size={14} color="white" />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Typography sx={{ color: 'white', fontSize: 14, fontWeight: 800 }}>{slide.title}</Typography>
            <Chip label={slide.type} size="small" sx={{ textTransform: 'capitalize', bgcolor: 'rgba(255,255,255,.1)', color: 'rgba(255,255,255,.7)', fontSize: 8, height: 18, ml: 'auto' }} />
          </Box>
          {slide.content && !expanded && (
            <Typography sx={{ color: 'rgba(255,255,255,.6)', fontSize: 11, mt: 0.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2 }}>{slide.content}</Typography>
          )}
        </Box>
        <IconButton size="small" sx={{ color: 'rgba(255,255,255,.4)' }}>{expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</IconButton>
      </Box>
      {expanded && (
        <Box sx={{ px: 1.75, pb: 1.75 }}>
          <Box sx={{ height: 1, bgcolor: 'rgba(255,255,255,.08)', mb: 1.5 }} />
          {slide.content && <Typography sx={{ color: 'rgba(255,255,255,.75)', fontSize: 12, lineHeight: 1.75 }}>{slide.content}</Typography>}
          {slide.bullets?.map((bullet, bi) => (
            <Typography key={bi} component="li" sx={{ color: 'rgba(255,255,255,.86)', fontSize: 11.5, mb: 0.3, ml: 2 }}>{bullet}</Typography>
          ))}
        </Box>
      )}
    </GlassCard>
  );
}

function DeckPreview({ deck, primary, dark, proposed = false }: { deck: PitchDeckType; primary: string; dark: string; proposed?: boolean }) {
  const slides = deck.slides || [];
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
        <Box>
          <Typography sx={{ color: 'var(--vm-text-primary)', fontSize: 20, fontWeight: 900 }}>{deck.title || 'Pitch Deck'}</Typography>
          <Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 11 }}>{slides.length} slides</Typography>
        </Box>
        <Chip label={proposed ? 'Review' : 'Approved'} size="small" color={proposed ? 'warning' : 'success'} variant="outlined" />
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {slides.map((slide, index) => <SlideCard key={slide.id || index} slide={slide} primary={primary} dark={dark} />)}
      </Box>
    </Box>
  );
}

export function PitchDeck(_props: { onViewChange?: (_view: ViewType) => void }) {
  const { selectedBusiness } = useBusiness();
  const [viewMode, setViewMode] = useState<'grid' | 'slide'>('slide');
  if (!selectedBusiness) return <NoBusinessSelected message="Select a business to generate its pitch deck with AI." />;

  const deck = selectedBusiness.pitchDeck;
  const brand = selectedBusiness.brandKit;
  const hasDeck = Boolean(deck?.slides?.length);
  const primary = brand?.primaryColor || '#10b981';
  const dark = brand?.darkColor || '#052e24';
  const currentDeck = deck;

  return (
    <Box sx={{ p: { xs: 1.25, sm: 2, md: 3 } }}>
      <PageHeader
        icon={<Presentation size={18} />}
        title="Pitch Deck"
        subtitle="AI-crafted investor story with 11 specialised slides"
        businessName={selectedBusiness.name}
        actions={hasDeck ? (
          <ToggleButtonGroup size="small" value={viewMode} onChange={(_, v) => v && setViewMode(v)} exclusive sx={{ '& .MuiToggleButton-root': { color: 'var(--vm-text-muted)', borderColor: 'var(--vm-border-subtle)', '&.Mui-selected': { color: 'var(--vm-primary-400)', bgcolor: 'rgba(16,185,129,.1)' } } }}>
            <ToggleButton value="grid"><LayoutGrid size={14} /></ToggleButton>
            <ToggleButton value="slide"><Monitor size={14} /></ToggleButton>
          </ToggleButtonGroup>
        ) : undefined}
      />

      {viewMode === 'slide' && hasDeck && (
        <GlassCard sx={{ p: { xs: 1.5, sm: 2 }, mb: 2 }}>
          <SlideViewer slides={currentDeck.slides} title={currentDeck.title || 'Pitch Deck'} primary={primary} logo={brand?.logo || brand?.logoWhite} businessName={selectedBusiness.name} />
        </GlassCard>
      )}

      <AICreationStudio
        domain="pitch-deck" title="" description=""
        placeholder="Generate an investor-ready pitch deck from my approved business information."
        starterPrompts={[
          'Generate an investor-ready pitch deck from my business and business plan.',
          'Create a shorter 8-slide version for a first investor meeting.',
          'Make the problem and solution slides more compelling without inventing facts.',
          'Rewrite the funding ask so assumptions and use of funds are clear.',
        ]}
        emptyLabel="No approved pitch deck exists. Ask AI to create the first investor story."
        renderCurrent={() => {
          if (viewMode === 'slide' && hasDeck) return <SlideViewer slides={currentDeck.slides} title={currentDeck.title || 'Pitch Deck'} primary={primary} logo={brand?.logo || brand?.logoWhite} businessName={selectedBusiness.name} />;
          if (hasDeck) return <DeckPreview deck={deck} primary={primary} dark={dark} />;
          return null;
        }}
        renderProposal={(change: ProposedChange) => {
          const proposed = parseDeck(change);
          if (!proposed) return <Typography color="error">Invalid preview.</Typography>;
          if (viewMode === 'slide') return <SlideViewer slides={proposed.slides} title={proposed.title || 'Pitch Deck'} primary={primary} logo={brand?.logo || brand?.logoWhite} businessName={selectedBusiness.name} />;
          return <DeckPreview deck={proposed} primary={primary} dark={dark} proposed />;
        }}
      />
    </Box>
  );
}
