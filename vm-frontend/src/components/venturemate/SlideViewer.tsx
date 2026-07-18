import { useState, useCallback, useRef, useEffect } from 'react';
import { Box, Typography, IconButton, Tooltip, Slider, Avatar, Chip } from '@mui/material';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Download, FileText, Palette, TrendingUp, Users, DollarSign } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import PptxGenJS from 'pptxgenjs';
import type { Slide } from '../../types/venturemate';

interface GlowPos {
  color: string; width: number; height: number; blur: number;
  top?: number; right?: number; bottom?: number; left?: number;
}

interface TemplateBg {
  base: string;
  glow1: GlowPos;
  glow2: GlowPos;
  mesh: string;
}

interface Template {
  id: string; label: string; font: string;
  accent: string; accent2: string;
  bg: TemplateBg;
  decoration: 'orb' | 'rings' | 'particles' | 'geometric' | 'rays' | 'minimal';
  glass: string; border: string;
  titleSize: Record<string, string>;
  layout: 'standard' | 'magazine' | 'minimal';
}

const TEMPLATE_BGS: Record<string, TemplateBg> = {
  velocity: {
    base: '#080c18',
    glow1: { color: '#6366f1', top: -192, right: -192, width: 650, height: 650, blur: 150 },
    glow2: { color: '#8b5cf6', bottom: -240, left: -160, width: 600, height: 600, blur: 160 },
    mesh: 'radial-gradient(circle at 20% 20%, rgba(99,102,241,.12), transparent 35%), radial-gradient(circle at 80% 70%, rgba(139,92,246,.08), transparent 40%)',
  },
  ignite: {
    base: '#0f0500',
    glow1: { color: '#f43f5e', top: -160, left: -160, width: 550, height: 550, blur: 140 },
    glow2: { color: '#e11d48', bottom: -200, right: -120, width: 500, height: 500, blur: 150 },
    mesh: 'radial-gradient(circle at 30% 10%, rgba(244,63,94,.15), transparent 40%), radial-gradient(circle at 70% 90%, rgba(225,29,72,.1), transparent 35%)',
  },
  summit: {
    base: '#0a1410',
    glow1: { color: '#10b981', top: -200, right: -160, width: 600, height: 600, blur: 140 },
    glow2: { color: '#34d399', bottom: -180, left: -200, width: 550, height: 550, blur: 130 },
    mesh: 'radial-gradient(circle at 80% 10%, rgba(16,185,129,.12), transparent 40%), radial-gradient(circle at 20% 90%, rgba(52,211,153,.08), transparent 35%)',
  },
  nova: {
    base: '#080812',
    glow1: { color: '#a78bfa', top: -160, right: -200, width: 580, height: 580, blur: 160 },
    glow2: { color: '#c4b5fd', bottom: -220, left: -140, width: 520, height: 520, blur: 140 },
    mesh: 'radial-gradient(circle at 40% 20%, rgba(167,139,250,.1), transparent 45%), radial-gradient(circle at 60% 80%, rgba(196,181,253,.06), transparent 35%)',
  },
  catalyst: {
    base: '#0a0e1a',
    glow1: { color: '#06b6d4', top: -180, left: -180, width: 620, height: 620, blur: 145 },
    glow2: { color: '#22d3ee', bottom: -160, right: -180, width: 580, height: 580, blur: 155 },
    mesh: 'radial-gradient(circle at 20% 50%, rgba(6,182,212,.1), transparent 40%), radial-gradient(circle at 80% 50%, rgba(34,211,238,.06), transparent 35%)',
  },
  apex: {
    base: '#050505',
    glow1: { color: '#f59e0b', top: -140, right: -140, width: 450, height: 450, blur: 120 },
    glow2: { color: '#fbbf24', bottom: -140, left: -140, width: 450, height: 450, blur: 120 },
    mesh: 'radial-gradient(circle at 50% 30%, rgba(245,158,11,.06), transparent 40%)',
  },
};

