import { useState, useCallback, useRef, useEffect } from 'react';
import { Box, Typography, IconButton, Tooltip, Slider, Avatar, Chip, CircularProgress } from '@mui/material';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Download, FileText, Eye } from 'lucide-react';
import { CreativeTemplatePicker } from './CreativeTemplatePicker';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import PptxGenJS from 'pptxgenjs';
import type { PlanSection } from '../../types/venturemate';
import { safeDownloadName } from '../../lib/pitchDeckExport';
import { ExportProgress } from '../shared/ExportProgress';

type Decoration =
  | 'orb' | 'rings' | 'particles' | 'geometric' | 'rays' | 'minimal'
  | 'facets' | 'pulse-grid' | 'horizon' | 'bokeh' | 'contour' | 'prism';

interface Template {
  id: string; label: string; font: string;
  accent: string; accent2: string;
  baseBg: string;
  decoration: Decoration;
  glass: string; border: string;
}

const TEMPLATES: Template[] = [
  {
    id: 'velocity', label: 'Velocity', font: 'Inter',
    accent: '#6366f1', accent2: '#8b5cf6', baseBg: '#080c18',
    decoration: 'orb', glass: 'rgba(99,102,241,.12)', border: 'rgba(99,102,241,.2)',
  },
  {
    id: 'ignite', label: 'Ignite', font: 'Poppins',
    accent: '#f43f5e', accent2: '#e11d48', baseBg: '#0f0500',
    decoration: 'particles', glass: 'rgba(244,63,94,.12)', border: 'rgba(244,63,94,.2)',
  },
  {
    id: 'summit', label: 'Summit', font: 'Inter',
    accent: '#10b981', accent2: '#34d399', baseBg: '#0a1410',
    decoration: 'rings', glass: 'rgba(16,185,129,.12)', border: 'rgba(16,185,129,.2)',
  },
  {
    id: 'nova', label: 'Nova', font: 'Inter',
    accent: '#a78bfa', accent2: '#c4b5fd', baseBg: '#080812',
    decoration: 'geometric', glass: 'rgba(167,139,250,.12)', border: 'rgba(167,139,250,.2)',
  },
  {
    id: 'catalyst', label: 'Catalyst', font: 'Inter',
    accent: '#06b6d4', accent2: '#22d3ee', baseBg: '#0a0e1a',
    decoration: 'rays', glass: 'rgba(6,182,212,.12)', border: 'rgba(6,182,212,.2)',
  },
  {
    id: 'apex', label: 'Apex', font: 'Helvetica',
    accent: '#f59e0b', accent2: '#fbbf24', baseBg: '#050505',
    decoration: 'minimal', glass: 'rgba(245,158,11,.1)', border: 'rgba(245,158,11,.15)',
  },

  // ---- new, high-end additions -------------------------------------------
  {
    id: 'onyx', label: 'Onyx', font: 'Söhne, Inter',
    // quiet, monochrome, jeweler's-case luxury — light does the talking, not color
    accent: '#e4e4e7', accent2: '#a1a1aa', baseBg: '#0a0a0c',
    decoration: 'facets', glass: 'rgba(228,228,231,.06)', border: 'rgba(228,228,231,.14)',
  },
  {
    id: 'cobalt', label: 'Cobalt', font: 'Inter',
    // institutional, sapphire-on-ink, for a finance/enterprise narrative
    accent: '#3b82f6', accent2: '#1d4ed8', baseBg: '#05070f',
    decoration: 'pulse-grid', glass: 'rgba(59,130,246,.1)', border: 'rgba(59,130,246,.18)',
  },
  {
    id: 'solstice', label: 'Solstice', font: 'Poppins',
    // warm sunrise gradient — the one template that isn't a black-box glow
    accent: '#fb923c', accent2: '#f472b6', baseBg: '#160a08',
    decoration: 'horizon', glass: 'rgba(251,146,60,.12)', border: 'rgba(251,146,60,.2)',
  },
  {
    id: 'bloom', label: 'Bloom', font: 'Poppins',
    // soft, editorial, fashion-adjacent — for consumer/lifestyle plans
    accent: '#e879f9', accent2: '#f0abfc', baseBg: '#0e0510',
    decoration: 'bokeh', glass: 'rgba(232,121,249,.1)', border: 'rgba(232,121,249,.18)',
  },
  {
    id: 'slate', label: 'Slate', font: 'Inter',
    // dry, technical, cartographic — for infra / deep-tech narratives
    accent: '#94a3b8', accent2: '#64748b', baseBg: '#0a0d11',
    decoration: 'contour', glass: 'rgba(148,163,184,.08)', border: 'rgba(148,163,184,.16)',
  },
  {
    id: 'prism', label: 'Prism', font: 'Inter',
    // multi-hue refraction — the boldest of the set, for design-forward founders
    accent: '#22d3ee', accent2: '#f472b6', baseBg: '#050508',
    decoration: 'prism', glass: 'rgba(34,211,238,.1)', border: 'rgba(34,211,238,.18)',
  },
];

