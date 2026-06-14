import { useState, useCallback } from 'react';
import { Box, Typography, Card, IconButton, Tabs, Tab, Button, Dialog, DialogTitle, DialogContent, TextField, Select, MenuItem } from '@mui/material';
import {
  ChevronLeft, ChevronRight, Download, Share2, Eye, Plus, Sparkles, Trash2, Check, X, Loader2
} from 'lucide-react';
import type { ViewType } from '../../types/venturemate';
import type { Slide } from '../../types/venturemate';
import { useBusiness } from '../../contexts/BusinessContext';
import { DomainChat } from '../../components/venturemate/DomainChat';
import { NoBusinessSelected } from '../../components/venturemate/NoBusinessSelected';
import { graphqlRequest } from '../../lib/api';

interface PitchDeckProps {
  onViewChange?: (_view: ViewType) => void;
}

const ENHANCE_SLIDE_MUTATION = `
  mutation ProposeAgentAction($userId: ID!, $businessId: ID!, $prompt: String!, $domain: String) {
    proposeAgentAction(userId: $userId, businessId: $businessId, prompt: $prompt, domain: $domain) {
      message
      proposals {
        id, type, field, summary, currentValue, newValue
      }
    }
  }
`;

const NEW_SLIDE_TEMPLATES: Array<{ type: Slide['type']; title: string; content: string }> = [
  { type: 'title', title: 'Your Company Name', content: 'Tagline and subtitle' },
  { type: 'problem', title: 'The Problem', content: 'Describe the problem you are solving' },
  { type: 'solution', title: 'Our Solution', content: 'How we solve this problem' },
  { type: 'market', title: 'Market Opportunity', content: 'TAM, SAM, SOM' },
  { type: 'product', title: 'Our Product', content: 'Key features and benefits' },
  { type: 'business-model', title: 'Business Model', content: 'How we make money' },
  { type: 'traction', title: 'Traction', content: 'Key metrics and milestones' },
  { type: 'team', title: 'Our Team', content: 'Team background and expertise' },
  { type: 'financials', title: 'Financial Projections', content: 'Revenue, costs, growth' },
  { type: 'competition', title: 'Competitive Landscape', content: 'How we compare' },
  { type: 'roadmap', title: 'Roadmap', content: 'What is next' },
  { type: 'ask', title: 'The Ask', content: 'What we need from investors' },
  { type: 'closing', title: 'Thank You', content: 'Contact information' },
];

