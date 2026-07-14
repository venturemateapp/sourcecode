import { Box, Card, Chip, Typography } from '@mui/material';
import { Building2, Presentation, Sparkles } from 'lucide-react';
import { AICreationStudio, type ProposedChange } from '../../components/venturemate/AICreationStudio';
import { NoBusinessSelected } from '../../components/venturemate/NoBusinessSelected';
import { useBusiness } from '../../contexts/BusinessContext';
import type { PitchDeck as PitchDeckType, Slide, ViewType } from '../../types/venturemate';

function parseDeck(change: ProposedChange): PitchDeckType | null {
  try {
    return JSON.parse(change.newValue) as PitchDeckType;
  } catch {
    return null;
  }
}

function SlidePreview({ slide, index, total, primary, dark }: { slide: Slide; index: number; total: number; primary: string; dark: string }) {
  return (
    <Card
      sx={{
        position: 'relative',
        aspectRatio: '16 / 9',
        minHeight: 190,
        p: { xs: 2, sm: 3 },
        borderRadius: 2.5,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        background: `radial-gradient(circle at 85% 15%, ${primary}66, transparent 30%), linear-gradient(135deg, ${dark}, #07130f)`,
        border: '1px solid var(--vm-border-subtle)',
      }}
    >
      <Typography sx={{ position: 'absolute', top: 12, right: 14, color: 'rgba(255,255,255,.55)', fontSize: 10 }}>{index + 1} / {total}</Typography>
      <Chip label={slide.type} size="small" sx={{ position: 'absolute', top: 10, left: 12, textTransform: 'capitalize', bgcolor: 'rgba(255,255,255,.1)', color: 'white', maxWidth: '100%', minWidth: 0, flexShrink: 1, height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, wordBreak: 'break-word', py: 0.5, lineHeight: 1.4 } }} />
      <Typography sx={{ color: 'white', fontSize: { xs: 19, sm: 25 }, fontWeight: 900, textAlign: slide.layout === 'center' ? 'center' : 'left' }}>{slide.title}</Typography>
      {slide.content && <Typography sx={{ color: 'rgba(255,255,255,.8)', fontSize: { xs: 12, sm: 13 }, lineHeight: 1.6, mt: 1, textAlign: slide.layout === 'center' ? 'center' : 'left' }}>{slide.content}</Typography>}
      {slide.bullets && slide.bullets.length > 0 && (
        <Box component="ul" sx={{ color: 'rgba(255,255,255,.86)', mt: 1.25, mb: 0, pl: 2.5 }}>
          {slide.bullets.slice(0, 5).map((bullet, bulletIndex) => <Typography component="li" key={bulletIndex} sx={{ fontSize: 12, mb: 0.45 }}>{bullet}</Typography>)}
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
        <Chip label={proposed ? 'Review this story' : 'Approved deck'} size="small" color={proposed ? 'warning' : 'success'} variant="outlined" sx={{ maxWidth: '100%', minWidth: 0, flexShrink: 1, height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, wordBreak: 'break-word', py: 0.5, lineHeight: 1.4 } }} />
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
        {slides.map((slide, index) => <SlidePreview key={slide.id || index} slide={slide} index={index} total={slides.length} primary={primary} dark={dark} />)}
      </Box>
      {slides.length === 0 && <Typography sx={{ color: 'var(--vm-text-muted)', py: 4, textAlign: 'center' }}>No slides are in this version.</Typography>}
    </Box>
  );
}

export function PitchDeck(_props: { onViewChange?: (_view: ViewType) => void }) {
  const { selectedBusiness } = useBusiness();
  if (!selectedBusiness) return <NoBusinessSelected message="Select a business to generate its pitch deck with AI." />;

  const deck = selectedBusiness.pitchDeck;
  const brand = selectedBusiness.brandKit;
  const hasDeck = Boolean(deck?.slides?.length);
  const primary = brand?.primaryColor || '#10b981';
  const dark = brand?.darkColor || '#052e24';

  return (
    <Box sx={{ p: { xs: 1.25, sm: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Presentation size={19} color="var(--vm-primary-400)" />
        <Chip icon={<Building2 size={14} />} label={selectedBusiness.name} size="small" sx={{ maxWidth: '100%', minWidth: 0, flexShrink: 1, height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, wordBreak: 'break-word', py: 0.5, lineHeight: 1.4 } }} />
        <Chip icon={<Sparkles size={13} />} label="AI story · AI design · Your approval" size="small" color="success" variant="outlined" sx={{ maxWidth: '100%', minWidth: 0, flexShrink: 1, height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, wordBreak: 'break-word', py: 0.5, lineHeight: 1.4 } }} />
      </Box>
      <AICreationStudio
        domain="pitch-deck"
        title="AI Pitch Deck"
        description="Ask AI to turn the approved business history, plan, traction, team, and financial records into a coherent investor story. Revise one line or the whole narrative through conversation; no manual slide creation is required."
        placeholder="Example: Generate a concise 12-slide seed pitch deck from my approved business information. Focus on the problem, solution, market, traction, business model, team, financial assumptions, and funding ask."
        starterPrompts={[
          'Generate an investor-ready pitch deck from my business and business plan.',
          'Create a shorter 8-slide version for a first investor meeting.',
          'Make the problem and solution slides more compelling without inventing facts.',
          'Rewrite the funding ask so assumptions and use of funds are clear.',
        ]}
        emptyLabel="No approved pitch deck exists. Ask AI to create the first investor story."
        renderCurrent={() => hasDeck ? <DeckPreview deck={deck} primary={primary} dark={dark} /> : null}
        renderProposal={(change) => {
          const proposed = parseDeck(change);
          return proposed ? <DeckPreview deck={proposed} primary={primary} dark={dark} proposed /> : <Typography color="error">The AI returned an invalid pitch-deck preview.</Typography>;
        }}
      />
    </Box>
  );
}
