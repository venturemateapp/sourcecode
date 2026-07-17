import { useState, useCallback, useRef, useEffect } from 'react';
import { Box, Typography, IconButton, Tooltip, Slider, Avatar, Chip } from '@mui/material';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Download, Palette, Eye } from 'lucide-react';
import type { PlanSection } from '../../types/venturemate';

const TEMPLATES = [
  { id: 'velocity', label: 'Velocity', font: 'Inter', bg: 'linear-gradient(160deg, #080c18, #0f1a3a)', accent: '#6366f1', glass: 'rgba(99,102,241,.12)', border: 'rgba(99,102,241,.2)' },
  { id: 'summit', label: 'Summit', font: 'Inter', bg: 'linear-gradient(160deg, #0a1410, #0f2a1a)', accent: '#10b981', glass: 'rgba(16,185,129,.12)', border: 'rgba(16,185,129,.2)' },
  { id: 'ignite', label: 'Ignite', font: 'Poppins', bg: 'linear-gradient(160deg, #0f0500, #2a0a00)', accent: '#f43f5e', glass: 'rgba(244,63,94,.12)', border: 'rgba(244,63,94,.2)' },
  { id: 'nova', label: 'Nova', font: 'Inter', bg: 'linear-gradient(160deg, #080812, #14102a)', accent: '#a78bfa', glass: 'rgba(167,139,250,.12)', border: 'rgba(167,139,250,.2)' },
  { id: 'catalyst', label: 'Catalyst', font: 'Inter', bg: 'linear-gradient(160deg, #0a0e1a, #14203a)', accent: '#06b6d4', glass: 'rgba(6,182,212,.12)', border: 'rgba(6,182,212,.2)' },
  { id: 'apex', label: 'Apex', font: 'Helvetica', bg: 'linear-gradient(160deg, #050505, #141414)', accent: '#f59e0b', glass: 'rgba(245,158,11,.1)', border: 'rgba(245,158,11,.15)' },
];

interface PlanViewerProps {
  title: string;
  summary: string;
  sections: PlanSection[];
  version: string;
  logo?: string;
  businessName?: string;
}