export function PitchDeck({}: PitchDeckProps) {
  const { selectedBusiness: business, updateBusiness, userId } = useBusiness();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiProposal, setAiProposal] = useState<{ message: string; changes: any[] } | null>(null);
  const [showAddSlide, setShowAddSlide] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  if (!business) {
    return <NoBusinessSelected message="Select a business to create and edit your pitch deck." />;
  }

  const { pitchDeck } = business;
  const slide = pitchDeck.slides[currentSlide];

  const savePitchDeck = useCallback(async (updated: typeof pitchDeck) => {
    setSaving(true);
    await updateBusiness(business.id, { pitchDeck: updated });
    setSaving(false);
  }, [business?.id, updateBusiness]);

  const updateSlide = (field: string, value: any) => {
    const updated = { ...pitchDeck };
    const slides = [...updated.slides];
    slides[currentSlide] = { ...slides[currentSlide], [field]: value };
    updated.slides = slides;
    updated.lastModified = new Date().toISOString();
    savePitchDeck(updated);
  };

  const addSlide = (type: Slide['type']) => {
    const tpl = NEW_SLIDE_TEMPLATES.find(t => t.type === type);
    if (!tpl) return;
    const newSlide: Slide = {
      id: `slide_${Date.now()}`,
      type,
      title: tpl.title,
      content: tpl.content,
      order: pitchDeck.slides.length + 1,
      layout: 'center',
    };
    const updated = { ...pitchDeck, slides: [...pitchDeck.slides, newSlide], lastModified: new Date().toISOString() };
    savePitchDeck(updated);
    setCurrentSlide(pitchDeck.slides.length);
    setShowAddSlide(false);
  };

  const deleteSlide = (idx: number) => {
    if (pitchDeck.slides.length <= 1) return;
    const updated = { ...pitchDeck, slides: pitchDeck.slides.filter((_, i) => i !== idx), lastModified: new Date().toISOString() };
    savePitchDeck(updated);
    setCurrentSlide(Math.min(idx, updated.slides.length - 1));
  };

  const handleAiEnhance = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiProposal(null);
    try {
      const data = await graphqlRequest<any>(ENHANCE_SLIDE_MUTATION, {
        userId,
        businessId: business.id,
        prompt: `For the pitch deck slide "${slide.title}" (type: ${slide.type}), current content: "${slide.content}" — ${aiPrompt}. Return changes targeting the pitchDeck field as JSON.`,
        domain: 'pitch deck',
      });
      setAiProposal(data.proposeAgentAction);
    } catch {
      setAiProposal({ message: 'Error connecting to AI', changes: [] });
    } finally {
      setAiLoading(false);
    }
  };

  const applyAiProposal = () => {
    if (!aiProposal?.changes?.length) return;
    for (const ch of aiProposal.changes) {
      if (ch.field === 'pitchDeck' && ch.newValue) {
        try {
          const parsed = JSON.parse(ch.newValue);
          savePitchDeck(parsed);
        } catch {}
      }
    }
    setAiProposal(null);
    setAiPrompt('');
  };

  const exportPDF = () => {
    window.print();
  };

  const nextSlide = () => {
    if (currentSlide < pitchDeck.slides.length - 1) setCurrentSlide(c => c + 1);
  };
  const prevSlide = () => {
    if (currentSlide > 0) setCurrentSlide(c => c - 1);
  };

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', mb: { xs: 2, md: 3 }, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 2, sm: 0 } }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <TextField
              value={pitchDeck.title}
              onChange={(e) => {
                const updated = { ...pitchDeck, title: e.target.value, lastModified: new Date().toISOString() };
                savePitchDeck(updated);
              }}
              variant="standard"
              sx={{
                '& .MuiInputBase-input': { fontSize: { xs: 20, sm: 24 }, fontWeight: 700, color: 'var(--vm-text-primary)', border: 'none', '&:focus': { outline: 'none' } },
                '& .MuiInput-underline:before': { borderBottom: 'none' },
                '& .MuiInput-underline:hover:before': { borderBottom: '1px solid var(--vm-border-subtle)' },
              }}
            />
            {saving && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', color: 'var(--vm-primary-400)' }} />}
          </Box>
          <Typography sx={{ fontSize: { xs: 13, sm: 14 }, color: 'var(--vm-text-muted)' }}>
            {pitchDeck.slides.length} slides • Last modified {new Date(pitchDeck.lastModified).toLocaleDateString()}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: { xs: 1, sm: 1.5 }, justifyContent: 'center', width: { xs: '100%', sm: 'auto' }, '& > *': { flex: { xs: 1, sm: 'none' } } }}>
          <Button variant="outlined" size="small" onClick={() => setShowPreview(true)}
            sx={{ color: 'var(--vm-text-secondary)', borderColor: 'var(--vm-border-primary)', fontSize: 12 }}>
            <Eye size={16} style={{ marginRight: 6 }} /> Preview
          </Button>
          <Button variant="outlined" size="small"
            sx={{ color: 'var(--vm-text-secondary)', borderColor: 'var(--vm-border-primary)', fontSize: 12 }}>
            <Share2 size={16} style={{ marginRight: 6 }} /> Share
          </Button>
          <Button variant="contained" size="small" onClick={exportPDF}
            sx={{ bgcolor: 'var(--vm-primary-600)', fontSize: 12, '&:hover': { bgcolor: 'var(--vm-primary-500)' } }}>
            <Download size={16} style={{ marginRight: 6 }} /> Export PDF
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(12, 1fr)' }, gap: { xs: 2, md: 3 } }}>
        <Box sx={{ gridColumn: { md: 'span 3' } }}>
          <Card sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, p: 2, maxHeight: 'calc(100vh - 200px)', overflow: 'auto' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'var(--vm-text-primary)' }}>Slides</Typography>
              <IconButton size="small" onClick={() => setShowAddSlide(true)} sx={{ color: 'var(--vm-primary-400)' }}>
                <Plus size={18} />
              </IconButton>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {pitchDeck.slides.map((s, idx) => (
                <Box key={s.id}
                  onClick={() => setCurrentSlide(idx)}
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, p: 1.5, borderRadius: 2, cursor: 'pointer',
                    bgcolor: currentSlide === idx ? 'var(--vm-primary-900)' : 'transparent',
                    border: currentSlide === idx ? '1px solid var(--vm-primary-600)' : '1px solid transparent',
                    '&:hover': { bgcolor: currentSlide === idx ? 'var(--vm-primary-900)' : 'var(--vm-bg-hover)' } }}>
                  <Box sx={{ width: 40, height: 30, borderRadius: 1, bgcolor: 'var(--vm-bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--vm-text-muted)', flexShrink: 0 }}>
                    {idx + 1}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 12, fontWeight: currentSlide === idx ? 600 : 500, color: currentSlide === idx ? 'var(--vm-text-primary)' : 'var(--vm-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.title}
                    </Typography>
                    <Typography sx={{ fontSize: 10, color: 'var(--vm-text-muted)', textTransform: 'capitalize' }}>{s.type}</Typography>
                  </Box>
                  {pitchDeck.slides.length > 1 && (
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); deleteSlide(idx); }} sx={{ color: '#ef4444', opacity: 0.6, '&:hover': { opacity: 1 } }}>
                      <Trash2 size={14} />
                    </IconButton>
                  )}
                </Box>
              ))}
            </Box>
          </Card>
        </Box>

        <Box sx={{ gridColumn: { md: 'span 6' } }}>
          <Card sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, p: { xs: 2, sm: 3 }, minHeight: 500, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ flex: 1, mb: 3 }}>
              <Box sx={{ aspectRatio: { xs: '4/3', sm: '16/9' }, bgcolor: 'var(--vm-bg-primary)', borderRadius: 2, p: { xs: 2, sm: 4 }, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative',
                background: `linear-gradient(135deg, ${business.brandKit.darkColor} 0%, ${business.brandKit.primaryColor} 100%)` }}>
