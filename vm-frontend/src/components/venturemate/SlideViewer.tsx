import { useState, useCallback, useRef, useEffect } from 'react';
import { Box, Typography, IconButton, Tooltip, Slider, Avatar, Select, MenuItem, FormControl } from '@mui/material';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Download, Palette } from 'lucide-react';
import type { Slide } from '../../types/venturemate';

const TEMPLATES = [
  { id: 'modern', label: 'Modern', primaryBg: '#0a1929', cardBg: '#132f4c', accent: '#3399ff', font: 'Inter' },
  { id: 'bold', label: 'Bold', primaryBg: '#1a0a2e', cardBg: '#2d1b4e', accent: '#e94560', font: 'Poppins' },
  { id: 'elegant', label: 'Elegant', primaryBg: '#0f1a1c', cardBg: '#1a2c2e', accent: '#c9a96e', font: 'Georgia' },
  { id: 'minimal', label: 'Minimal', primaryBg: '#0d0d0d', cardBg: '#1a1a1a', accent: '#ffffff', font: 'Helvetica' },
  { id: 'nature', label: 'Nature', primaryBg: '#052e16', cardBg: '#0a3d1c', accent: '#22c55e', font: 'Inter' },
  { id: 'sunset', label: 'Sunset', primaryBg: '#1c0f0a', cardBg: '#2e1a0a', accent: '#f97316', font: 'Inter' },
];

interface SlideViewerProps {
  slides: Slide[];
  title: string;
  logo?: string;
  businessName?: string;
  primary?: string;
}

function SlideContent({ slide, template, logo, businessName, primary }: {
  slide: Slide; template: typeof TEMPLATES[0]; logo?: string; businessName?: string; primary?: string;
}) {
  const accent = primary || template.accent;

  return (
    <>
      {/* Logo & branding */}
      {logo && (
        <Box sx={{ position: 'absolute', top: 16, left: 20, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar src={logo} sx={{ width: 28, height: 28, bgcolor: 'rgba(255,255,255,.1)' }} />
          {businessName && <Typography sx={{ color: 'rgba(255,255,255,.5)', fontSize: 10, fontWeight: 600 }}>{businessName}</Typography>}
        </Box>
      )}

      {/* Slide number */}
      <Typography sx={{ position: 'absolute', bottom: 12, right: 16, color: 'rgba(255,255,255,.25)', fontSize: 10, fontWeight: 600 }}>
        {slide.type?.replace('_', ' ') || 'slide'}
      </Typography>

      {/* Background image if present */}
      {slide.image && (
        <Box component="img" src={slide.image} sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.15 }} />
      )}

      {/* Decorative accent line */}
      <Box sx={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: `linear-gradient(180deg, ${accent}, transparent)` }} />

      {/* Title */}
      <Typography sx={{
        color: 'white', fontSize: { xs: 20, sm: 28, md: 36 }, fontWeight: 900,
        textAlign: slide.layout === 'center' ? 'center' : 'left', lineHeight: 1.2,
        mb: slide.content || slide.bullets?.length ? { xs: 0.75, sm: 1.5 } : 0,
        position: 'relative', zIndex: 1,
        pl: slide.layout === 'center' ? 0 : 2,
      }}>{slide.title}</Typography>

      {/* Content */}
      {slide.content && (
        <Typography sx={{
          color: 'rgba(255,255,255,.8)', fontSize: { xs: 11, sm: 13, md: 15 },
          lineHeight: 1.6, textAlign: slide.layout === 'center' ? 'center' : 'left',
          maxWidth: slide.layout === 'center' ? '80%' : '100%',
          mx: slide.layout === 'center' ? 'auto' : 0,
          position: 'relative', zIndex: 1, pl: slide.layout === 'center' ? 0 : 2,
        }}>{slide.content}</Typography>
      )}

      {/* Bullets */}
      {slide.bullets && slide.bullets.length > 0 && (
        <Box component="ul" sx={{ color: 'rgba(255,255,255,.86)', mt: { xs: 0.75, sm: 1.5 }, mb: 0, pl: { xs: 3, sm: 4 }, position: 'relative', zIndex: 1 }}>
          {slide.bullets.map((bullet, bi) => (
            <Box key={bi} sx={{ display: 'flex', gap: 1, mb: { xs: 0.3, sm: 0.5 }, alignItems: 'flex-start' }}>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: accent, mt: { xs: 0.5, sm: 0.6 }, flexShrink: 0 }} />
              <Typography component="li" sx={{ fontSize: { xs: 11, sm: 12, md: 14 }, lineHeight: 1.5, color: 'rgba(255,255,255,.86)' }}>{bullet}</Typography>
            </Box>
          ))}
        </Box>
      )}

      {/* Decorative corner graphic */}
      <Box sx={{ position: 'absolute', bottom: 0, right: 0, width: 120, height: 120, borderRadius: '50%', background: `radial-gradient(circle, ${accent}15, transparent 70%)`, transform: 'translate(30px, 30px)' }} />
    </>
  );
}

