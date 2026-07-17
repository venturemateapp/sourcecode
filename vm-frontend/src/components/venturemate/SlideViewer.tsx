import { useState, useCallback, useRef, useEffect } from 'react';
import { Box, Typography, IconButton, Tooltip, Slider, Avatar, Chip } from '@mui/material';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Download, Palette } from 'lucide-react';
import type { Slide } from '../../types/venturemate';

const TEMPLATES = [
  {
    id: 'crystal', label: 'Crystal', font: 'Inter',
    bg: 'linear-gradient(135deg, #0a0f1e 0%, #1a1f3e 50%, #0d1225 100%)',
    cardBg: 'rgba(255,255,255,.04)', accent: '#818cf8', accent2: '#6366f1',
    glass: 'rgba(255,255,255,.06)', border: 'rgba(255,255,255,.08)',
    overlay: 'radial-gradient(circle at 20% 30%, rgba(129,140,248,.12), transparent 60%)',
    texture: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,.02) 2px, rgba(255,255,255,.02) 4px)',
  },
  {
    id: 'ember', label: 'Ember', font: 'Poppins',
    bg: 'linear-gradient(135deg, #1a0a00 0%, #2d1500 50%, #1a0a00 100%)',
    cardBg: 'rgba(255,255,255,.04)', accent: '#f97316', accent2: '#ea580c',
    glass: 'rgba(255,255,255,.06)', border: 'rgba(255,255,255,.08)',
    overlay: 'radial-gradient(circle at 80% 20%, rgba(249,115,22,.15), transparent 50%)',
    texture: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(249,115,22,.03) 3px, rgba(249,115,22,.03) 6px)',
  },
  {
    id: 'aurora', label: 'Aurora', font: 'Inter',
    bg: 'linear-gradient(135deg, #0a1a0f 0%, #0f2e22 50%, #0a1a0f 100%)',
    cardBg: 'rgba(255,255,255,.04)', accent: '#10b981', accent2: '#34d399',
    glass: 'rgba(255,255,255,.06)', border: 'rgba(255,255,255,.08)',
    overlay: 'radial-gradient(circle at 50% 0%, rgba(16,185,129,.15), transparent 50%), radial-gradient(circle at 50% 100%, rgba(52,211,153,.08), transparent 50%)',
    texture: 'repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(16,185,129,.02) 4px, rgba(16,185,129,.02) 8px)',
  },
  {
    id: 'cosmic', label: 'Cosmic', font: 'Inter',
    bg: 'linear-gradient(135deg, #0e0a1a 0%, #1a0f2e 50%, #0e0a1a 100%)',
    cardBg: 'rgba(255,255,255,.04)', accent: '#a78bfa', accent2: '#8b5cf6',
    glass: 'rgba(255,255,255,.05)', border: 'rgba(255,255,255,.08)',
    overlay: 'radial-gradient(circle at 30% 40%, rgba(167,139,250,.12), transparent 50%), radial-gradient(circle at 70% 60%, rgba(139,92,246,.08), transparent 40%)',
    texture: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,.02) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(255,255,255,.02) 0%, transparent 50%)',
  },
  {
    id: 'ocean', label: 'Ocean', font: 'Inter',
    bg: 'linear-gradient(135deg, #0a1628 0%, #0f2847 50%, #0a1628 100%)',
    cardBg: 'rgba(255,255,255,.04)', accent: '#38bdf8', accent2: '#0ea5e9',
    glass: 'rgba(255,255,255,.06)', border: 'rgba(255,255,255,.08)',
    overlay: 'radial-gradient(circle at 50% 80%, rgba(56,189,248,.12), transparent 40%)',
    texture: 'linear-gradient(180deg, transparent 0%, rgba(56,189,248,.03) 50%, transparent 100%)',
  },
  {
    id: 'noir', label: 'Noir', font: 'Helvetica',
    bg: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%)',
    cardBg: 'rgba(255,255,255,.03)', accent: '#ffffff', accent2: '#e5e5e5',
    glass: 'rgba(255,255,255,.05)', border: 'rgba(255,255,255,.1)',
    overlay: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,.03), transparent 60%)',
    texture: 'none',
  },
];

interface SlideViewerProps {
  slides: Slide[];
  title: string;
  logo?: string;
  businessName?: string;
  primary?: string;
}