<Typography
               sx={{
                 fontSize: { xs: 14, sm: 20, md: 28 },
                 fontWeight: 700, color: 'white', mb: 2, textAlign: slide.layout === 'center' ? 'center' : 'left'
               }}
             >
               {slide.title}
             </Typography>
             <Typography sx={{ fontSize: { xs: 11, sm: 14, md: 16 }, color: 'rgba(255,255,255,0.9)', mb: 3, textAlign: slide.layout === 'center' ? 'center' : 'left' }}>
               {slide.content}
             </Typography>
                {slide.bullets && (
                  <Box component="ul" sx={{ pl: 3, color: 'rgba(255,255,255,0.85)' }}>
                    {slide.bullets.map((bullet, idx) => (
                      <Typography component="li" key={idx} sx={{ fontSize: 14, mb: 1 }}>{bullet}</Typography>
                    ))}
                  </Box>
                )}
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <IconButton onClick={prevSlide} disabled={currentSlide === 0}
                sx={{ color: currentSlide === 0 ? 'var(--vm-text-muted)' : 'var(--vm-text-secondary)' }}>
                <ChevronLeft size={24} />
              </IconButton>
              <Typography sx={{ fontSize: 14, color: 'var(--vm-text-muted)' }}>
                {currentSlide + 1} / {pitchDeck.slides.length}
              </Typography>
              <IconButton onClick={nextSlide} disabled={currentSlide === pitchDeck.slides.length - 1}
                sx={{ color: currentSlide === pitchDeck.slides.length - 1 ? 'var(--vm-text-muted)' : 'var(--vm-text-secondary)' }}>
                <ChevronRight size={24} />
              </IconButton>
            </Box>
          </Card>
        </Box>

        <Box sx={{ gridColumn: { md: 'span 3' } }}>
          <Card sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, p: 2 }}>
            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="scrollable" scrollButtons="auto"
              sx={{ mb: 2, '& .MuiTabs-indicator': { bgcolor: 'var(--vm-primary-500)' },
                '& .MuiTab-root': { color: 'var(--vm-text-muted)', fontSize: { xs: '0.75rem', sm: '0.875rem' }, minWidth: 80, textTransform: 'none', '&.Mui-selected': { color: 'var(--vm-primary-400)' } } }}>
              <Tab label="Content" /><Tab label="AI" />
            </Tabs>

            {activeTab === 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)', mb: 0.5 }}>Title</Typography>
                  <TextField fullWidth size="small" value={slide.title}
                    onChange={(e) => updateSlide('title', e.target.value)}
                    sx={{ '& .MuiInputBase-input': { fontSize: 13, color: 'var(--vm-text-primary)' } }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)', mb: 0.5 }}>Content</Typography>
                  <TextField fullWidth multiline rows={4} value={slide.content}
                    onChange={(e) => updateSlide('content', e.target.value)}
                    sx={{ '& .MuiInputBase-input': { fontSize: 13, color: 'var(--vm-text-primary)' } }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)', mb: 0.5 }}>Layout</Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {['center', 'split', 'grid'].map((layout) => (
                      <Box key={layout} onClick={() => updateSlide('layout', layout)}
                        sx={{ flex: 1, py: 1, textAlign: 'center', borderRadius: 1.5, border: '1px solid',
                          borderColor: slide.layout === layout ? 'var(--vm-primary-500)' : 'var(--vm-border-primary)',
                          bgcolor: slide.layout === layout ? 'var(--vm-primary-900)' : 'transparent',
                          color: slide.layout === layout ? 'var(--vm-primary-400)' : 'var(--vm-text-muted)',
                          fontSize: 11, textTransform: 'capitalize', cursor: 'pointer' }}>
                        {layout}
                      </Box>
                    ))}
                  </Box>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)', mb: 0.5 }}>Type</Typography>
                  <Select fullWidth size="small" value={slide.type}
                    onChange={(e) => updateSlide('type', e.target.value)}
                    sx={{ fontSize: 13, color: 'var(--vm-text-primary)', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-subtle)' } }}>
                    {NEW_SLIDE_TEMPLATES.map(t => (
                      <MenuItem key={t.type} value={t.type} sx={{ fontSize: 13, textTransform: 'capitalize' }}>{t.type}</MenuItem>
                    ))}
                  </Select>
                </Box>
              </Box>
            )}

            {activeTab === 1 && (
              <Box>
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  <Box sx={{ width: 48, height: 48, borderRadius: 3, bgcolor: 'var(--vm-primary-900)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                    <Sparkles size={24} color="var(--vm-primary-400)" />
                  </Box>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 1 }}>
                    AI Slide Assistant
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)', mb: 2 }}>
                    Ask AI to improve this slide
                  </Typography>
                  <TextField fullWidth multiline rows={3} size="small" placeholder="e.g. Make this more compelling, add bullet points..."
                    value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)}
                    sx={{ mb: 2, '& .MuiInputBase-input': { fontSize: 13, color: 'var(--vm-text-primary)' } }} />
                  <Button fullWidth variant="contained" onClick={handleAiEnhance} disabled={aiLoading || !aiPrompt.trim()}
                    sx={{ bgcolor: 'var(--vm-primary-600)', '&:hover': { bgcolor: 'var(--vm-primary-500)' } }}>
                    {aiLoading ? 'Thinking...' : 'Enhance with AI'}
                  </Button>
                </Box>

                {aiProposal && (
                  <Box sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: 'var(--vm-bg-tertiary)', border: '1px solid var(--vm-border-subtle)' }}>
                    <Typography sx={{ fontSize: 12, color: 'var(--vm-text-primary)', mb: 1, whiteSpace: 'pre-wrap' }}>{aiProposal.message}</Typography>
                    {aiProposal.changes?.length > 0 && (
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mt: 1 }}>
                        <Button size="small" variant="contained" onClick={applyAiProposal}
                          sx={{ fontSize: 11, bgcolor: 'var(--vm-primary-600)' }} startIcon={<Check size={14} />}>
                          Apply
                        </Button>
                        <Button size="small" variant="outlined" onClick={() => setAiProposal(null)}
                          sx={{ fontSize: 11, color: 'var(--vm-text-muted)', borderColor: 'var(--vm-border-subtle)' }} startIcon={<X size={14} />}>
                          Discard
                        </Button>
                      </Box>
                    )}
                  </Box>
                )}
              </Box>
            )}
          </Card>
        </Box>
      </Box>

      <Dialog open={showAddSlide} onClose={() => setShowAddSlide(false)} maxWidth="sm" fullWidth>
        <DialogTitle><Typography sx={{ fontWeight: 700 }}>Add Slide</Typography></DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, py: 1 }}>
            {NEW_SLIDE_TEMPLATES.map(t => (
              <Box key={t.type} onClick={() => addSlide(t.type)}
                sx={{ p: 2, borderRadius: 2, border: '1px solid var(--vm-border-subtle)', cursor: 'pointer',
                  bgcolor: 'var(--vm-bg-secondary)', '&:hover': { borderColor: 'var(--vm-primary-500)' } }}>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'var(--vm-text-primary)', textTransform: 'capitalize' }}>{t.type}</Typography>
                <Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)' }}>{t.title}</Typography>
              </Box>
            ))}
          </Box>
        </DialogContent>
      </Dialog>

      <Dialog open={showPreview} onClose={() => setShowPreview(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography sx={{ fontWeight: 700 }}>{pitchDeck.title} — Preview</Typography>
            <Button variant="contained" size="small" onClick={exportPDF}
              sx={{ bgcolor: 'var(--vm-primary-600)', fontSize: 12 }}>
              <Download size={16} style={{ marginRight: 6 }} /> Export PDF
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 2 }}>
            {pitchDeck.slides.map((s, idx) => (
              <Box key={s.id} sx={{ aspectRatio: '16/9', borderRadius: 2, p: 4, display: 'flex', flexDirection: 'column', justifyContent: 'center',
                background: `linear-gradient(135deg, ${business.brandKit.darkColor} 0%, ${business.brandKit.primaryColor} 100%)`,
                breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                <Box sx={{ position: 'absolute', top: 12, left: 12, bgcolor: 'rgba(255,255,255,0.15)', borderRadius: 1, px: 1.5, py: 0.5 }}>
                  <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>{idx + 1} / {pitchDeck.slides.length}</Typography>
                </Box>
<Typography sx={{ fontSize: { xs: 18, sm: 24 }, fontWeight: 700, color: 'white', mb: 2, textAlign: s.layout === 'center' ? 'center' : 'left' }}>
                 {s.title}
               </Typography>
               <Typography sx={{ fontSize: { xs: 13, sm: 15 }, color: 'rgba(255,255,255,0.9)', textAlign: s.layout === 'center' ? 'center' : 'left' }}>
                 {s.content}
               </Typography>
              </Box>
            ))}
          </Box>
        </DialogContent>
      </Dialog>

      <DomainChat domain="pitch deck" placeholder="Ask me to create, edit or improve your pitch deck..." />
    </Box>
  );
}