export function SlideViewer({ slides, title, logo, businessName, primary: propPrimary }: SlideViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [templateId, setTemplateId] = useState('modern');
  const viewerRef = useRef<HTMLDivElement>(null);

  const template = TEMPLATES.find(t => t.id === templateId) || TEMPLATES[0];
  const slide = slides[currentIndex];
  const total = slides.length;
  const primary = propPrimary || template.accent;
  const bgGrad = `linear-gradient(135deg, ${template.primaryBg}, ${template.cardBg})`;

  const goTo = useCallback((index: number) => setCurrentIndex(Math.max(0, Math.min(index, total - 1))), [total]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); goTo(currentIndex + 1); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); goTo(currentIndex - 1); }
    if (e.key === 'Escape') setFullscreen(false);
    if (e.key === 'f') setFullscreen(p => !p);
  }, [currentIndex, goTo]);

  useEffect(() => { window.addEventListener('keydown', handleKeyDown); return () => window.removeEventListener('keydown', handleKeyDown); }, [handleKeyDown]);
  useEffect(() => { if (fullscreen) viewerRef.current?.requestFullscreen?.().catch(() => {}); else document.exitFullscreen?.().catch(() => {}); }, [fullscreen]);

  const exportData = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify({ title, template: templateId, slides }, null, 2)], { type: 'application/json' }));
    a.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
    a.click();
  };

  if (!slide) return null;

  return (
    <Box ref={viewerRef} sx={{ position: 'relative', width: '100%' }}>
      {/* Template selector */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
        <Palette size={14} color="var(--vm-text-muted)" />
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <Select value={templateId} onChange={e => setTemplateId(e.target.value)}
            sx={{ fontSize: 12, color: 'var(--vm-text-secondary)', '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }}>
            {TEMPLATES.map(t => <MenuItem key={t.id} value={t.id} sx={{ fontSize: 12 }}>{t.label}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      {/* Slide display */}
      <Box sx={{
        position: 'relative', width: '100%', aspectRatio: '16 / 9',
        maxHeight: fullscreen ? '100vh' : { xs: 260, sm: 380, md: 480 },
        borderRadius: fullscreen ? 0 : 2.5, overflow: 'hidden',
        background: bgGrad, border: fullscreen ? 'none' : '1px solid rgba(255,255,255,.08)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        px: { xs: 3, sm: 5, md: 8 }, py: { xs: 2.5, sm: 4, md: 6 },
        boxShadow: `0 0 40px ${primary}10`,
        '&:hover .slide-nav': { opacity: 1 },
        fontFamily: template.font,
      }}>
        <SlideContent slide={slide} template={template} logo={logo} businessName={businessName} primary={primary} />

        {/* Overlay navigation */}
        <Box className="slide-nav" sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: 0, transition: 'opacity .2s', px: { xs: 0.5, sm: 1 } }}>
          <IconButton onClick={() => goTo(currentIndex - 1)} disabled={currentIndex === 0}
            sx={{ bgcolor: 'rgba(0,0,0,.5)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,.7)' }, '&.Mui-disabled': { opacity: 0.2 } }}>
            <ChevronLeft size={24} />
          </IconButton>
          <IconButton onClick={() => goTo(currentIndex + 1)} disabled={currentIndex === total - 1}
            sx={{ bgcolor: 'rgba(0,0,0,.5)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,.7)' }, '&.Mui-disabled': { opacity: 0.2 } }}>
            <ChevronRight size={24} />
          </IconButton>
        </Box>
        <Box onClick={() => goTo(currentIndex + 1)} sx={{ position: 'absolute', inset: 0, cursor: 'pointer' }} />
      </Box>

      {/* Controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'var(--vm-text-primary)' }}>{slide.title}</Typography>
          <Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)' }}>Slide {currentIndex + 1} of {total} · {title}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton size="small" onClick={() => goTo(currentIndex - 1)} disabled={currentIndex === 0} sx={{ color: 'var(--vm-text-muted)' }}><ChevronLeft size={18} /></IconButton>
          <Slider value={currentIndex} onChange={(_, v) => goTo(v as number)} min={0} max={total - 1}
            sx={{ width: { xs: 80, sm: 120 }, mx: 1, color: primary }} />
          <IconButton size="small" onClick={() => goTo(currentIndex + 1)} disabled={currentIndex === total - 1} sx={{ color: 'var(--vm-text-muted)' }}><ChevronRight size={18} /></IconButton>
        </Box>
        <Tooltip title="Fullscreen (F)"><IconButton size="small" onClick={() => setFullscreen(p => !p)} sx={{ color: 'var(--vm-text-muted)' }}>
          {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </IconButton></Tooltip>
        <Tooltip title="Export JSON"><IconButton size="small" onClick={exportData} sx={{ color: 'var(--vm-text-muted)' }}><Download size={16} /></IconButton></Tooltip>
      </Box>
    </Box>
  );
}