function AuroraBg({ accent, baseBg }: { accent: string; baseBg: string }) {
  return (
    <Box sx={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', '& > *': { position: 'absolute', pointerEvents: 'none' } }}>
      <Box sx={{ inset: 0, bgcolor: baseBg }} />
      <Box sx={{ top: -192, right: -160, width: 550, height: 550, borderRadius: '50%', background: `radial-gradient(circle, ${accent}22, transparent 70%)`, filter: 'blur(140px)' }} />
      <Box sx={{ bottom: -200, left: -140, width: 500, height: 500, borderRadius: '50%', background: `radial-gradient(circle, ${accent}15, transparent 70%)`, filter: 'blur(150px)' }} />
      <Box sx={{ inset: 0, opacity: 0.25, background: `radial-gradient(circle at 50% 0%, ${accent}08, transparent 50%)` }} />
      <Box sx={{ inset: 0, opacity: 0.035, backgroundImage: `linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)`, backgroundSize: '48px 48px' }} />
      <Box sx={{ inset: 0, opacity: 0.03, mixBlendMode: 'overlay', backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.55'/%3E%3C/svg%3E")` }} />
    </Box>
  );
}

function Decoration({ type, accent, accent2 }: { type: Decoration; accent: string; accent2?: string }) {
  switch (type) {
    case 'orb':
      return (
        <Box sx={{ position: 'absolute', right: 20, top: '40%', pointerEvents: 'none', display: { xs: 'none', lg: 'block' } }}>
          <Box sx={{ position: 'relative', width: 250, height: 250 }}>
            <Box sx={{ position: 'absolute', inset: 0, borderRadius: '50%', bgcolor: `${accent}20`, filter: 'blur(60px)' }} />
            <Box sx={{ position: 'absolute', inset: 10, borderRadius: '50%', border: '1px solid rgba(255,255,255,.07)' }} />
            <Box sx={{ position: 'absolute', inset: 30, borderRadius: '50%', border: '1px solid rgba(255,255,255,.07)' }} />
            <Box sx={{ position: 'absolute', inset: 60, borderRadius: '50%', background: `radial-gradient(circle at 30% 25%, rgba(255,255,255,.5), transparent 10%), linear-gradient(135deg, ${accent}, ${accent}aa)`, boxShadow: `0 0 40px ${accent}30` }} />
          </Box>
        </Box>
      );
    case 'rings':
      return (
        <Box sx={{ position: 'absolute', right: -60, bottom: -60, pointerEvents: 'none' }}>
          <Box sx={{ width: 320, height: 320 }}>
            <Box sx={{ position: 'absolute', inset: 15, borderRadius: '50%', border: `1.5px solid ${accent}12` }} />
            <Box sx={{ position: 'absolute', inset: 50, borderRadius: '50%', border: `1px solid ${accent}10` }} />
            <Box sx={{ position: 'absolute', inset: 85, borderRadius: '50%', border: `1px solid ${accent}08` }} />
          </Box>
        </Box>
      );
    case 'particles':
      return (
        <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          {[0, 1, 2, 3].map(i => (
            <Box key={i} sx={{
              position: 'absolute', left: `${20 + i * 20}%`, top: `${15 + (i % 2) * 50}%`,
              width: 3 + i * 2, height: 3 + i * 2, borderRadius: '50%',
              bgcolor: accent, opacity: 0.12 + i * 0.03,
              boxShadow: `0 0 ${10 + i * 6}px ${accent}30`,
            }} />
          ))}
        </Box>
      );
    case 'geometric':
      return (
        <Box sx={{ position: 'absolute', right: -30, top: -30, pointerEvents: 'none' }}>
          <Box sx={{ width: 240, height: 240, border: `1px solid ${accent}10`, transform: 'rotate(45deg)', borderRadius: 3 }} />
          <Box sx={{ position: 'absolute', top: 30, left: 30, width: 180, height: 180, border: `1px solid ${accent}06`, transform: 'rotate(45deg)', borderRadius: 2 }} />
          <Box sx={{ position: 'absolute', top: 60, left: 60, width: 120, height: 120, bgcolor: `${accent}04`, transform: 'rotate(45deg)', borderRadius: 2 }} />
        </Box>
      );
    case 'rays':
      return (
        <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          {[-20, -10, 0, 10, 20].map((a, i) => (
            <Box key={i} sx={{ position: 'absolute', top: '50%', left: '50%', width: '120%', height: 1, background: `linear-gradient(90deg, transparent, ${accent}06, transparent)`, transform: `translate(-50%,-50%) rotate(${a}deg)` }} />
          ))}
        </Box>
      );

    // ---- new decorations ---------------------------------------------

    case 'facets':
      // Onyx — a single large faceted gem cut from straight lines only. Quiet, no glow bloom.
      return (
        <Box sx={{ position: 'absolute', right: 40, top: '42%', pointerEvents: 'none', display: { xs: 'none', lg: 'block' } }}>
          <Box sx={{ position: 'relative', width: 240, height: 240 }}>
            <Box sx={{
              position: 'absolute', inset: 0,
              clipPath: 'polygon(50% 0%, 90% 25%, 100% 65%, 65% 100%, 20% 90%, 0% 45%)',
              background: `linear-gradient(155deg, rgba(255,255,255,.06) 0%, transparent 45%, ${accent}0f 100%)`,
              border: '1px solid rgba(255,255,255,.1)',
            }} />
            <Box sx={{
              position: 'absolute', inset: 30,
              clipPath: 'polygon(50% 0%, 90% 25%, 100% 65%, 65% 100%, 20% 90%, 0% 45%)',
              border: '1px solid rgba(255,255,255,.06)',
            }} />
            <Box sx={{ position: 'absolute', left: '30%', top: '16%', width: 60, height: 2, bgcolor: 'rgba(255,255,255,.32)', transform: 'rotate(18deg)', filter: 'blur(.5px)' }} />
          </Box>
        </Box>
      );
    case 'pulse-grid':
      // Cobalt — a faint blueprint grid with a few instrument-panel nodes. Reads as "systems".
      return (
        <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          <Box sx={{
            position: 'absolute', inset: 0, opacity: 0.5,
            backgroundImage: `linear-gradient(${accent}14 1px, transparent 1px), linear-gradient(90deg, ${accent}14 1px, transparent 1px)`,
            backgroundSize: '56px 56px',
            maskImage: 'radial-gradient(ellipse 70% 60% at 75% 30%, black, transparent 75%)',
          }} />
          {[{ l: '70%', t: '22%' }, { l: '82%', t: '38%' }, { l: '60%', t: '42%' }].map((p, i) => (
            <Box key={i} sx={{ position: 'absolute', left: p.l, top: p.t, width: 5, height: 5, borderRadius: '50%', bgcolor: accent, boxShadow: `0 0 12px 3px ${accent}70` }} />
          ))}
        </Box>
      );
    case 'horizon':
      // Solstice — a low sun disc sitting on stacked gradient bands, like a title card at dawn.
      return (
        <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          <Box sx={{
            position: 'absolute', left: '50%', bottom: '16%', transform: 'translateX(-50%)',
            width: 200, height: 200, borderRadius: '50%',
            background: `radial-gradient(circle at 50% 35%, ${accent}, ${accent}00 72%)`,
            opacity: 0.45, filter: 'blur(2px)',
          }} />
          {[0, 1, 2, 3].map(i => (
            <Box key={i} sx={{
              position: 'absolute', left: 0, right: 0, bottom: `${8 + i * 6}%`, height: 1,
              background: `linear-gradient(90deg, transparent, ${accent}${i === 1 ? '2a' : '16'}, transparent)`,
            }} />
          ))}
        </Box>
      );
    case 'bokeh':
      // Bloom — soft, unevenly sized overlapping discs, editorial rather than "confetti".
      return (
        <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          {[
            { l: '72%', t: '16%', s: 80, o: 0.15 },
            { l: '86%', t: '42%', s: 40, o: 0.2 },
            { l: '62%', t: '58%', s: 110, o: 0.09 },
            { l: '90%', t: '70%', s: 26, o: 0.25 },
          ].map((c, i) => (
            <Box key={i} sx={{
              position: 'absolute', left: c.l, top: c.t, width: c.s, height: c.s, borderRadius: '50%',
              background: `radial-gradient(circle, ${accent}, transparent 70%)`,
              opacity: c.o, filter: 'blur(6px)',
            }} />
          ))}
        </Box>
      );
    case 'contour':
      // Slate — topographic contour lines, dry and technical, for infra-flavoured plans.
      return (
        <Box sx={{ position: 'absolute', right: -100, bottom: -120, pointerEvents: 'none' }}>
          {[380, 320, 260, 200, 150].map((size, i) => (
            <Box key={i} sx={{
              position: 'absolute', right: 0, bottom: 0,
              width: size, height: size * 0.7,
              border: `1px solid ${accent}${i % 2 === 0 ? '16' : '0d'}`,
              borderRadius: '48% 52% 45% 55% / 55% 45% 55% 45%',
            }} />
          ))}
        </Box>
      );
    case 'prism':
      // Prism — refracted triangle shards in three hues, the one deliberately maximal motif.
      return (
        <Box sx={{ position: 'absolute', right: 10, top: '40%', pointerEvents: 'none', display: { xs: 'none', lg: 'block' } }}>
          <Box sx={{ position: 'relative', width: 260, height: 260 }}>
            <Box sx={{ position: 'absolute', inset: 0, clipPath: 'polygon(30% 0%, 100% 15%, 70% 100%)', background: `linear-gradient(160deg, ${accent}33, transparent 70%)` }} />
            <Box sx={{ position: 'absolute', inset: 0, clipPath: 'polygon(0% 40%, 55% 20%, 40% 100%)', background: `linear-gradient(200deg, ${accent2 || accent}2b, transparent 70%)`, mixBlendMode: 'screen' }} />
            <Box sx={{ position: 'absolute', inset: 0, clipPath: 'polygon(20% 70%, 90% 55%, 60% 100%)', background: `linear-gradient(20deg, #a78bfa22, transparent 65%)`, mixBlendMode: 'screen' }} />
          </Box>
        </Box>
      );
    default:
      return null;
  }
}

function SummarySlide({ summary, template, logo, businessName }: { summary: string; template: Template; logo?: string; businessName?: string }) {
  const { accent, accent2 } = template;
  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <AuroraBg accent={accent} baseBg={template.baseBg} />
      <Decoration type={template.decoration} accent={accent} accent2={accent2} />

      {logo && (
        <Box sx={{ position: 'absolute', top: 20, left: 24, zIndex: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar src={logo} sx={{ width: 22, height: 22 }} />
          {businessName && <Typography sx={{ color: 'rgba(255,255,255,.3)', fontSize: 10, fontWeight: 600, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{businessName}</Typography>}
        </Box>
      )}

      <Box sx={{ position: 'relative', zIndex: 3, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', px: { xs: 3, sm: 5, md: 8 }, overflow: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Eye size={16} color={accent} />
          <Typography sx={{ color: `${accent}cc`, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2 }}>Executive Summary</Typography>
        </Box>
        <Typography sx={{ color: 'white', fontSize: { xs: 20, sm: 28, md: 36 }, fontWeight: 900, lineHeight: 1.2, mb: 2, letterSpacing: '-0.02em' }}>Executive Summary</Typography>
        <Box sx={{ width: 40, height: 2.5, borderRadius: 2, bgcolor: accent, mb: 2, boxShadow: `0 0 12px ${accent}50` }} />
        <Typography sx={{ color: 'rgba(255,255,255,.72)', fontSize: { xs: 12, sm: 14, md: 16 }, lineHeight: 1.8, whiteSpace: 'pre-wrap', maxWidth: '90%', overflowWrap: 'anywhere' }}>{summary}</Typography>
      </Box>

      <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px', background: `linear-gradient(90deg, transparent, ${accent}40, transparent)` }} />
    </Box>
  );
}

function SectionSlide({ section, index, template, logo, businessName }: { section: PlanSection; index: number; template: Template; logo?: string; businessName?: string }) {
  const { accent, accent2, glass, border } = template;
  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <AuroraBg accent={accent} baseBg={template.baseBg} />
      <Decoration type={template.decoration} accent={accent} accent2={accent2} />

      {logo && (
        <Box sx={{ position: 'absolute', top: 16, left: 20, zIndex: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar src={logo} sx={{ width: 18, height: 18 }} />
          {businessName && <Typography sx={{ color: 'rgba(255,255,255,.25)', fontSize: 9, fontWeight: 600, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{businessName}</Typography>}
        </Box>
      )}

      <Box sx={{ position: 'absolute', top: 16, right: 20, zIndex: 3 }}>
        <Chip label={`Section ${index + 1}`} size="small" sx={{ bgcolor: glass, color: accent, fontSize: 9, height: 20, border: `1px solid ${border}`, fontWeight: 600, backdropFilter: 'blur(8px)' }} />
      </Box>

      <Box sx={{ position: 'relative', zIndex: 3, height: '100%', display: 'flex', flexDirection: 'column', px: { xs: 2, sm: 3.5, md: 5 }, pt: { xs: 5, sm: 6, md: 7 }, pb: { xs: 2, sm: 3 }, overflow: 'auto' }}>
        <Box sx={{ width: 28, height: 2.5, borderRadius: 2, bgcolor: accent, mb: 1.5, boxShadow: `0 0 10px ${accent}50` }} />
        <Typography sx={{ color: 'white', fontSize: { xs: 18, sm: 24, md: 32 }, fontWeight: 900, lineHeight: 1.15, mb: 1.5, letterSpacing: '-0.02em', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{section.title}</Typography>
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <Typography sx={{ color: 'rgba(255,255,255,.68)', fontSize: { xs: 11.5, sm: 13, md: 15 }, lineHeight: 1.85, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{section.content}</Typography>
          {section.subsections && section.subsections.length > 0 && (
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
              {section.subsections.map((sub, si) => (
                <Box key={si} sx={{
                  position: 'relative', overflow: 'hidden', p: { xs: 1, sm: 1.5 }, borderRadius: 2,
                  bgcolor: 'rgba(255,255,255,.03)', border: `1px solid ${accent}10`,
                  backdropFilter: 'blur(8px)',
                }}>
                  <Box sx={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${accent}06, transparent)`, pointerEvents: 'none' }} />
                  <Typography sx={{ position: 'relative', color: accent, fontSize: { xs: 11, sm: 12 }, fontWeight: 700, mb: 0.5, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{sub.title}</Typography>
                  <Typography sx={{ position: 'relative', color: 'rgba(255,255,255,.55)', fontSize: { xs: 10.5, sm: 12 }, lineHeight: 1.7, overflowWrap: 'anywhere' }}>{sub.content}</Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Box>

      <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 3 }}>
        <Box sx={{ height: 2, bgcolor: accent, width: '30%', borderRadius: 1 }} />
      </Box>
    </Box>
  );
}

export function PlanViewer({ title, summary, sections, version, logo, businessName }: PlanViewerProps) {
  const [pptxExporting, setPptxExporting] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);
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

  const exportPDF = async () => {
    const el = viewerRef.current?.querySelector('[data-plan-container]') as HTMLElement;
    if (!el || pdfExporting) return;
    setPdfExporting(true);
    try {
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1920, 1080] });
      const pageWidth = 1920; const pageHeight = 1080;
      for (let i = 0; i < totalSlides; i++) {
        goTo(i);
        await new Promise(r => setTimeout(r, 150));
        const el2 = viewerRef.current?.querySelector('[data-plan-inner]') as HTMLElement;
        if (!el2) continue;
        const canvas = await html2canvas(el2, { scale: 1.5, useCORS: true, backgroundColor: null });
        if (i > 0) pdf.addPage();
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pageWidth, pageHeight);
      }
      pdf.save(`${title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
    } catch (error) {
      console.error('Business plan PDF export failed', error);
      window.alert(error instanceof Error ? error.message : 'PDF export failed. Please try again.');
    } finally {
      setPdfExporting(false);
    }
  };

  const exportPPTX = async () => {
    if (pptxExporting) return;
    setPptxExporting(true);
    try {
      const pptx = new PptxGenJS();
      pptx.defineLayout({ name: 'WIDE', width: 13.333, height: 7.5 });
      pptx.layout = 'WIDE';
      if (hasSummary) {
        const slide = pptx.addSlide();
        slide.background = { color: '08080B' };
        slide.addText('Executive Summary', { x: 0.8, y: 1, w: 11.7, h: 1.2, fontSize: 36, fontFace: 'Aptos Display', color: 'FFFFFF', bold: true });
        slide.addText(summary, { x: 0.8, y: 2.5, w: 11.7, h: 4, fontSize: 14, fontFace: 'Aptos', color: 'CBD5E1', fit: 'shrink' });
      }
      sections.forEach((s, i) => {
        const slide = pptx.addSlide();
        slide.background = { color: '08080B' };
        slide.addText(s.title, { x: 0.8, y: 0.8, w: 11.7, h: 1, fontSize: 30, fontFace: 'Aptos Display', color: 'FFFFFF', bold: true, fit: 'shrink' });
        slide.addText(s.content, { x: 0.8, y: 2.2, w: 11.7, h: 2.5, fontSize: 13, fontFace: 'Aptos', color: 'CBD5E1', fit: 'shrink' });
        if (s.subsections?.length) {
          slide.addText(s.subsections.map(sub => `${sub.title}\n${sub.content}`).join('\n\n'), { x: 0.8, y: 4.9, w: 11.7, h: 1.65, fontSize: 11, fontFace: 'Aptos', color: '94A3B8', fit: 'shrink' });
        }
        slide.addText(`${title} · v${version} · ${i + 1}/${sections.length}`, { x: 0.8, y: 6.8, w: 11.7, h: 0.5, fontSize: 10, fontFace: 'Aptos', color: '64748B' });
      });
      await pptx.writeFile({ fileName: `${safeDownloadName(title, 'business-plan')}.pptx`, compression: true });
    } catch (error) {
      console.error('Business plan PPTX export failed', error);
      window.alert(error instanceof Error ? error.message : 'PowerPoint export failed. Please try again.');
    } finally {
      setPptxExporting(false);
    }
  };

  return (
    <Box ref={viewerRef} sx={{ position: 'relative', width: '100%' }}>
      <Box sx={{ mb: 1.5 }}>
        <CreativeTemplatePicker templates={TEMPLATES} value={templateId} onChange={setTemplateId} />
      </Box>

      <Box data-plan-container sx={{
        position: 'relative', width: '100%', aspectRatio: '16 / 9',
        maxHeight: fullscreen ? '100vh' : { xs: 280, sm: 400, md: 500 },
        borderRadius: fullscreen ? 0 : { xs: 1.5, sm: 2.5 }, overflow: 'hidden',
        border: fullscreen ? 'none' : '1px solid rgba(255,255,255,.06)',
        boxShadow: fullscreen ? 'none' : `0 8px 40px rgba(0,0,0,.3), 0 0 80px ${accent}06`,
        '&:hover .slide-nav': { opacity: 1 },
        fontFamily: template.font,
      }}>
        <Box data-plan-inner sx={{ position: 'absolute', inset: 0, overflow: 'auto' }}>
        {isSummary ? (
          <SummarySlide summary={summary} template={template} logo={logo} businessName={businessName} />
        ) : section ? (
          <SectionSlide section={section} index={sectionIndex} template={template} logo={logo} businessName={businessName} />
        ) : (
          <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography sx={{ color: 'rgba(255,255,255,.3)' }}>No content</Typography>
          </Box>
        )}

        <Box sx={{ position: 'absolute', bottom: 10, left: 16, zIndex: 4 }}>
          <Typography sx={{ color: 'rgba(255,255,255,.15)', fontSize: 9, fontWeight: 600, fontFamily: 'monospace' }}>
            {String(currentIndex + 1).padStart(2, '0')} / {String(totalSlides).padStart(2, '0')}
          </Typography>
        </Box>

        <Box className="slide-nav" sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: 0, transition: 'opacity .25s', zIndex: 6, px: { xs: 0.5, sm: 1 } }}>
          <IconButton onClick={() => goTo(currentIndex - 1)} disabled={currentIndex === 0}
            sx={{ bgcolor: 'rgba(0,0,0,.4)', color: 'white', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,.06)' }}>
            <ChevronLeft size={22} />
          </IconButton>
          <IconButton onClick={() => goTo(currentIndex + 1)} disabled={currentIndex === totalSlides - 1}
            sx={{ bgcolor: 'rgba(0,0,0,.4)', color: 'white', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,.06)' }}>
            <ChevronRight size={22} />
          </IconButton>
        </Box>
        <Box onClick={() => goTo(currentIndex + 1)} sx={{ position: 'absolute', inset: 0, cursor: 'pointer', zIndex: 4 }} />
        </Box>
      </Box>

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
        <Tooltip title={pdfExporting ? 'Creating PDF…' : 'Download PDF'}><span><IconButton size="small" disabled={pdfExporting || pptxExporting} onClick={exportPDF} sx={{ color: 'var(--vm-text-muted)' }}>{pdfExporting ? <CircularProgress size={15} /> : <FileText size={15} />}</IconButton></span></Tooltip>
        <Tooltip title={pptxExporting ? 'Creating PowerPoint…' : 'Download PowerPoint'}><span><IconButton size="small" disabled={pptxExporting || pdfExporting} onClick={exportPPTX} sx={{ color: 'var(--vm-text-muted)' }}>{pptxExporting ? <CircularProgress size={15} /> : <Download size={15} />}</IconButton></span></Tooltip>
      </Box>
      <ExportProgress open={pdfExporting || pptxExporting} label={pptxExporting ? 'Building business plan PowerPoint…' : 'Rendering business plan PDF…'} />
    </Box>
  );
}

interface PlanViewerProps {
  title: string;
  summary: string;
  sections: PlanSection[];
  version: string;
  logo?: string;
  businessName?: string;
}