const TEMPLATES: Template[] = [
  {
    id: 'velocity', label: 'Velocity', font: 'Inter',
    accent: '#6366f1', accent2: '#8b5cf6',
    bg: TEMPLATE_BGS.velocity,
    decoration: 'orb',
    glass: 'rgba(99,102,241,.12)', border: 'rgba(99,102,241,.2)',
    titleSize: { xs: '22px', sm: '30px', md: '40px' }, layout: 'magazine',
  },
  {
    id: 'ignite', label: 'Ignite', font: 'Poppins',
    accent: '#f43f5e', accent2: '#e11d48',
    bg: TEMPLATE_BGS.ignite,
    decoration: 'particles',
    glass: 'rgba(244,63,94,.12)', border: 'rgba(244,63,94,.2)',
    titleSize: { xs: '24px', sm: '32px', md: '42px' }, layout: 'magazine',
  },
  {
    id: 'summit', label: 'Summit', font: 'Inter',
    accent: '#10b981', accent2: '#34d399',
    bg: TEMPLATE_BGS.summit,
    decoration: 'rings',
    glass: 'rgba(16,185,129,.12)', border: 'rgba(16,185,129,.2)',
    titleSize: { xs: '22px', sm: '30px', md: '38px' }, layout: 'standard',
  },
  {
    id: 'nova', label: 'Nova', font: 'Inter',
    accent: '#a78bfa', accent2: '#c4b5fd',
    bg: TEMPLATE_BGS.nova,
    decoration: 'geometric',
    glass: 'rgba(167,139,250,.12)', border: 'rgba(167,139,250,.2)',
    titleSize: { xs: '23px', sm: '31px', md: '41px' }, layout: 'minimal',
  },
  {
    id: 'catalyst', label: 'Catalyst', font: 'Inter',
    accent: '#06b6d4', accent2: '#22d3ee',
    bg: TEMPLATE_BGS.catalyst,
    decoration: 'rays',
    glass: 'rgba(6,182,212,.12)', border: 'rgba(6,182,212,.2)',
    titleSize: { xs: '22px', sm: '30px', md: '38px' }, layout: 'magazine',
  },
  {
    id: 'apex', label: 'Apex', font: 'Helvetica',
    accent: '#f59e0b', accent2: '#fbbf24',
    bg: TEMPLATE_BGS.apex,
    decoration: 'minimal',
    glass: 'rgba(245,158,11,.1)', border: 'rgba(245,158,11,.15)',
    titleSize: { xs: '24px', sm: '32px', md: '44px' }, layout: 'minimal',
  },
];

