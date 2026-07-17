import { useState, useCallback, useRef, useEffect } from 'react';
import { Box, Typography, IconButton, Tooltip, Slider, Avatar, Chip } from '@mui/material';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Download, Palette, TrendingUp, Users, DollarSign } from 'lucide-react';
import type { Slide } from '../../types/venturemate';

interface Template {
  id: string; label: string; font: string;
  bg: string; cardBg: string; accent: string; accent2: string;
  glass: string; border: string;
  overlay: string; texture: string;
  titleSize: Record<string, string>;
  layout: 'standard' | 'magazine' | 'minimal';
}

const TEMPLATES: Template[] = [
  {
    id: 'velocity', label: 'Velocity', font: 'Inter',
    bg: 'linear-gradient(160deg, #080c18 0%, #0f1a3a 35%, #1a0a2e 65%, #080c18 100%)',
    cardBg: 'rgba(255,255,255,.03)', accent: '#6366f1', accent2: '#8b5cf6',
    glass: 'rgba(99,102,241,.12)', border: 'rgba(99,102,241,.2)',
    overlay: 'radial-gradient(circle at 15% 20%, rgba(99,102,241,.12) 0%, transparent 50%), radial-gradient(circle at 85% 80%, rgba(139,92,246,.08) 0%, transparent 40%)',
    texture: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(99,102,241,.03) 1px, rgba(99,102,241,.03) 2px)',
    titleSize: { xs: '22px', sm: '30px', md: '40px' }, layout: 'magazine',
  },
  {
    id: 'ignite', label: 'Ignite', font: 'Poppins',
    bg: 'linear-gradient(160deg, #0f0500 0%, #2a0a00 35%, #1a0500 65%, #0f0500 100%)',
    cardBg: 'rgba(255,255,255,.03)', accent: '#f43f5e', accent2: '#e11d48',
    glass: 'rgba(244,63,94,.12)', border: 'rgba(244,63,94,.2)',
    overlay: 'radial-gradient(circle at 50% 0%, rgba(244,63,94,.15) 0%, transparent 45%), radial-gradient(circle at 20% 80%, rgba(225,29,72,.08) 0%, transparent 35%)',
    texture: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(244,63,94,.03) 3px, rgba(244,63,94,.03) 6px)',
    titleSize: { xs: '24px', sm: '32px', md: '42px' }, layout: 'magazine',
  },
  {
    id: 'summit', label: 'Summit', font: 'Inter',
    bg: 'linear-gradient(160deg, #0a1410 0%, #0f2a1a 35%, #0a1a10 65%, #0a1410 100%)',
    cardBg: 'rgba(255,255,255,.03)', accent: '#10b981', accent2: '#34d399',
    glass: 'rgba(16,185,129,.12)', border: 'rgba(16,185,129,.2)',
    overlay: 'radial-gradient(circle at 80% 10%, rgba(16,185,129,.15) 0%, transparent 40%), radial-gradient(circle at 30% 90%, rgba(52,211,153,.08) 0%, transparent 35%)',
    texture: 'repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(16,185,129,.02) 4px, rgba(16,185,129,.02) 8px)',
    titleSize: { xs: '22px', sm: '30px', md: '38px' }, layout: 'standard',
  },
  {
    id: 'nova', label: 'Nova', font: 'Inter',
    bg: 'linear-gradient(160deg, #080812 0%, #14102a 35%, #0a0818 65%, #080812 100%)',
    cardBg: 'rgba(255,255,255,.03)', accent: '#a78bfa', accent2: '#c4b5fd',
    glass: 'rgba(167,139,250,.12)', border: 'rgba(167,139,250,.2)',
    overlay: 'radial-gradient(circle at 30% 30%, rgba(167,139,250,.12) 0%, transparent 45%), radial-gradient(circle at 70% 70%, rgba(196,181,253,.06) 0%, transparent 35%), radial-gradient(circle at 50% 50%, rgba(167,139,250,.04) 0%, transparent 50%)',
    texture: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,.015) 0%, transparent 50%)',
    titleSize: { xs: '23px', sm: '31px', md: '41px' }, layout: 'minimal',
  },
  {
    id: 'catalyst', label: 'Catalyst', font: 'Inter',
    bg: 'linear-gradient(160deg, #0a0e1a 0%, #14203a 35%, #0a0e1a 65%, #0a0e1a 100%)',
    cardBg: 'rgba(255,255,255,.03)', accent: '#06b6d4', accent2: '#22d3ee',
    glass: 'rgba(6,182,212,.12)', border: 'rgba(6,182,212,.2)',
    overlay: 'radial-gradient(circle at 20% 50%, rgba(6,182,212,.1) 0%, transparent 40%), radial-gradient(circle at 80% 50%, rgba(34,211,238,.06) 0%, transparent 35%)',
    texture: 'linear-gradient(180deg, transparent 0%, rgba(6,182,212,.03) 30%, transparent 60%)',
    titleSize: { xs: '22px', sm: '30px', md: '38px' }, layout: 'magazine',
  },
  {
    id: 'apex', label: 'Apex', font: 'Helvetica',
    bg: 'linear-gradient(160deg, #050505 0%, #141414 35%, #0a0a0a 65%, #050505 100%)',
    cardBg: 'rgba(255,255,255,.03)', accent: '#f59e0b', accent2: '#fbbf24',
    glass: 'rgba(245,158,11,.1)', border: 'rgba(245,158,11,.15)',
    overlay: 'radial-gradient(circle at 50% 30%, rgba(245,158,11,.06) 0%, transparent 40%)',
    texture: 'none',
    titleSize: { xs: '24px', sm: '32px', md: '44px' }, layout: 'minimal',
  },
];

function MetricCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent: string }) {
  return (
    <Box sx={{ p: { xs: 1, sm: 1.5 }, borderRadius: 2, bgcolor: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)', backdropFilter: 'blur(8px)' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
        <Icon size={13} color={accent} />
        <Typography sx={{ color: 'rgba(255,255,255,.5)', fontSize: { xs: 9, sm: 10 }, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Typography>
      </Box>
      <Typography sx={{ color: 'white', fontSize: { xs: 15, sm: 20 }, fontWeight: 800 }}>{value}</Typography>
    </Box>
  );
}

function SlideContent({ slide, template, logo, businessName }: {
  slide: Slide; template: Template; logo?: string; businessName?: string;
}) {
  const { accent, glass, border, layout } = template;
  const isTitle = slide.type === 'title' || slide.type === 'closing';
  const L = layout;

  if (isTitle) {
    return (
      <>
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 2, textAlign: 'center', px: 3 }}>
          {logo && (
            <Box sx={{ mb: 2.5, position: 'relative' }}>
              <Avatar src={logo} sx={{ width: { xs: 60, sm: 80 }, height: { xs: 60, sm: 80 }, boxShadow: `0 0 40px ${accent}40, 0 0 80px ${accent}15` }} />
              <Box sx={{ position: 'absolute', inset: -8, borderRadius: '50%', border: `1px solid ${accent}20`, animation: 'pulse 3s ease-in-out infinite' }} />
            </Box>
          )}
          {businessName && (
            <Typography sx={{ color: `${accent}b3`, fontSize: { xs: 10, sm: 12 }, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', mb: 1.5 }}>
              {businessName}
            </Typography>
          )}
          <Typography sx={{ color: 'white', fontSize: template.titleSize, fontWeight: 900, lineHeight: 1.1, maxWidth: 700, letterSpacing: '-0.02em' }}>{slide.title}</Typography>
          {slide.content && <Typography sx={{ color: 'rgba(255,255,255,.55)', fontSize: { xs: 13, sm: 16, md: 18 }, mt: 2, maxWidth: 520, lineHeight: 1.7 }}>{slide.content}</Typography>}
          <Box sx={{ mt: 3, display: 'flex', gap: 1.5, alignItems: 'center' }}>
            {['problem', 'solution', 'market', 'traction'].map((t, i) => (
              <Box key={t} sx={{ width: { xs: 6, sm: 8 }, height: { xs: 6, sm: 8 }, borderRadius: '50%', bgcolor: i === 0 ? accent : `${accent}30` }} />
            ))}
          </Box>
        </Box>
        <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px', background: `linear-gradient(90deg, transparent, ${accent}40, transparent)` }} />
      </>
    );
  }

  return (
    <>
      {/* Top bar with logo and slide type */}
      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: { xs: 1.5, sm: 3 }, py: { xs: 1.5, sm: 2.5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {logo && <Avatar src={logo} sx={{ width: { xs: 18, sm: 22 }, height: { xs: 18, sm: 22 }, bgcolor: 'rgba(255,255,255,.05)' }} />}
          {businessName && <Typography sx={{ color: 'rgba(255,255,255,.25)', fontSize: { xs: 8, sm: 10 }, fontWeight: 600, letterSpacing: 0.5 }}>{businessName}</Typography>}
        </Box>
        <Chip label={slide.type?.replace('_', ' ') || 'slide'} size="small"
          sx={{ textTransform: 'capitalize', bgcolor: glass, color: accent, fontSize: { xs: 8, sm: 9 }, height: { xs: 18, sm: 22 }, border: `1px solid ${border}`, fontWeight: 600, backdropFilter: 'blur(8px)' }} />
      </Box>

      {/* Main content area */}
      <Box sx={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', px: { xs: 2, sm: 3.5, md: 5 }, pt: { xs: 5, sm: 6, md: 7 }, pb: { xs: 2, sm: 3 } }}>
        {/* Accent line */}
        <Box sx={{ width: { xs: 24, sm: 32 }, height: 2.5, borderRadius: 2, bgcolor: accent, mb: { xs: 1, sm: 1.5 }, boxShadow: `0 0 12px ${accent}50` }} />

        {/* Title */}
        <Typography sx={{
          color: 'white', fontSize: template.titleSize, fontWeight: 900, lineHeight: 1.15,
          mb: { xs: 0.75, sm: 1.25 }, letterSpacing: '-0.02em', maxWidth: '92%',
        }}>{slide.title}</Typography>

        {/* Image background */}
        {slide.image && (
          <Box sx={{ position: 'absolute', inset: 0, zIndex: 0, '&::after': { content: '""', position: 'absolute', inset: 0, background: template.bg, opacity: 0.7 } }}>
            <Box component="img" src={slide.image} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </Box>
        )}

        {/* Content + bullets */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: L === 'magazine' && slide.bullets?.length ? '1fr 1fr' : '1fr' }, gap: { xs: 1, sm: 2 }, mt: { xs: 0.5, sm: 1 } }}>
          <Box>
            {slide.content && (
              <Typography sx={{
                color: 'rgba(255,255,255,.7)', fontSize: { xs: 11, sm: 13, md: 15 }, lineHeight: 1.7,
                maxWidth: '95%',
              }}>{slide.content}</Typography>
            )}
          </Box>
          <Box>
            {slide.bullets && slide.bullets.length > 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 0.4, sm: 0.6 } }}>
                {slide.bullets.map((bullet, bi) => (
                  <Box key={bi} sx={{ display: 'flex', gap: { xs: 0.6, sm: 1 }, alignItems: 'flex-start', p: { xs: 0.5, sm: 0.75 }, borderRadius: 1.5, bgcolor: bi === 0 ? `rgba(255,255,255,.03)` : 'transparent', border: bi === 0 ? `1px solid ${accent}10` : 'none' }}>
                    <Box sx={{ minWidth: { xs: 4, sm: 5 }, height: { xs: 4, sm: 5 }, borderRadius: '50%', bgcolor: accent, mt: { xs: 0.6, sm: 0.7 }, boxShadow: `0 0 6px ${accent}60` }} />
                    <Typography sx={{ fontSize: { xs: 10.5, sm: 12, md: 14 }, lineHeight: 1.5, color: 'rgba(255,255,255,.82)' }}>{bullet}</Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Box>

        {/* Metrics row for relevant slide types */}
        {(slide.type === 'traction' || slide.type === 'financials' || slide.type === 'market') && (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: { xs: 0.5, sm: 1 }, mt: { xs: 1, sm: 2 }, maxWidth: '70%' }}>
            <MetricCard icon={TrendingUp} label="Growth" value="47%" accent={accent} />
            <MetricCard icon={Users} label="Users" value="12K+" accent={accent} />
            <MetricCard icon={DollarSign} label="ARR" value="$2.4M" accent={accent} />
          </Box>
        )}
      </Box>

      {/* Bottom decorative bar */}
      <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 2 }}>
        <Box sx={{ height: 2, bgcolor: accent, width: '30%', borderRadius: 1, mb: 0.5 }} />
        <Box sx={{ height: 1, bgcolor: `${accent}20`, width: '60%', borderRadius: 1 }} />
      </Box>
    </>
  );
}