function SlideContent({ slide, template, logo, businessName }: {
  slide: Slide; template: typeof TEMPLATES[0]; logo?: string; businessName?: string;
}) {
  const { accent, glass, border } = template;

  if (slide.type === 'title' || slide.type === 'closing') {
    return (
      <>
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 2, textAlign: 'center', px: 4 }}>
          {logo && <Avatar src={logo} sx={{ width: 64, height: 64, mb: 2, boxShadow: `0 0 30px ${accent}40` }} />}
          {businessName && <Typography sx={{ color: `${accent}cc`, fontSize: { xs: 11, sm: 13 }, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', mb: 1 }}>{businessName}</Typography>}
          <Typography sx={{ color: 'white', fontSize: { xs: 28, sm: 38, md: 48 }, fontWeight: 900, lineHeight: 1.15, maxWidth: 800 }}>{slide.title}</Typography>
          {slide.content && <Typography sx={{ color: 'rgba(255,255,255,.65)', fontSize: { xs: 13, sm: 16, md: 18 }, mt: 2, maxWidth: 600, lineHeight: 1.6 }}>{slide.content}</Typography>}
          {slide.type === 'closing' && (
            <Box sx={{ mt: 3, px: 3, py: 1.5, borderRadius: 2, bgcolor: glass, border: `1px solid ${border}`, backdropFilter: 'blur(10px)' }}>
              <Typography sx={{ color: 'rgba(255,255,255,.5)', fontSize: 11 }}>venturemate.net</Typography>
            </Box>
          )}
        </Box>
        <Box sx={{ position: 'absolute', bottom: '15%', left: '50%', transform: 'translateX(-50%)', width: 60, height: 2, borderRadius: 1, bgcolor: accent, opacity: 0.5 }} />
      </>
    );
  }

  return (
    <>
      {logo && (
        <Box sx={{ position: 'absolute', top: { xs: 12, sm: 20 }, left: { xs: 14, sm: 24 }, zIndex: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar src={logo} sx={{ width: { xs: 22, sm: 28 }, height: { xs: 22, sm: 28 }, bgcolor: 'rgba(255,255,255,.05)' }} />
          {businessName && <Typography sx={{ color: 'rgba(255,255,255,.3)', fontSize: { xs: 9, sm: 10 }, fontWeight: 600, letterSpacing: 0.5 }}>{businessName}</Typography>}
        </Box>
      )}

      <Box sx={{ position: 'absolute', top: { xs: 12, sm: 20 }, right: { xs: 14, sm: 24 }, zIndex: 2, display: 'flex', gap: 1 }}>
        <Chip label={slide.type?.replace('_', ' ') || 'slide'} size="small"
          sx={{ textTransform: 'capitalize', bgcolor: glass, color: 'rgba(255,255,255,.6)', fontSize: { xs: 8, sm: 9 }, height: { xs: 18, sm: 22 }, border: `1px solid ${border}`, backdropFilter: 'blur(10px)' }} />
      </Box>

      <Box sx={{ position: 'relative', zIndex: 2, mt: { xs: 4, sm: 5, md: 6 }, pl: { xs: 2, sm: 3, md: 4 } }}>
        <Box sx={{ width: { xs: 20, sm: 28, md: 36 }, height: 3, borderRadius: 2, bgcolor: accent, mb: { xs: 1, sm: 1.5 } }} />

        <Typography sx={{
          color: 'white', fontSize: { xs: 18, sm: 24, md: 32 }, fontWeight: 900,
          lineHeight: 1.2, mb: slide.content || slide.bullets?.length ? { xs: 0.75, sm: 1.25 } : 0,
          maxWidth: '90%',
        }}>{slide.title}</Typography>
      </Box>

      {slide.image && (
        <Box sx={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <Box component="img" src={slide.image} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <Box sx={{ position: 'absolute', inset: 0, background: template.bg, opacity: 0.85 }} />
        </Box>
      )}

      {slide.content && (
        <Typography sx={{
          color: 'rgba(255,255,255,.75)', fontSize: { xs: 11, sm: 13, md: 16 },
          lineHeight: 1.7, position: 'relative', zIndex: 2, pl: { xs: 2, sm: 3, md: 4 },
          maxWidth: '85%', mt: { xs: 0.5, sm: 1 },
        }}>{slide.content}</Typography>
      )}

      {slide.bullets && slide.bullets.length > 0 && (
        <Box sx={{ position: 'relative', zIndex: 2, mt: { xs: 0.75, sm: 1.5 }, pl: { xs: 2.5, sm: 3.5, md: 4.5 }, pr: { xs: 2, sm: 3 }, maxWidth: '90%' }}>
          {slide.bullets.map((bullet, bi) => (
            <Box key={bi} sx={{ display: 'flex', gap: { xs: 0.75, sm: 1 }, mb: { xs: 0.4, sm: 0.6 }, alignItems: 'flex-start' }}>
              <Box sx={{ minWidth: { xs: 5, sm: 6 }, height: { xs: 5, sm: 6 }, borderRadius: '50%', bgcolor: accent, mt: { xs: 0.5, sm: 0.6 }, boxShadow: `0 0 8px ${accent}60` }} />
              <Typography sx={{ fontSize: { xs: 11, sm: 13, md: 15 }, lineHeight: 1.5, color: 'rgba(255,255,255,.85)' }}>{bullet}</Typography>
            </Box>
          ))}
        </Box>
      )}

      <Box sx={{ position: 'absolute', bottom: { xs: 10, sm: 16 }, right: { xs: 12, sm: 20 }, zIndex: 2 }}>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Box sx={{ width: 16, height: 2, borderRadius: 1, bgcolor: accent }} />
          <Box sx={{ width: 8, height: 2, borderRadius: 1, bgcolor: `${accent}40` }} />
        </Box>
      </Box>
    </>
  );
}

export function SlideViewer({ slides, title, logo, businessName, primary: propPrimary }: SlideViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [templateId, setTemplateId] = useState('aurora');
  const viewerRef = useRef<HTMLDivElement>(null);

  const template = TEMPLATES.find(t => t.id === templateId) || TEMPLATES[0];
  const slide = slides[currentIndex];
  const total = slides.length;
  const accent = propPrimary || template.accent;

  const goTo = useCallback((index: number) => setCurrentIndex(Math.max(0, Math.min(index, total - 1))), [total]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); goTo(currentIndex + 1); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); goTo(currentIndex - 1); }
    if (e.key === 'Escape') setFullscreen(false);
    if (e.key === 'f') setFullscreen(p => !p);
    if (e.key === 'g') goTo(0);
    if (e.key === ' ') { e.preventDefault(); goTo(currentIndex + 1); }
  }, [currentIndex, goTo]);

  useEffect(() => { window.addEventListener('keydown', handleKeyDown); return () => window.removeEventListener('keydown', handleKeyDown); }, [handleKeyDown]);
  useEffect(() => {
    if (fullscreen) { viewerRef.current?.requestFullscreen?.().catch(() => {}); document.body.style.overflow = 'hidden'; }
    else { document.exitFullscreen?.().catch(() => {}); document.body.style.overflow = ''; }
    return () => { document.body.style.overflow = ''; };
  }, [fullscreen]);

  const exportData = () => {
    const data = JSON.stringify({ title, template: templateId, slides }, null, 2);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    a.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
    a.click();
  };

  if (!slide) return null;

  return (
    <Box ref={viewerRef} sx={{ position: 'relative', width: '100%' }}>
      {/* Template selector bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5, flexWrap: 'wrap', px: { xs: 0.5, sm: 0 } }}>
        <Palette size={14} color="var(--vm-text-muted)" />
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {TEMPLATES.map(t => (
            <Chip key={t.id} label={t.label} size="small" onClick={() => setTemplateId(t.id)}
              sx={{ bgcolor: templateId === t.id ? `${t.accent}20` : 'rgba(255,255,255,.04)', color: templateId === t.id ? t.accent : 'var(--vm-text-secondary)', fontWeight: templateId === t.id ? 700 : 500, cursor: 'pointer', fontSize: 11, '&:hover': { bgcolor: `${t.accent}15` } }} />
          ))}
        </Box>
      </Box>

      {/* Slide */}
      <Box sx={{
        position: 'relative', width: '100%', aspectRatio: '16 / 9',
        maxHeight: fullscreen ? '100vh' : { xs: 250, sm: 370, md: 470 },
        borderRadius: fullscreen ? 0 : { xs: 1.5, sm: 2.5 }, overflow: 'hidden',
        background: template.bg, border: fullscreen ? 'none' : `1px solid ${template.border}`,
        boxShadow: fullscreen ? 'none' : `0 8px 40px rgba(0,0,0,.3), 0 0 60px ${accent}08`,
        '&:hover .slide-nav': { opacity: 1 },
        fontFamily: template.font,
      }}>
        {/* Overlay gradient */}
        <Box sx={{ position: 'absolute', inset: 0, background: template.overlay, zIndex: 1, pointerEvents: 'none' }} />

        {/* Texture pattern */}
        {template.texture !== 'none' && (
          <Box sx={{ position: 'absolute', inset: 0, background: template.texture, zIndex: 1, pointerEvents: 'none', opacity: 0.5 }} />
        )}

        {/* Subtle glow edges */}
        <Box sx={{ position: 'absolute', top: -100, left: '50%', transform: 'translateX(-50%)', width: '60%', height: 200, background: `radial-gradient(ellipse, ${accent}10, transparent 70%)`, zIndex: 0, pointerEvents: 'none' }} />

        {/* Slide number */}
        <Box sx={{ position: 'absolute', bottom: { xs: 10, sm: 16 }, left: { xs: 12, sm: 20 }, zIndex: 2 }}>
          <Typography sx={{ color: 'rgba(255,255,255,.2)', fontSize: { xs: 10, sm: 11 }, fontWeight: 600, fontFamily: 'monospace' }}>
            {String(currentIndex + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
          </Typography>
        </Box>

        <SlideContent slide={slide} template={template} logo={logo} businessName={businessName} />

        <Box className="slide-nav" sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: 0, transition: 'opacity .25s', zIndex: 5, px: { xs: 0.5, sm: 1 } }}>
          <IconButton onClick={() => goTo(currentIndex - 1)} disabled={currentIndex === 0}
            sx={{ bgcolor: template.glass, color: 'white', backdropFilter: 'blur(12px)', border: `1px solid ${template.border}`, '&:hover': { bgcolor: 'rgba(255,255,255,.12)' }, '&.Mui-disabled': { opacity: 0.15 } }}>
            <ChevronLeft size={22} />
          </IconButton>
          <IconButton onClick={() => goTo(currentIndex + 1)} disabled={currentIndex === total - 1}
            sx={{ bgcolor: template.glass, color: 'white', backdropFilter: 'blur(12px)', border: `1px solid ${template.border}`, '&:hover': { bgcolor: 'rgba(255,255,255,.12)' }, '&.Mui-disabled': { opacity: 0.15 } }}>
            <ChevronRight size={22} />
          </IconButton>
        </Box>
        <Box onClick={() => goTo(currentIndex + 1)} sx={{ position: 'absolute', inset: 0, cursor: 'pointer', zIndex: 3 }} />
      </Box>

      {/* Controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: { xs: 12, sm: 13 }, fontWeight: 700, color: 'var(--vm-text-primary)' }}>{slide.title}</Typography>
          <Typography sx={{ fontSize: { xs: 10, sm: 11 }, color: 'var(--vm-text-muted)' }}>{title} · Slide {currentIndex + 1} of {total}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton size="small" onClick={() => goTo(currentIndex - 1)} disabled={currentIndex === 0} sx={{ color: 'var(--vm-text-muted)' }}><ChevronLeft size={16} /></IconButton>
          <Slider value={currentIndex} onChange={(_, v) => goTo(v as number)} min={0} max={total - 1}
            sx={{ width: { xs: 70, sm: 100 }, mx: 0.5, color: accent, '& .MuiSlider-thumb': { width: 12, height: 12 } }} />
          <IconButton size="small" onClick={() => goTo(currentIndex + 1)} disabled={currentIndex === total - 1} sx={{ color: 'var(--vm-text-muted)' }}><ChevronRight size={16} /></IconButton>
        </Box>
        <Tooltip title="Fullscreen (F)"><IconButton size="small" onClick={() => setFullscreen(p => !p)} sx={{ color: 'var(--vm-text-muted)' }}>
          {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </IconButton></Tooltip>
        <Tooltip title="Export"><IconButton size="small" onClick={exportData} sx={{ color: 'var(--vm-text-muted)' }}><Download size={15} /></IconButton></Tooltip>
      </Box>
    </Box>
  );
}
