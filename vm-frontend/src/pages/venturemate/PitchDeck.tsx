import { useState } from 'react';
import { Box, Chip, Typography, ToggleButtonGroup, ToggleButton, IconButton, Dialog, DialogTitle, DialogContent, TextField, FormControl, Select, MenuItem, CircularProgress } from '@mui/material';
import { Presentation, LayoutGrid, Monitor, ChevronDown, ChevronUp, TrendingUp, Users, DollarSign, Target, Lightbulb, Shield, Menu, Star, Sparkles, Plus, X, Edit3, Save } from 'lucide-react';
import { AICreationStudio, type ProposedChange } from '../../components/venturemate/AICreationStudio';
import { SlideViewer } from '../../components/venturemate/SlideViewer';
import { ModernPitchDeck } from '../../components/venturemate/ModernPitchDeck';
import { NoBusinessSelected } from '../../components/venturemate/NoBusinessSelected';
import { GradientButton } from '../../components/shared/buttons';
import { useBusiness } from '../../contexts/BusinessContext';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { useToast } from '../../components/shared/toast';
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
  const { selectedBusiness, businesses, updateBusiness } = useBusiness();
  const { subscription } = useSubscription();
  const toast = useToast();
  const [viewMode, setViewMode] = useState<'grid' | 'slide'>('slide');
  const [designMode, setDesignMode] = useState<'classic' | 'premium'>('premium');
  const [editSlides, setEditSlides] = useState<Slide[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  if (!selectedBusiness) return <NoBusinessSelected message="Select a business to generate its pitch deck with AI." />;

  const maxPitchDecks = subscription?.plan?.limits?.maxPitchDecks;
  const pitchDeckCount = businesses.filter(b => b.pitchDeck?.slides?.length).length;
  const limitReached = maxPitchDecks !== -1 && pitchDeckCount >= (maxPitchDecks ?? Infinity);

  const handleBeforeGenerate = () => {
    if (limitReached) {
      toast.warning('Upgrade required', {
        description: `You've reached the maximum of ${maxPitchDecks} pitch decks on your ${subscription?.plan?.displayName || subscription?.plan?.name || 'current'} plan. Upgrade to add more.`,
      });
      return false;
    }
    return true;
  };

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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <ToggleButtonGroup size="small" value={viewMode} onChange={(_, v) => v && setViewMode(v)} exclusive sx={{ '& .MuiToggleButton-root': { color: 'var(--vm-text-muted)', borderColor: 'var(--vm-border-subtle)', '&.Mui-selected': { color: 'var(--vm-primary-400)', bgcolor: 'rgba(16,185,129,.1)' } } }}>
              <ToggleButton value="grid" aria-label="Outline preview"><LayoutGrid size={14} /></ToggleButton>
              <ToggleButton value="slide" aria-label="Presentation preview"><Monitor size={14} /></ToggleButton>
            </ToggleButtonGroup>
            {viewMode === 'slide' && (
              <ToggleButtonGroup size="small" value={designMode} onChange={(_, v) => v && setDesignMode(v)} exclusive>
                <ToggleButton value="classic" sx={{ color: 'var(--vm-text-muted)', borderColor: 'var(--vm-border-subtle)', '&.Mui-selected': { color: 'var(--vm-primary-400)', bgcolor: 'rgba(16,185,129,.1)' }, fontSize: 11, gap: 0.5 }}>
                  <Monitor size={13} /> Classic
                </ToggleButton>
                <ToggleButton value="premium" sx={{ color: 'var(--vm-text-muted)', borderColor: 'var(--vm-border-subtle)', '&.Mui-selected': { color: '#a78bfa', bgcolor: 'rgba(139,92,246,.1)' }, fontSize: 11, gap: 0.5 }}>
                  <Sparkles size={13} /> Modern
                </ToggleButton>
              </ToggleButtonGroup>
            )}
            <GradientButton variant="outline" size="sm" startIcon={<Edit3 size={12} />}
              onClick={() => { setEditSlides(JSON.parse(JSON.stringify(currentDeck.slides))); setEditDialogOpen(true); }}>
              Edit
            </GradientButton>
          </Box>
        ) : undefined}
      />

      <AICreationStudio
        domain="pitch-deck" title="" description=""
        builderMode
        placeholder="Generate an investor-ready pitch deck from my approved business information."
        starterPrompts={[
          'Generate an investor-ready pitch deck from my business and business plan.',
          'Create a shorter 8-slide version for a first investor meeting.',
          'Make the problem and solution slides more compelling without inventing facts.',
          'Rewrite the funding ask so assumptions and use of funds are clear.',
        ]}
        emptyLabel="No approved pitch deck exists. Ask AI to create the first investor story."
        onBeforeGenerate={handleBeforeGenerate}
        renderCurrent={() => {
          if (viewMode === 'slide' && hasDeck) {
            if (designMode === 'premium') {
              return <ModernPitchDeck slides={currentDeck.slides} title={currentDeck.title || 'Pitch Deck'} logo={brand?.logo || brand?.logoWhite} businessName={selectedBusiness.name} accentColor={primary} />;
            }
            return <SlideViewer slides={currentDeck.slides} title={currentDeck.title || 'Pitch Deck'} primary={primary} logo={brand?.logo || brand?.logoWhite} businessName={selectedBusiness.name} />;
          }
          if (hasDeck) return <DeckPreview deck={deck} primary={primary} dark={dark} />;
          return null;
        }}
        renderProposal={(change: ProposedChange) => {
          const proposed = parseDeck(change);
          if (!proposed) return <Typography color="error">Invalid preview.</Typography>;
          if (viewMode === 'slide') {
            if (designMode === 'premium') {
              return <ModernPitchDeck slides={proposed.slides} title={proposed.title || 'Pitch Deck'} logo={brand?.logo || brand?.logoWhite} businessName={selectedBusiness.name} accentColor={primary} />;
            }
            return <SlideViewer slides={proposed.slides} title={proposed.title || 'Pitch Deck'} primary={primary} logo={brand?.logo || brand?.logoWhite} businessName={selectedBusiness.name} />;
          }
          return <DeckPreview deck={proposed} primary={primary} dark={dark} proposed />;
        }}
      />

      {/* Edit Slides Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { bgcolor: 'var(--vm-bg-secondary)', borderRadius: 3, border: '1px solid var(--vm-border-subtle)', maxHeight: '80vh' } }}>
        <DialogTitle sx={{ borderBottom: '1px solid var(--vm-border-subtle)', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Edit3 size={20} color="var(--vm-primary-400)" />
          <Typography sx={{ fontWeight: 700 }}>Edit Slides</Typography>
          <IconButton size="small" onClick={() => setEditDialogOpen(false)} sx={{ ml: 'auto', color: 'var(--vm-text-muted)' }}><X size={18} /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, mt: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {editSlides.map((slide, idx) => (
              <Box key={idx} sx={{ p: 2, bgcolor: 'var(--vm-bg-tertiary)', borderRadius: 2, border: '1px solid var(--vm-border-subtle)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'var(--vm-text-muted)', minWidth: 40 }}>#{idx + 1}</Typography>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: SLIDE_COLORS[slide.type] || primary }} />
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <Select value={slide.type} onChange={e => {
                      const next = [...editSlides];
                      next[idx] = { ...next[idx], type: e.target.value as Slide['type'] };
                      setEditSlides(next);
                    }} sx={{ color: 'var(--vm-text-primary)', fontSize: 12, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }}>
                      {Object.keys(SLIDE_COLORS).map(t => <MenuItem key={t} value={t} sx={{ fontSize: 12, textTransform: 'capitalize' }}>{t}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <IconButton size="small" onClick={() => {
                    const next = editSlides.filter((_, i) => i !== idx);
                    setEditSlides(next);
                  }} sx={{ ml: 'auto', color: '#ef444488' }}><X size={14} /></IconButton>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <TextField size="small" label="Title" value={slide.title} onChange={e => {
                    const next = [...editSlides];
                    next[idx] = { ...next[idx], title: e.target.value };
                    setEditSlides(next);
                  }} sx={{ '& input': { color: 'var(--vm-text-primary)' }, '& label': { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
                  <TextField size="small" label="Content" multiline rows={2} value={slide.content || ''} onChange={e => {
                    const next = [...editSlides];
                    next[idx] = { ...next[idx], content: e.target.value };
                    setEditSlides(next);
                  }} sx={{ '& textarea': { color: 'var(--vm-text-primary)' }, '& label': { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
                  <TextField size="small" label="Bullets (one per line)" multiline rows={2} value={(slide.bullets || []).join('\n')} onChange={e => {
                    const next = [...editSlides];
                    next[idx] = { ...next[idx], bullets: e.target.value.split('\n').filter(b => b.trim()) };
                    setEditSlides(next);
                  }} sx={{ '& textarea': { color: 'var(--vm-text-primary)' }, '& label': { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
                </Box>
              </Box>
            ))}
            <GradientButton variant="outline" size="sm" startIcon={<Plus size={12} />} onClick={() => {
              setEditSlides([...editSlides, { id: `slide-${Date.now()}`, type: 'custom', title: '', content: '', bullets: [], order: editSlides.length, layout: 'default' }]);
            }}>
              Add Slide
            </GradientButton>
          </Box>
        </DialogContent>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, p: 2.5, pt: 0 }}>
          <GradientButton variant="ghost" size="sm" onClick={() => setEditDialogOpen(false)}>Cancel</GradientButton>
          <GradientButton variant="primary" size="sm" disabled={savingEdit} onClick={async () => {
            setSavingEdit(true);
            try {
              const updatedDeck = { ...selectedBusiness.pitchDeck, slides: editSlides, lastModified: new Date().toISOString() };
              await updateBusiness(selectedBusiness.id, { pitchDeck: updatedDeck });
              setEditDialogOpen(false);
              toast.success('Deck updated', { description: 'Your pitch deck slides have been saved.' });
            } catch (err) {
              toast.error('Failed to save', { description: 'Please try again.' });
            }
            setSavingEdit(false);
          }}>
            {savingEdit ? <CircularProgress size={14} /> : <><Save size={14} style={{ marginRight: 4 }} /> Save Changes</>}
          </GradientButton>
        </Box>
      </Dialog>
    </Box>
  );
}
