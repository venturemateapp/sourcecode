import { useState } from 'react';
import { Box, Card, Chip, Typography, ToggleButtonGroup, ToggleButton, IconButton } from '@mui/material';
import { Building2, Presentation, Sparkles, LayoutGrid, Monitor, ChevronDown, ChevronUp, TrendingUp, Users, DollarSign, Target, Lightbulb, Shield, Menu, Star } from 'lucide-react';
import { AICreationStudio, type ProposedChange } from '../../components/venturemate/AICreationStudio';
import { SlideViewer } from '../../components/venturemate/SlideViewer';
import { NoBusinessSelected } from '../../components/venturemate/NoBusinessSelected';
import { useBusiness } from '../../contexts/BusinessContext';
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

function SlideCard({ slide, index, primary, dark }: { slide: Slide; index: number; primary: string; dark: string }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = SLIDE_ICONS[slide.type] || Presentation;
  const color = SLIDE_COLORS[slide.type] || primary;

  return (
    <Card sx={{
      position: 'relative', borderRadius: 2.5, overflow: 'hidden',
      background: `radial-gradient(circle at 85% 15%, ${color}66, transparent 30%), linear-gradient(135deg, ${dark}, #07130f)`,
      border: '1px solid var(--vm-border-subtle)',
    }}>
      <Box sx={{ p: 1.75, cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 1.25 }} onClick={() => setExpanded(!expanded)}>
        <Box sx={{ flexShrink: 0, width: 28, height: 28, borderRadius: 1.5, display: 'grid', placeItems: 'center', bgcolor: 'rgba(255,255,255,.1)' }}>
          <Icon size={14} color="white" />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
            <Typography sx={{ color: 'white', fontSize: 14, fontWeight: 800, lineHeight: 1.2 }}>{slide.title}</Typography>
            <Chip label={slide.type} size="small" sx={{ textTransform: 'capitalize', bgcolor: 'rgba(255,255,255,.1)', color: 'rgba(255,255,255,.7)', fontSize: 8, height: 18, ml: 'auto' }} />
          </Box>
          {slide.content && !expanded && (
            <Typography sx={{ color: 'rgba(255,255,255,.6)', fontSize: 11, lineHeight: 1.6, mt: 0.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2 }}>
              {slide.content}
            </Typography>
          )}
        </Box>
        <IconButton size="small" sx={{ color: 'rgba(255,255,255,.4)' }}>{expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</IconButton>
      </Box>
      {expanded && (
        <Box sx={{ px: 1.75, pb: 1.75 }}>
          <Box sx={{ height: 1, bgcolor: 'rgba(255,255,255,.08)', mb: 1.5 }} />
          {slide.content && (
            <Typography sx={{ color: 'rgba(255,255,255,.75)', fontSize: 12, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{slide.content}</Typography>
          )}
          {slide.bullets && slide.bullets.length > 0 && (
            <Box component="ul" sx={{ color: 'rgba(255,255,255,.86)', mt: 1, mb: 0, pl: 2 }}>
              {slide.bullets.map((bullet, bi) => (
                <Typography component="li" key={bi} sx={{ fontSize: 11.5, mb: 0.4, lineHeight: 1.5 }}>{bullet}</Typography>
              ))}
            </Box>
          )}
          <Box sx={{ mt: 1.5, pt: 1, borderTop: '1px solid rgba(255,255,255,.06)', display: 'flex', gap: 0.5 }}>
            <Chip label={`Slide ${index + 1}`} size="small" sx={{ bgcolor: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.5)', fontSize: 9 }} />
            <Chip label={slide.layout} size="small" sx={{ bgcolor: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.5)', fontSize: 9 }} />
          </Box>
        </Box>
      )}
    </Card>
  );
}

function DeckPreview({ deck, primary, dark, proposed = false }: { deck: PitchDeckType; primary: string; dark: string; proposed?: boolean }) {
  const slides = deck.slides || [];
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
        <Box>
          <Typography sx={{ color: 'var(--vm-text-primary)', fontSize: 20, fontWeight: 900 }}>{deck.title || 'Pitch Deck'}</Typography>
          <Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 11 }}>{slides.length} slides · {deck.template || 'AI-designed story'}</Typography>
        </Box>
        <Chip label={proposed ? 'Review this story' : 'Approved deck'} size="small" color={proposed ? 'warning' : 'success'} variant="outlined" />
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {slides.map((slide, index) => <SlideCard key={slide.id || index} slide={slide} index={index} primary={primary} dark={dark} />)}
      </Box>
      {slides.length === 0 && <Typography sx={{ color: 'var(--vm-text-muted)', py: 4, textAlign: 'center' }}>No slides are in this version.</Typography>}
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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Presentation size={19} color="var(--vm-primary-400)" />
        <Chip icon={<Building2 size={14} />} label={selectedBusiness.name} size="small" />
        <Chip icon={<Sparkles size={13} />} label="AI story · AI design · Your approval" size="small" color="success" variant="outlined" />
        {hasDeck && (
          <ToggleButtonGroup size="small" value={viewMode} onChange={(_, v) => v && setViewMode(v)} exclusive sx={{ ml: 'auto', '& .MuiToggleButton-root': { color: 'var(--vm-text-muted)', borderColor: 'var(--vm-border-subtle)', '&.Mui-selected': { color: 'var(--vm-primary-400)', bgcolor: 'rgba(16,185,129,.1)' } } }}>
            <ToggleButton value="grid"><LayoutGrid size={14} /></ToggleButton>
            <ToggleButton value="slide"><Monitor size={14} /></ToggleButton>
          </ToggleButtonGroup>
        )}
      </Box>

      {viewMode === 'slide' && hasDeck && (
        <Card sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, mb: 2 }}>
          <SlideViewer slides={currentDeck.slides} title={currentDeck.title || 'Pitch Deck'} primary={primary} logo={brand?.logo || brand?.logoWhite} businessName={selectedBusiness.name} />
        </Card>
      )}

      <AICreationStudio
        domain="pitch-deck"
        title="AI Pitch Deck"
        description="Ask AI to turn the approved business history, plan, traction, team, and financial records into a coherent investor story. Each slide is crafted by a specialised AI agent."
        placeholder="Example: Generate a concise 12-slide seed pitch deck from my approved business information."
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
          if (!proposed) return <Typography color="error">The AI returned an invalid pitch-deck preview.</Typography>;
          if (viewMode === 'slide') return <SlideViewer slides={proposed.slides} title={proposed.title || 'Pitch Deck'} primary={primary} logo={brand?.logo || brand?.logoWhite} businessName={selectedBusiness.name} />;
          return <DeckPreview deck={proposed} primary={primary} dark={dark} proposed />;
        }}
      />
    </Box>
  );
}