function SummarySlide({ summary, template, logo, businessName }: { summary: string; template: typeof TEMPLATES[0]; logo?: string; businessName?: string }) {
  const { accent } = template;
  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', px: { xs: 3, sm: 5, md: 8 } }}>
      {logo && (
        <Box sx={{ position: 'absolute', top: 20, left: 24, zIndex: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar src={logo} sx={{ width: 22, height: 22 }} />
          {businessName && <Typography sx={{ color: 'rgba(255,255,255,.3)', fontSize: 10, fontWeight: 600 }}>{businessName}</Typography>}
        </Box>
      )}
      <Box sx={{ position: 'relative', zIndex: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Eye size={16} color={accent} />
          <Typography sx={{ color: `${accent}cc`, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2 }}>Executive Summary</Typography>
        </Box>
        <Typography sx={{ color: 'white', fontSize: { xs: 20, sm: 28, md: 36 }, fontWeight: 900, lineHeight: 1.2, mb: 2, letterSpacing: '-0.02em' }}>Executive Summary</Typography>
        <Box sx={{ width: 40, height: 2.5, borderRadius: 2, bgcolor: accent, mb: 2, boxShadow: `0 0 12px ${accent}50` }} />
        <Typography sx={{ color: 'rgba(255,255,255,.75)', fontSize: { xs: 12, sm: 14, md: 16 }, lineHeight: 1.8, whiteSpace: 'pre-wrap', maxWidth: '90%' }}>{summary}</Typography>
      </Box>
      <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px', background: `linear-gradient(90deg, transparent, ${accent}40, transparent)` }} />
    </Box>
  );
}

function SectionSlide({ section, index, template, logo, businessName }: { section: PlanSection; index: number; template: typeof TEMPLATES[0]; logo?: string; businessName?: string }) {
  const { accent, glass, border } = template;
  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', px: { xs: 2, sm: 3.5, md: 5 }, pt: { xs: 5, sm: 6, md: 7 }, pb: { xs: 2, sm: 3 }, overflow: 'auto' }}>
      {logo && (
        <Box sx={{ position: 'absolute', top: 16, left: 20, zIndex: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar src={logo} sx={{ width: 18, height: 18 }} />
          {businessName && <Typography sx={{ color: 'rgba(255,255,255,.25)', fontSize: 9, fontWeight: 600 }}>{businessName}</Typography>}
        </Box>
      )}

      <Box sx={{ position: 'absolute', top: 16, right: 20, zIndex: 2 }}>
        <Chip label={`Section ${index + 1}`} size="small" sx={{ bgcolor: glass, color: accent, fontSize: 9, height: 20, border: `1px solid ${border}`, fontWeight: 600 }} />
      </Box>

      <Box sx={{ position: 'relative', zIndex: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ width: 28, height: 2.5, borderRadius: 2, bgcolor: accent, mb: 1.5, boxShadow: `0 0 10px ${accent}50` }} />
        <Typography sx={{ color: 'white', fontSize: { xs: 18, sm: 24, md: 32 }, fontWeight: 900, lineHeight: 1.15, mb: 1.5, letterSpacing: '-0.02em' }}>{section.title}</Typography>
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <Typography sx={{ color: 'rgba(255,255,255,.72)', fontSize: { xs: 11.5, sm: 13, md: 15 }, lineHeight: 1.85, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{section.content}</Typography>
          {section.subsections && section.subsections.length > 0 && (
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
              {section.subsections.map((sub, si) => (
                <Box key={si} sx={{ p: { xs: 1, sm: 1.5 }, borderRadius: 2, bgcolor: 'rgba(255,255,255,.03)', border: `1px solid ${accent}10` }}>
                  <Typography sx={{ color: accent, fontSize: { xs: 11, sm: 12 }, fontWeight: 700, mb: 0.5 }}>{sub.title}</Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,.6)', fontSize: { xs: 10.5, sm: 12 }, lineHeight: 1.7 }}>{sub.content}</Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Box>

      <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 2 }}>
        <Box sx={{ height: 2, bgcolor: accent, width: '30%', borderRadius: 1 }} />
      </Box>
    </Box>
  );
}

export function PlanViewer({ title, summary, sections, version, logo, businessName }: PlanViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [templateId, setTemplateId] = useState('velocity');
  const viewerRef = useRef<HTMLDivElement>(null);

  const template = TEMPLATES.find(t => t.id === templateId) || TEMPLATES[0];
  const hasSummary = summary?.length > 0;
  const totalSlides = sections.length + (hasSummary ? 1 : 0);
  const isSummary = hasSummary && currentIndex === 0;
  const sectionIndex = isSummary ? -1 : currentIndex - (hasSummary ? 1 : 0);
  const section = !isSummary && sectionIndex >= 0 ? sections[sectionIndex] : null;
  const accent = template.accent;

  const goTo = useCallback((i: number) => setCurrentIndex(Math.max(0, Math.min(i, totalSlides - 1))), [totalSlides]);
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'ArrowDown') { e.preventDefault(); goTo(currentIndex + 1); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); goTo(currentIndex - 1); }
    if (e.key === 'Escape') setFullscreen(false);
    if (e.key === 'f') setFullscreen(p => !p);
  }, [currentIndex, goTo]);

  useEffect(() => { window.addEventListener('keydown', handleKeyDown); return () => window.removeEventListener('keydown', handleKeyDown); }, [handleKeyDown]);
  useEffect(() => {
    if (fullscreen) { viewerRef.current?.requestFullscreen?.().catch(() => {}); document.body.style.overflow = 'hidden'; }
    else { document.exitFullscreen?.().catch(() => {}); document.body.style.overflow = ''; }
    return () => { document.body.style.overflow = ''; };
  }, [fullscreen]);

  const exportData = () => {
    const data = JSON.stringify({ title, version, template: templateId, summary, sections }, null, 2);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    a.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
    a.click();
  };

  return (
    <Box ref={viewerRef} sx={{ position: 'relative', width: '100%' }}>
      {/* Template selector */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5, flexWrap: 'wrap' }}>
        <Palette size={14} color="var(--vm-text-muted)" />
        {TEMPLATES.map(t => (
          <Chip key={t.id} label={t.label} size="small" onClick={() => setTemplateId(t.id)}
            sx={{ bgcolor: templateId === t.id ? `${t.accent}20` : 'rgba(255,255,255,.04)', color: templateId === t.id ? t.accent : 'var(--vm-text-secondary)', fontWeight: templateId === t.id ? 700 : 500, cursor: 'pointer', fontSize: 11, border: templateId === t.id ? `1px solid ${t.accent}30` : '1px solid transparent' }} />
        ))}
      </Box>

      {/* Slide */}
      <Box sx={{
        position: 'relative', width: '100%', aspectRatio: '16 / 9',
        maxHeight: fullscreen ? '100vh' : { xs: 280, sm: 400, md: 500 },
        borderRadius: fullscreen ? 0 : { xs: 1.5, sm: 2.5 }, overflow: 'hidden',
        background: template.bg, border: fullscreen ? 'none' : '1px solid rgba(255,255,255,.06)',
        boxShadow: fullscreen ? 'none' : `0 8px 40px rgba(0,0,0,.3), 0 0 80px ${accent}06`,
        '&:hover .slide-nav': { opacity: 1 },
        fontFamily: template.font,
      }}>
        <Box sx={{ position: 'absolute', inset: 0, background: template.bg, zIndex: 0 }} />
        <Box sx={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', background: `radial-gradient(circle at 50% 0%, ${accent}08, transparent 50%)` }} />

        {isSummary ? (
          <SummarySlide summary={summary} template={template} logo={logo} businessName={businessName} />
        ) : section ? (
          <SectionSlide section={section} index={sectionIndex} template={template} logo={logo} businessName={businessName} />
        ) : (
          <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography sx={{ color: 'rgba(255,255,255,.3)' }}>No content</Typography>
          </Box>
        )}

        <Box sx={{ position: 'absolute', bottom: 10, left: 16, zIndex: 2 }}>
          <Typography sx={{ color: 'rgba(255,255,255,.15)', fontSize: 9, fontWeight: 600, fontFamily: 'monospace' }}>
            {String(currentIndex + 1).padStart(2, '0')} / {String(totalSlides).padStart(2, '0')}
          </Typography>
        </Box>

        <Box className="slide-nav" sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: 0, transition: 'opacity .25s', zIndex: 5, px: { xs: 0.5, sm: 1 } }}>
          <IconButton onClick={() => goTo(currentIndex - 1)} disabled={currentIndex === 0}
            sx={{ bgcolor: 'rgba(0,0,0,.4)', color: 'white', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,.06)', '&.Mui-disabled': { opacity: 0.1 } }}>
            <ChevronLeft size={22} />
          </IconButton>
          <IconButton onClick={() => goTo(currentIndex + 1)} disabled={currentIndex === totalSlides - 1}
            sx={{ bgcolor: 'rgba(0,0,0,.4)', color: 'white', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,.06)', '&.Mui-disabled': { opacity: 0.1 } }}>
            <ChevronRight size={22} />
          </IconButton>
        </Box>
        <Box onClick={() => goTo(currentIndex + 1)} sx={{ position: 'absolute', inset: 0, cursor: 'pointer', zIndex: 3 }} />
      </Box>

      {/* Controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: { xs: 12, sm: 13 }, fontWeight: 700, color: 'var(--vm-text-primary)' }}>
            {isSummary ? 'Executive Summary' : section?.title || 'Business Plan'}
          </Typography>
          <Typography sx={{ fontSize: { xs: 10, sm: 11 }, color: 'var(--vm-text-muted)' }}>
            {title} · v{version} · {currentIndex + 1} of {totalSlides}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton size="small" onClick={() => goTo(currentIndex - 1)} disabled={currentIndex === 0} sx={{ color: 'var(--vm-text-muted)' }}><ChevronLeft size={16} /></IconButton>
          <Slider value={currentIndex} onChange={(_, v) => goTo(v as number)} min={0} max={Math.max(totalSlides - 1, 0)}
            sx={{ width: { xs: 70, sm: 100 }, mx: 0.5, color: accent, '& .MuiSlider-thumb': { width: 12, height: 12 } }} />
          <IconButton size="small" onClick={() => goTo(currentIndex + 1)} disabled={currentIndex >= totalSlides - 1} sx={{ color: 'var(--vm-text-muted)' }}><ChevronRight size={16} /></IconButton>
        </Box>
        <Tooltip title="Fullscreen (F)"><IconButton size="small" onClick={() => setFullscreen(p => !p)} sx={{ color: 'var(--vm-text-muted)' }}>{fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}</IconButton></Tooltip>
        <Tooltip title="Export"><IconButton size="small" onClick={exportData} sx={{ color: 'var(--vm-text-muted)' }}><Download size={15} /></IconButton></Tooltip>
      </Box>
    </Box>
  );
}