function AuroraBackground({ bg, accent }: { bg: TemplateBg; accent: string }) {
  return (
    <Box sx={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', '& > *': { position: 'absolute', pointerEvents: 'none' } }}>
      <Box sx={{ inset: 0, bgcolor: bg.base }} />
      <Box sx={{ top: bg.glow1.top, right: bg.glow1.right, width: bg.glow1.width, height: bg.glow1.height, borderRadius: '50%', background: `radial-gradient(circle, ${accent}22, transparent 70%)`, filter: `blur(${bg.glow1.blur}px)` }} />
      <Box sx={{ bottom: bg.glow2.bottom, left: bg.glow2.left, width: bg.glow2.width, height: bg.glow2.height, borderRadius: '50%', background: `radial-gradient(circle, ${accent}15, transparent 70%)`, filter: `blur(${bg.glow2.blur}px)` }} />
      <Box sx={{ inset: 0, opacity: 0.25, background: bg.mesh }} />
      <Box sx={{ inset: 0, opacity: 0.035, backgroundImage: `linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)`, backgroundSize: '48px 48px' }} />
      <Box sx={{ inset: 0, opacity: 0.03, mixBlendMode: 'overlay', backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.55'/%3E%3C/svg%3E")` }} />
    </Box>
  );
}

function DecorativeElement({ type, accent }: { type: Template['decoration']; accent: string }) {
  switch (type) {
    case 'orb':
      return (
        <Box sx={{ position: 'absolute', right: 40, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: { xs: 'none', lg: 'block' } }}>
          <Box sx={{ position: 'relative', width: 320, height: 320 }}>
            <Box sx={{ position: 'absolute', inset: 0, borderRadius: '50%', bgcolor: `${accent}20`, filter: 'blur(80px)' }} />
            <Box sx={{ position: 'absolute', inset: 12, borderRadius: '50%', border: '1px solid rgba(255,255,255,.08)' }} />
            <Box sx={{ position: 'absolute', inset: 36, borderRadius: '50%', border: '1px solid rgba(255,255,255,.08)' }} />
            <Box sx={{ position: 'absolute', inset: 72, borderRadius: '50%', background: `radial-gradient(circle at 30% 25%, rgba(255,255,255,.6), transparent 10%), radial-gradient(circle at 70% 70%, ${accent}88, transparent 45%), linear-gradient(135deg, ${accent}, ${accent}cc)`, boxShadow: `0 0 60px ${accent}40` }} />
            <Box sx={{ position: 'absolute', left: '40%', top: '35%', width: 60, height: 36, borderRadius: '50%', bgcolor: 'rgba(255,255,255,.2)', filter: 'blur(10px)', transform: 'rotate(-25deg)' }} />
          </Box>
        </Box>
      );
    case 'rings':
      return (
        <Box sx={{ position: 'absolute', right: -80, bottom: -80, pointerEvents: 'none' }}>
          <Box sx={{ position: 'relative', width: 400, height: 400 }}>
            <Box sx={{ position: 'absolute', inset: 20, borderRadius: '50%', border: `2px solid ${accent}15` }} />
            <Box sx={{ position: 'absolute', inset: 60, borderRadius: '50%', border: `1.5px solid ${accent}12` }} />
            <Box sx={{ position: 'absolute', inset: 100, borderRadius: '50%', border: `1px solid ${accent}10` }} />
            <Box sx={{ position: 'absolute', right: 40, top: 60, width: 16, height: 16, borderRadius: '50%', bgcolor: accent, boxShadow: `0 0 30px ${accent}60` }} />
            <Box sx={{ position: 'absolute', left: 80, bottom: 80, width: 10, height: 10, borderRadius: '50%', bgcolor: accent, boxShadow: `0 0 20px ${accent}40`, opacity: 0.6 }} />
          </Box>
        </Box>
      );
    case 'particles':
      return (
        <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          {[0, 1, 2, 3, 4].map(i => (
            <Box key={i} sx={{
              position: 'absolute',
              left: `${15 + i * 18}%`,
              top: `${20 + (i % 3) * 25}%`,
              width: 4 + i * 2, height: 4 + i * 2,
              borderRadius: '50%', bgcolor: accent,
              opacity: 0.15 + i * 0.04,
              boxShadow: `0 0 ${12 + i * 4}px ${accent}40`,
            }} />
          ))}
        </Box>
      );
    case 'geometric':
      return (
        <Box sx={{ position: 'absolute', right: -40, top: -40, pointerEvents: 'none' }}>
          <Box sx={{
            width: 300, height: 300,
            border: `1px solid ${accent}12`,
            transform: 'rotate(45deg)',
            borderRadius: 4,
          }} />
          <Box sx={{
            position: 'absolute', top: 40, left: 40,
            width: 220, height: 220,
            border: `1px solid ${accent}08`,
            transform: 'rotate(45deg)',
            borderRadius: 3,
          }} />
          <Box sx={{
            position: 'absolute', top: 80, left: 80,
            width: 140, height: 140,
            bgcolor: `${accent}06`,
            transform: 'rotate(45deg)',
            borderRadius: 2,
          }} />
        </Box>
      );
    case 'rays':
      return (
        <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          {[-30, -15, 0, 15, 30].map((angle, i) => (
            <Box key={i} sx={{
              position: 'absolute', top: '50%', left: '50%',
              width: '120%', height: 1,
              background: `linear-gradient(90deg, transparent, ${accent}08, transparent)`,
              transform: `translate(-50%, -50%) rotate(${angle}deg)`,
              transformOrigin: 'center',
            }} />
          ))}
        </Box>
      );
    default:
      return null;
  }
}

function GlassPanel({ children, sx }: { children: React.ReactNode; sx?: Record<string, unknown> }) {
  return (
    <Box sx={{
      position: 'relative', overflow: 'hidden', borderRadius: 3,
      border: '1px solid rgba(255,255,255,.07)',
      bgcolor: 'rgba(255,255,255,.03)', backdropFilter: 'blur(20px)',
      '&::before': {
        content: '""', position: 'absolute', inset: 0,
        background: 'linear-gradient(135deg, rgba(255,255,255,.06) 0%, transparent 50%)',
        pointerEvents: 'none',
      },
      ...sx,
    }}>
      <Box sx={{ position: 'relative', zIndex: 1 }}>{children}</Box>
    </Box>
  );
}

function MetricCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent: string }) {
  return (
    <GlassPanel sx={{ p: { xs: 1.25, sm: 1.75 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
        <Icon size={13} color={accent} />
        <Typography sx={{ color: 'rgba(255,255,255,.45)', fontSize: { xs: 9, sm: 10 }, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, overflowWrap: 'anywhere' }}>{label}</Typography>
      </Box>
      <Typography sx={{ color: 'white', fontSize: { xs: 16, sm: 22 }, fontWeight: 800, overflowWrap: 'anywhere' }}>{value}</Typography>
    </GlassPanel>
  );
}

function SlideContent({ slide, template, logo, businessName }: {
  slide: Slide; template: Template; logo?: string; businessName?: string;
}) {
  const { accent, glass, border, layout: L } = template;
  const isTitle = slide.type === 'title' || slide.type === 'closing';

  if (isTitle) {
    return (
      <>
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 3, textAlign: 'center', px: 3 }}>
          {logo && (
            <Box sx={{ mb: 2.5, position: 'relative' }}>
              <Avatar src={logo} sx={{ width: { xs: 60, sm: 80 }, height: { xs: 60, sm: 80 }, boxShadow: `0 0 40px ${accent}40, 0 0 80px ${accent}15` }} />
              <Box sx={{ position: 'absolute', inset: -8, borderRadius: '50%', border: `1px solid ${accent}20`, animation: 'pulse 3s ease-in-out infinite' }} />
            </Box>
          )}
          {businessName && (
            <Typography sx={{ color: `${accent}b3`, fontSize: { xs: 10, sm: 12 }, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', mb: 1.5, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {businessName}
            </Typography>
          )}
          <Typography sx={{ color: 'white', fontSize: template.titleSize, fontWeight: 900, lineHeight: 1.1, maxWidth: 700, letterSpacing: '-0.02em', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{slide.title}</Typography>
          {slide.content && <Typography sx={{ color: 'rgba(255,255,255,.55)', fontSize: { xs: 13, sm: 16, md: 18 }, mt: 2, maxWidth: 520, lineHeight: 1.7, overflowWrap: 'anywhere' }}>{slide.content}</Typography>}
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
      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: { xs: 1.5, sm: 3 }, py: { xs: 1.5, sm: 2.5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {logo && <Avatar src={logo} sx={{ width: { xs: 18, sm: 22 }, height: { xs: 18, sm: 22 }, bgcolor: 'rgba(255,255,255,.05)' }} />}
          {businessName && <Typography sx={{ color: 'rgba(255,255,255,.25)', fontSize: { xs: 8, sm: 10 }, fontWeight: 600, letterSpacing: 0.5, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{businessName}</Typography>}
        </Box>
        <Chip label={slide.type?.replace(/_/g, ' ') || 'slide'} size="small"
          sx={{ textTransform: 'capitalize', bgcolor: glass, color: accent, fontSize: { xs: 8, sm: 9 }, height: { xs: 18, sm: 22 }, border: `1px solid ${border}`, fontWeight: 600, backdropFilter: 'blur(8px)' }} />
      </Box>

      <Box sx={{ position: 'relative', zIndex: 3, display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', px: { xs: 2, sm: 3.5, md: 5 }, pt: { xs: 5, sm: 6, md: 7 }, pb: { xs: 2, sm: 3 } }}>
        <Box sx={{ width: { xs: 24, sm: 32 }, height: 2.5, borderRadius: 2, bgcolor: accent, mb: { xs: 1, sm: 1.5 }, boxShadow: `0 0 12px ${accent}50` }} />

        <Typography sx={{
          color: 'white', fontSize: template.titleSize, fontWeight: 900, lineHeight: 1.15,
          mb: { xs: 0.75, sm: 1.25 }, letterSpacing: '-0.02em', maxWidth: '92%',
          overflowWrap: 'anywhere', wordBreak: 'break-word',
        }}>{slide.title}</Typography>

        {slide.image && (
          <Box sx={{ position: 'absolute', inset: 0, zIndex: 0, '&::after': { content: '""', position: 'absolute', inset: 0, bgcolor: template.bg.base, opacity: 0.7 } }}>
            <Box component="img" src={slide.image} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </Box>
        )}

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: L === 'magazine' && slide.bullets?.length ? '1fr 1fr' : '1fr' }, gap: { xs: 1, sm: 2 }, mt: { xs: 0.5, sm: 1 } }}>
          <Box>
            {slide.content && (
              <Typography sx={{
                color: 'rgba(255,255,255,.7)', fontSize: { xs: 11, sm: 13, md: 15 }, lineHeight: 1.7,
                maxWidth: '95%', overflowWrap: 'anywhere',
              }}>{slide.content}</Typography>
            )}
          </Box>
          <Box>
            {slide.bullets && slide.bullets.length > 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 0.4, sm: 0.6 } }}>
                {slide.bullets.map((bullet, bi) => (
                  <Box key={bi} sx={{
                    display: 'flex', gap: { xs: 0.6, sm: 1 }, alignItems: 'flex-start',
                    p: { xs: 0.75, sm: 1 }, borderRadius: 2,
                    bgcolor: bi === 0 ? `rgba(255,255,255,.03)` : 'transparent',
                    border: bi === 0 ? `1px solid ${accent}10` : 'none',
                  }}>
                    <Box sx={{ minWidth: { xs: 4, sm: 5 }, height: { xs: 4, sm: 5 }, borderRadius: '50%', bgcolor: accent, mt: { xs: 0.6, sm: 0.7 }, boxShadow: `0 0 6px ${accent}60` }} />
                    <Typography sx={{ fontSize: { xs: 10.5, sm: 12, md: 14 }, lineHeight: 1.5, color: 'rgba(255,255,255,.82)', overflowWrap: 'anywhere' }}>{bullet}</Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Box>

        {(slide.type === 'traction' || slide.type === 'financials' || slide.type === 'market') && (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: { xs: 0.5, sm: 1 }, mt: { xs: 1, sm: 2 }, maxWidth: '70%' }}>
            <MetricCard icon={TrendingUp} label="Growth" value="47%" accent={accent} />
            <MetricCard icon={Users} label="Users" value="12K+" accent={accent} />
            <MetricCard icon={DollarSign} label="ARR" value="$2.4M" accent={accent} />
          </Box>
        )}
      </Box>

      <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 3 }}>
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

  const exportPDF = async () => {
    const el = viewerRef.current?.querySelector('[data-slide-container]') as HTMLElement;
    if (!el) return;
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1920, 1080] });
    const pageWidth = 1920; const pageHeight = 1080;
    for (let i = 0; i < total; i++) {
      goTo(i);
      await new Promise(r => setTimeout(r, 150));
      const el2 = viewerRef.current?.querySelector('[data-slide-inner]') as HTMLElement;
      if (!el2) continue;
      const canvas = await html2canvas(el2, { scale: 1.5, useCORS: true, backgroundColor: null });
      if (i > 0) pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pageWidth, pageHeight);
    }
    pdf.save(`${title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
  };

  const exportPPTX = () => {
    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: 'WIDE', width: 13.333, height: 7.5 });
    pptx.layout = 'WIDE';
    slides.forEach((s, i) => {
      const slide = pptx.addSlide();
      slide.background = { color: '08080B' };
      slide.addText(s.title, { x: 0.8, y: 1.5, w: 11.7, h: 1.2, fontSize: 36, fontFace: 'Inter', color: 'FFFFFF', bold: true });
      if (s.content) slide.addText(s.content, { x: 0.8, y: 3.2, w: 11.7, h: 1.5, fontSize: 16, fontFace: 'Inter', color: 'AAAAAA' });
      if (s.bullets) slide.addText(s.bullets.map(b => `• ${b}`).join('\n'), { x: 0.8, y: 5, w: 11.7, h: 2, fontSize: 14, fontFace: 'Inter', color: 'CCCCCC', lineSpacing: 24 });
      slide.addText(`${title} · ${i + 1}/${slides.length}`, { x: 0.8, y: 6.8, w: 11.7, h: 0.5, fontSize: 10, fontFace: 'Inter', color: '666666' });
    });
    pptx.writeFile({ fileName: `${title.replace(/[^a-zA-Z0-9]/g, '_')}.pptx` });
  };

  if (!slide) return null;

  return (
    <Box ref={viewerRef} sx={{ position: 'relative', width: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5, flexWrap: 'wrap', px: { xs: 0.5, sm: 0 } }}>
        <Palette size={14} color="var(--vm-text-muted)" />
        {TEMPLATES.map(t => (
          <Chip key={t.id} label={t.label} size="small" onClick={() => setTemplateId(t.id)}
            sx={{ bgcolor: templateId === t.id ? `${t.accent}20` : 'rgba(255,255,255,.04)', color: templateId === t.id ? t.accent : 'var(--vm-text-secondary)', fontWeight: templateId === t.id ? 700 : 500, cursor: 'pointer', fontSize: 11, border: templateId === t.id ? `1px solid ${t.accent}30` : '1px solid transparent', '&:hover': { bgcolor: `${t.accent}15` } }} />
        ))}
      </Box>

      <Box data-slide-container sx={{
        position: 'relative', width: '100%', aspectRatio: '16 / 9',
        maxHeight: fullscreen ? '100vh' : { xs: 250, sm: 370, md: 470 },
        borderRadius: fullscreen ? 0 : { xs: 1.5, sm: 2.5 }, overflow: 'hidden',
        border: fullscreen ? 'none' : '1px solid rgba(255,255,255,.06)',
        boxShadow: fullscreen ? 'none' : `0 8px 40px rgba(0,0,0,.3), 0 0 80px ${accent}06`,
        transition: 'background .4s ease',
        '&:hover .slide-nav': { opacity: 1 },
        fontFamily: template.font,
      }}>
        <Box data-slide-inner sx={{ position: 'absolute', inset: 0, overflow: 'auto' }}>
        <AuroraBackground bg={template.bg} accent={accent} />
        <DecorativeElement type={template.decoration} accent={accent} />

        <Box sx={{ position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)', width: '50%', height: 160, background: `radial-gradient(ellipse, ${accent}12, transparent 70%)`, zIndex: 1, pointerEvents: 'none' }} />

        <Box sx={{ position: 'absolute', bottom: { xs: 8, sm: 12 }, left: { xs: 12, sm: 20 }, zIndex: 4, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ color: 'rgba(255,255,255,.15)', fontSize: { xs: 9, sm: 10 }, fontWeight: 600, fontFamily: 'monospace' }}>
            {String(currentIndex + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
          </Typography>
          <Box sx={{ width: 20, height: 1, bgcolor: `${accent}40` }} />
        </Box>

        <SlideContent slide={slide} template={template} logo={logo} businessName={businessName} />

        <Box className="slide-nav" sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: 0, transition: 'opacity .25s', zIndex: 6, px: { xs: 0.5, sm: 1 } }}>
          <IconButton onClick={() => goTo(currentIndex - 1)} disabled={currentIndex === 0}
            sx={{ bgcolor: 'rgba(0,0,0,.4)', color: 'white', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,.06)', '&:hover': { bgcolor: 'rgba(0,0,0,.6)' }, '&.Mui-disabled': { opacity: 0.1 } }}>
            <ChevronLeft size={22} />
          </IconButton>
          <IconButton onClick={() => goTo(currentIndex + 1)} disabled={currentIndex === total - 1}
            sx={{ bgcolor: 'rgba(0,0,0,.4)', color: 'white', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,.06)', '&:hover': { bgcolor: 'rgba(0,0,0,.6)' }, '&.Mui-disabled': { opacity: 0.1 } }}>
            <ChevronRight size={22} />
          </IconButton>
        </Box>
        <Box onClick={() => goTo(currentIndex + 1)} sx={{ position: 'absolute', inset: 0, cursor: 'pointer', zIndex: 4 }} />
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: { xs: 12, sm: 13 }, fontWeight: 700, color: 'var(--vm-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{slide.title}</Typography>
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
        <Tooltip title="Download PDF"><IconButton size="small" onClick={exportPDF} sx={{ color: 'var(--vm-text-muted)' }}><FileText size={15} /></IconButton></Tooltip>
        <Tooltip title="Download PPTX"><IconButton size="small" onClick={exportPPTX} sx={{ color: 'var(--vm-text-muted)' }}><Download size={15} /></IconButton></Tooltip>
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