export function SlideViewer({ slides, title, logo, businessName, primary: propPrimary }: SlideViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [templateId, setTemplateId] = useState('velocity');
  const viewerRef = useRef<HTMLDivElement>(null);

  const template = TEMPLATES.find(t => t.id === templateId) || TEMPLATES[0];
  const slide = slides[currentIndex];
  const total = slides.length;
  const accent = propPrimary || template.accent;

  const goTo = useCallback((index: number) => setCurrentIndex(Math.max(0, Math.min(index, total - 1))), [total]);
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'ArrowDown') { e.preventDefault(); goTo(currentIndex + 1); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); goTo(currentIndex - 1); }
    if (e.key === 'Escape') setFullscreen(false);
    if (e.key === 'f') setFullscreen(p => !p);
    if (e.key === 'g') goTo(0);
  }, [currentIndex, goTo]);

  useEffect(() => { window.addEventListener('keydown', handleKeyDown); return () => window.removeEventListener('keydown', handleKeyDown); }, [handleKeyDown]);
  useEffect(() => {
    if (fullscreen) { viewerRef.current?.requestFullscreen?.().catch(() => {}); document.body.style.overflow = 'hidden'; }
    else { document.exitFullscreen?.().catch(() => {}); document.body.style.overflow = ''; }
    return () => { document.body.style.overflow = ''; };
  }, [fullscreen]);

  const exportData = () => {
    const data = JSON.stringify({ title, template: templateId, slides }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
    a.click();
  };

  if (!slide) return null;

  return (
    <Box ref={viewerRef} sx={{ position: 'relative', width: '100%' }}>
      {/* Template selector */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5, flexWrap: 'wrap', px: { xs: 0.5, sm: 0 } }}>
        <Palette size={14} color="var(--vm-text-muted)" />
        {TEMPLATES.map(t => (
          <Chip key={t.id} label={t.label} size="small" onClick={() => setTemplateId(t.id)}
            sx={{ bgcolor: templateId === t.id ? `${t.accent}20` : 'rgba(255,255,255,.04)', color: templateId === t.id ? t.accent : 'var(--vm-text-secondary)', fontWeight: templateId === t.id ? 700 : 500, cursor: 'pointer', fontSize: 11, border: templateId === t.id ? `1px solid ${t.accent}30` : '1px solid transparent', '&:hover': { bgcolor: `${t.accent}15` } }} />
        ))}
      </Box>

      {/* Slide */}
      <Box sx={{
        position: 'relative', width: '100%', aspectRatio: '16 / 9',
        maxHeight: fullscreen ? '100vh' : { xs: 250, sm: 370, md: 470 },
        borderRadius: fullscreen ? 0 : { xs: 1.5, sm: 2.5 }, overflow: 'hidden',
        background: template.bg, border: fullscreen ? 'none' : `1px solid rgba(255,255,255,.06)`,
        boxShadow: fullscreen ? 'none' : `0 8px 40px rgba(0,0,0,.3), 0 0 80px ${accent}06`,
        transition: 'background .4s ease',
        '&:hover .slide-nav': { opacity: 1 },
        fontFamily: template.font,
      }}>
        {/* Overlay layers */}
        <Box sx={{ position: 'absolute', inset: 0, background: template.overlay, zIndex: 1, pointerEvents: 'none' }} />
        {template.texture !== 'none' && (
          <Box sx={{ position: 'absolute', inset: 0, background: template.texture, zIndex: 1, pointerEvents: 'none', opacity: 0.4 }} />
        )}

        {/* Top glow */}
        <Box sx={{ position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)', width: '50%', height: 160, background: `radial-gradient(ellipse, ${accent}12, transparent 70%)`, zIndex: 0, pointerEvents: 'none' }} />

        {/* Slide number */}
        <Box sx={{ position: 'absolute', bottom: { xs: 8, sm: 12 }, left: { xs: 12, sm: 20 }, zIndex: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ color: 'rgba(255,255,255,.15)', fontSize: { xs: 9, sm: 10 }, fontWeight: 600, fontFamily: 'monospace' }}>
            {String(currentIndex + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
          </Typography>
          <Box sx={{ width: 20, height: 1, bgcolor: `${accent}40` }} />
        </Box>

        <SlideContent slide={slide} template={template} logo={logo} businessName={businessName} />

        {/* Nav arrows */}
        <Box className="slide-nav" sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: 0, transition: 'opacity .25s', zIndex: 5, px: { xs: 0.5, sm: 1 } }}>
          <IconButton onClick={() => goTo(currentIndex - 1)} disabled={currentIndex === 0}
            sx={{ bgcolor: 'rgba(0,0,0,.4)', color: 'white', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,.06)', '&:hover': { bgcolor: 'rgba(0,0,0,.6)' }, '&.Mui-disabled': { opacity: 0.1 } }}>
            <ChevronLeft size={22} />
          </IconButton>
          <IconButton onClick={() => goTo(currentIndex + 1)} disabled={currentIndex === total - 1}
            sx={{ bgcolor: 'rgba(0,0,0,.4)', color: 'white', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,.06)', '&:hover': { bgcolor: 'rgba(0,0,0,.6)' }, '&.Mui-disabled': { opacity: 0.1 } }}>
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
            sx={{ width: { xs: 70, sm: 100 }, mx: 0.5, color: accent, '& .MuiSlider-thumb': { width: 12, height: 12, boxShadow: `0 0 8px ${accent}60` } }} />
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

interface SlideViewerProps {
  slides: Slide[];
  title: string;
  logo?: string;
  businessName?: string;
  primary?: string;
}
