import { useRef, useState } from 'react';
import { Box, Typography, Avatar, IconButton, Tooltip, Chip, CircularProgress } from '@mui/material';
import { Star, Lightbulb, Target, TrendingUp, Shield, Users, DollarSign, Download, FileText, Palette } from 'lucide-react';
import { AuroraBackground, FloatingOrb } from './AuroraBackground';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { Slide } from '../../types/venturemate';
import { exportPitchDeckPptx } from '../../lib/pitchDeckExport';
import { ExportProgress } from '../shared/ExportProgress';

const SLIDE_ICONS: Record<string, typeof Star> = {
  title: Star, cover: Star, problem: Lightbulb, solution: Target, market: TrendingUp,
  product: Star, 'business-model': DollarSign, traction: TrendingUp, competition: Shield,
  team: Users, financials: DollarSign, ask: Target, closing: Star,
};

// ---------------------------------------------------------------------------
// TEMPLATES — same palette as the other VentureMate viewers, so a founder's
// choice of "Cobalt" or "Bloom" reads the same across deck, plan, and slides.
// ---------------------------------------------------------------------------

type Decoration =
  | 'orb' | 'rings' | 'particles' | 'geometric' | 'rays' | 'minimal'
  | 'facets' | 'pulse-grid' | 'horizon' | 'bokeh' | 'contour' | 'prism';

interface DeckTemplate {
  id: string; label: string; font: string;
  accent: string; accent2: string;
  decoration: Decoration;
}

const TEMPLATES: DeckTemplate[] = [
  { id: 'velocity', label: 'Velocity', font: 'Inter', accent: '#6366f1', accent2: '#8b5cf6', decoration: 'orb' },
  { id: 'ignite', label: 'Ignite', font: 'Poppins', accent: '#f43f5e', accent2: '#e11d48', decoration: 'particles' },
  { id: 'summit', label: 'Summit', font: 'Inter', accent: '#10b981', accent2: '#34d399', decoration: 'rings' },
  { id: 'nova', label: 'Nova', font: 'Inter', accent: '#a78bfa', accent2: '#c4b5fd', decoration: 'geometric' },
  { id: 'catalyst', label: 'Catalyst', font: 'Inter', accent: '#06b6d4', accent2: '#22d3ee', decoration: 'rays' },
  { id: 'apex', label: 'Apex', font: 'Helvetica', accent: '#f59e0b', accent2: '#fbbf24', decoration: 'minimal' },

  // ---- new, high-end additions -------------------------------------------
  // Onyx — monochrome, jeweler's-case luxury; light does the talking, not color.
  { id: 'onyx', label: 'Onyx', font: 'Söhne, Inter', accent: '#e4e4e7', accent2: '#a1a1aa', decoration: 'facets' },
  // Cobalt — sapphire-on-ink, institutional; for a finance/enterprise narrative.
  { id: 'cobalt', label: 'Cobalt', font: 'Inter', accent: '#3b82f6', accent2: '#1d4ed8', decoration: 'pulse-grid' },
  // Solstice — warm sunrise gradient; the one template that isn't a black-box glow.
  { id: 'solstice', label: 'Solstice', font: 'Poppins', accent: '#fb923c', accent2: '#f472b6', decoration: 'horizon' },
  // Bloom — soft, editorial, fashion-adjacent; for consumer/lifestyle decks.
  { id: 'bloom', label: 'Bloom', font: 'Poppins', accent: '#e879f9', accent2: '#f0abfc', decoration: 'bokeh' },
  // Slate — dry, technical, cartographic; for infra / deep-tech narratives.
  { id: 'slate', label: 'Slate', font: 'Inter', accent: '#94a3b8', accent2: '#64748b', decoration: 'contour' },
  // Prism — multi-hue refraction; the boldest of the set, for design-forward founders.
  { id: 'prism', label: 'Prism', font: 'Inter', accent: '#22d3ee', accent2: '#f472b6', decoration: 'prism' },
];

function Decoration({ type, accent, accent2 }: { type: Decoration; accent: string; accent2?: string }) {
  switch (type) {
    case 'orb':
      return (
        <Box sx={{ position: 'absolute', right: 40, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: { xs: 'none', lg: 'block' }, zIndex: 1 }}>
          <Box sx={{ position: 'relative', width: 260, height: 260 }}>
            <Box sx={{ position: 'absolute', inset: 0, borderRadius: '50%', bgcolor: `${accent}18`, filter: 'blur(70px)' }} />
            <Box sx={{ position: 'absolute', inset: 30, borderRadius: '50%', border: '1px solid rgba(255,255,255,.07)' }} />
          </Box>
        </Box>
      );
    case 'rings':
      return (
        <Box sx={{ position: 'absolute', right: -70, bottom: -70, pointerEvents: 'none', zIndex: 1 }}>
          <Box sx={{ position: 'relative', width: 340, height: 340 }}>
            <Box sx={{ position: 'absolute', inset: 20, borderRadius: '50%', border: `1.5px solid ${accent}12` }} />
            <Box sx={{ position: 'absolute', inset: 60, borderRadius: '50%', border: `1px solid ${accent}0e` }} />
          </Box>
        </Box>
      );
    case 'particles':
      return (
        <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 1 }}>
          {[0, 1, 2, 3, 4].map(i => (
            <Box key={i} sx={{
              position: 'absolute', left: `${12 + i * 18}%`, top: `${18 + (i % 3) * 25}%`,
              width: 4 + i * 2, height: 4 + i * 2, borderRadius: '50%', bgcolor: accent,
              opacity: 0.1 + i * 0.03, boxShadow: `0 0 ${10 + i * 4}px ${accent}30`,
            }} />
          ))}
        </Box>
      );
    case 'geometric':
      return (
        <Box sx={{ position: 'absolute', right: -50, top: -50, pointerEvents: 'none', zIndex: 1 }}>
          <Box sx={{ width: 280, height: 280, border: `1px solid ${accent}0e`, transform: 'rotate(45deg)', borderRadius: 4 }} />
          <Box sx={{ position: 'absolute', top: 40, left: 40, width: 200, height: 200, border: `1px solid ${accent}08`, transform: 'rotate(45deg)', borderRadius: 3 }} />
        </Box>
      );
    case 'rays':
      return (
        <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 1 }}>
          {[-25, -10, 0, 10, 25].map((a, i) => (
            <Box key={i} sx={{ position: 'absolute', top: '50%', left: '50%', width: '120%', height: 1, background: `linear-gradient(90deg, transparent, ${accent}08, transparent)`, transform: `translate(-50%,-50%) rotate(${a}deg)` }} />
          ))}
        </Box>
      );
    case 'facets':
      // Onyx — a single large faceted gem cut from straight lines only. Quiet, no glow bloom.
      return (
        <Box sx={{ position: 'absolute', right: 60, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: { xs: 'none', lg: 'block' }, zIndex: 1 }}>
          <Box sx={{ position: 'relative', width: 260, height: 260 }}>
            <Box sx={{
              position: 'absolute', inset: 0,
              clipPath: 'polygon(50% 0%, 90% 25%, 100% 65%, 65% 100%, 20% 90%, 0% 45%)',
              background: `linear-gradient(155deg, rgba(255,255,255,.05) 0%, transparent 45%, ${accent}0d 100%)`,
              border: '1px solid rgba(255,255,255,.09)',
            }} />
            <Box sx={{ position: 'absolute', left: '30%', top: '16%', width: 60, height: 2, bgcolor: 'rgba(255,255,255,.28)', transform: 'rotate(18deg)', filter: 'blur(.5px)' }} />
          </Box>
        </Box>
      );
    case 'pulse-grid':
      // Cobalt — a faint blueprint grid with a few instrument-panel nodes. Reads as "systems".
      return (
        <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 1 }}>
          <Box sx={{
            position: 'absolute', inset: 0, opacity: 0.45,
            backgroundImage: `linear-gradient(${accent}12 1px, transparent 1px), linear-gradient(90deg, ${accent}12 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
            maskImage: 'radial-gradient(ellipse 65% 55% at 78% 30%, black, transparent 75%)',
          }} />
          {[{ l: '70%', t: '22%' }, { l: '84%', t: '40%' }].map((p, i) => (
            <Box key={i} sx={{ position: 'absolute', left: p.l, top: p.t, width: 5, height: 5, borderRadius: '50%', bgcolor: accent, boxShadow: `0 0 12px 3px ${accent}70` }} />
          ))}
        </Box>
      );
    case 'horizon':
      // Solstice — a low sun disc sitting on stacked gradient bands, like a title card at dawn.
      return (
        <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 1 }}>
          <Box sx={{
            position: 'absolute', left: '78%', top: '50%', transform: 'translate(-50%,-50%)',
            width: 220, height: 220, borderRadius: '50%',
            background: `radial-gradient(circle at 50% 35%, ${accent}, ${accent}00 72%)`,
            opacity: 0.35, filter: 'blur(2px)',
          }} />
          {[0, 1, 2].map(i => (
            <Box key={i} sx={{
              position: 'absolute', left: 0, right: 0, bottom: `${10 + i * 8}%`, height: 1,
              background: `linear-gradient(90deg, transparent, ${accent}${i === 1 ? '24' : '14'}, transparent)`,
            }} />
          ))}
        </Box>
      );
    case 'bokeh':
      // Bloom — soft, unevenly sized overlapping discs, editorial rather than "confetti".
      return (
        <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 1 }}>
          {[
            { l: '76%', t: '14%', s: 90, o: 0.13 },
            { l: '88%', t: '42%', s: 44, o: 0.18 },
            { l: '66%', t: '62%', s: 120, o: 0.08 },
          ].map((c, i) => (
            <Box key={i} sx={{
              position: 'absolute', left: c.l, top: c.t, width: c.s, height: c.s, borderRadius: '50%',
              background: `radial-gradient(circle, ${accent}, transparent 70%)`, opacity: c.o, filter: 'blur(6px)',
            }} />
          ))}
        </Box>
      );
    case 'contour':
      // Slate — topographic contour lines, dry and technical, for infra-flavoured decks.
      return (
        <Box sx={{ position: 'absolute', right: -110, bottom: -140, pointerEvents: 'none', zIndex: 1 }}>
          {[400, 330, 260, 190].map((size, i) => (
            <Box key={i} sx={{
              position: 'absolute', right: 0, bottom: 0, width: size, height: size * 0.7,
              border: `1px solid ${accent}${i % 2 === 0 ? '14' : '0a'}`,
              borderRadius: '48% 52% 45% 55% / 55% 45% 55% 45%',
            }} />
          ))}
        </Box>
      );
    case 'prism':
      // Prism — refracted triangle shards in three hues, the one deliberately maximal motif.
      return (
        <Box sx={{ position: 'absolute', right: 30, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: { xs: 'none', lg: 'block' }, zIndex: 1 }}>
          <Box sx={{ position: 'relative', width: 280, height: 280 }}>
            <Box sx={{ position: 'absolute', inset: 0, clipPath: 'polygon(30% 0%, 100% 15%, 70% 100%)', background: `linear-gradient(160deg, ${accent}2b, transparent 70%)` }} />
            <Box sx={{ position: 'absolute', inset: 0, clipPath: 'polygon(0% 40%, 55% 20%, 40% 100%)', background: `linear-gradient(200deg, ${accent2 || accent}24, transparent 70%)`, mixBlendMode: 'screen' }} />
          </Box>
        </Box>
      );
    default:
      return null;
  }
}

interface ModernPitchDeckProps {
  slides: Slide[];
  title: string;
  logo?: string;
  businessName?: string;
  accentColor?: string;
  secondaryColor?: string;
}

function SlideHeader({ logo, businessName, slideType, index, total }: {
  logo?: string; businessName?: string; slideType: string; index: number; total: number;
}) {
  return (
    <Box sx={{
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      px: { xs: 3, sm: 5, md: 8 }, py: { xs: 2, sm: 3 },
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {logo ? (
          <Avatar src={logo} sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: 'rgba(255,255,255,.05)' }} />
        ) : (
          <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: 'rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,.6)' }}>{(businessName || 'V')[0]}</Typography>
          </Box>
        )}
        {businessName && (
          <Typography sx={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,.5)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{businessName}</Typography>
        )}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography sx={{ display: { xs: 'none', md: 'block' }, fontSize: 11, color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', letterSpacing: 3 }}>
          {slideType.replace('_', ' ')}
        </Typography>
        <Box sx={{
          borderRadius: 20, border: '1px solid rgba(255,255,255,.08)', bgcolor: 'rgba(255,255,255,.02)',
          px: 1.5, py: 0.5, backdropFilter: 'blur(16px)',
        }}>
          <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,.35)', fontWeight: 600, fontFamily: 'monospace' }}>
            {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

function SlideFooter({ businessName }: { businessName?: string }) {
  return (
    <Box sx={{
      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      px: { xs: 3, sm: 5, md: 8 }, py: { xs: 1.5, sm: 2.5 },
    }}>
      <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,.15)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{businessName || ''}</Typography>
      <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,.15)' }}>Confidential</Typography>
    </Box>
  );
}

function GlassCard({ children, sx }: { children: React.ReactNode; sx?: Record<string, unknown> }) {
  return (
    <Box sx={{
      position: 'relative', overflow: 'hidden', borderRadius: 4, border: '1px solid rgba(255,255,255,.08)',
      bgcolor: 'rgba(255,255,255,.03)', backdropFilter: 'blur(24px)',
      ...sx,
    }}>
      <Box sx={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'linear-gradient(135deg, rgba(255,255,255,.08) 0%, transparent 50%)',
      }} />
      <Box sx={{ position: 'relative', zIndex: 1 }}>
        {children}
      </Box>
    </Box>
  );
}

interface SlideCommon {
  slide: Slide; index: number; total: number; logo?: string; businessName?: string;
  accent: string; decoration: Decoration; accent2: string;
}

function CoverSlide({ slide, index, total, logo, businessName, accent, accent2 }: SlideCommon) {
  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <AuroraBackground accent={accent} secondary={accent2} />
      <FloatingOrb accent={accent} />
      <SlideHeader logo={logo} businessName={businessName} slideType="Cover" index={index} total={total} />

      <Box sx={{
        position: 'relative', zIndex: 10, height: '100%',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        px: { xs: 4, sm: 6, md: 10 },
      }}>
        <Box sx={{
          display: 'inline-flex', alignItems: 'center', gap: 1.5,
          borderRadius: 20, border: '1px solid rgba(255,255,255,.08)',
          bgcolor: 'rgba(255,255,255,.03)', px: 2, py: 1, mb: 3, backdropFilter: 'blur(16px)',
        }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: accent, boxShadow: `0 0 15px ${accent}` }} />
          <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,.5)', letterSpacing: 1 }}>
            Company Presentation
          </Typography>
        </Box>

        <Typography sx={{
          fontSize: { xs: 42, sm: 56, md: 80 }, fontWeight: 600,
          lineHeight: 0.92, letterSpacing: '-0.07em', color: 'white',
          maxWidth: '80%', overflowWrap: 'anywhere', wordBreak: 'break-word',
        }}>
          {slide.title}
        </Typography>

        {slide.content && (
          <Typography sx={{
            mt: 4, fontSize: { xs: 16, sm: 18, md: 21 },
            lineHeight: 1.6, color: 'rgba(255,255,255,.45)', maxWidth: 600, overflowWrap: 'anywhere',
          }}>
            {slide.content}
          </Typography>
        )}

        <Box sx={{ mt: 6, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ width: 64, height: 1, bgcolor: accent }} />
          <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,.35)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {businessName || 'Building the future'}
          </Typography>
        </Box>
      </Box>
      <SlideFooter businessName={businessName} />
    </Box>
  );
}

function ProblemSlide({ slide, index, total, logo, businessName, accent, decoration }: SlideCommon) {
  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <AuroraBackground accent={accent} />
      <Decoration type={decoration} accent={accent} />
      <SlideHeader logo={logo} businessName={businessName} slideType="The Problem" index={index} total={total} />

      <Box sx={{
        position: 'relative', zIndex: 10, height: '100%',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        px: { xs: 4, sm: 6, md: 10 },
      }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 8, alignItems: 'center', height: '100%' }}>
          <Box>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: accent, mb: 3, letterSpacing: 2 }}>
              01
            </Typography>
            <Typography sx={{
              fontSize: { xs: 36, sm: 48, md: 68 }, fontWeight: 600,
              lineHeight: 0.95, letterSpacing: '-0.06em', color: 'white',
              overflowWrap: 'anywhere', wordBreak: 'break-word',
            }}>
              {slide.title}
            </Typography>
            {slide.content && (
              <Typography sx={{
                mt: 5, fontSize: { xs: 15, sm: 17, md: 19 },
                lineHeight: 1.7, color: 'rgba(255,255,255,.45)', maxWidth: 480, overflowWrap: 'anywhere',
              }}>
                {slide.content}
              </Typography>
            )}
          </Box>

          <Box sx={{ position: 'relative' }}>
            <Box sx={{
              position: 'absolute', inset: -24, borderRadius: 10,
              bgcolor: `${accent}08`, filter: 'blur(40px)',
            }} />
            <GlassCard>
              <Box sx={{ p: { xs: 2, sm: 3 } }}>
                {slide.bullets?.map((bullet, i) => (
                  <Box key={i} sx={{
                    display: 'flex', alignItems: 'center', gap: 2.5,
                    p: 2.5, mb: 1, borderRadius: 3,
                    border: '1px solid rgba(255,255,255,.06)',
                    bgcolor: 'rgba(255,255,255,.03)',
                    transition: 'all .2s',
                    '&:hover': { bgcolor: 'rgba(255,255,255,.06)' },
                    '&:last-child': { mb: 0 },
                  }}>
                    <Box sx={{
                      width: 44, height: 44, flexShrink: 0, borderRadius: 2,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      bgcolor: `${accent}15`,
                    }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: accent }}>
                        {String(i + 1).padStart(2, '0')}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: { xs: 14, sm: 16 }, color: 'rgba(255,255,255,.7)', lineHeight: 1.5, overflowWrap: 'anywhere' }}>
                      {bullet}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </GlassCard>
          </Box>
        </Box>
      </Box>
      <SlideFooter businessName={businessName} />
    </Box>
  );
}

function SolutionSlide({ slide, index, total, logo, businessName, accent, decoration }: SlideCommon) {
  const points = slide.bullets?.length ? slide.bullets : slide.content ? [slide.content] : [];
  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <AuroraBackground accent={accent} />
      <Decoration type={decoration} accent={accent} />
      <SlideHeader logo={logo} businessName={businessName} slideType="The Solution" index={index} total={total} />

      <Box sx={{
        position: 'relative', zIndex: 10, height: '100%',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        px: { xs: 4, sm: 6, md: 10 },
      }}>
        <Typography sx={{
          fontSize: { xs: 36, sm: 48, md: 72 }, fontWeight: 600,
          lineHeight: 0.95, letterSpacing: '-0.06em', color: 'white',
          overflowWrap: 'anywhere', wordBreak: 'break-word',
        }}>
          {slide.title}
        </Typography>

        <Box sx={{ mt: 6, display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
          {points.slice(0, 6).map((point, i) => (
            <GlassCard key={i} sx={{ p: 3.5 }}>
              <Box sx={{ position: 'absolute', top: -64, right: -64, width: 160, height: 160, borderRadius: '50%', bgcolor: `${accent}10`, filter: 'blur(48px)', transition: 'all .3s' }} />
              <Typography sx={{ fontSize: { xs: 28, sm: 32 }, fontWeight: 300, color: accent, mb: 4 }}>
                0{i + 1}
              </Typography>
              <Typography sx={{ fontSize: { xs: 14, sm: 16 }, color: 'rgba(255,255,255,.7)', lineHeight: 1.6, overflowWrap: 'anywhere' }}>
                {point}
              </Typography>
            </GlassCard>
          ))}
        </Box>
      </Box>
      <SlideFooter businessName={businessName} />
    </Box>
  );
}

function MarketSlide({ slide, index, total, logo, businessName, accent, decoration }: SlideCommon) {
  const Icon = SLIDE_ICONS[slide.type] || TrendingUp;
  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <AuroraBackground accent={accent} />
      <Decoration type={decoration} accent={accent} />
      <SlideHeader logo={logo} businessName={businessName} slideType="Market Opportunity" index={index} total={total} />

      <Box sx={{
        position: 'relative', zIndex: 10, height: '100%',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        px: { xs: 4, sm: 6, md: 10 },
      }}>
            <Typography sx={{
              fontSize: { xs: 36, sm: 48, md: 72 }, fontWeight: 600,
              lineHeight: 0.95, letterSpacing: '-0.06em', color: 'white',
              overflowWrap: 'anywhere', wordBreak: 'break-word',
            }}>
              {slide.title}
            </Typography>

        <Box sx={{ mt: 6, display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
          <GlassCard sx={{ p: { xs: 3, sm: 4 } }}>
            <Box sx={{ position: 'absolute', top: -80, right: -80, width: 192, height: 192, borderRadius: '50%', bgcolor: `${accent}10`, filter: 'blur(48px)' }} />
            <Box sx={{ position: 'relative' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Icon size={16} color={accent} />
                <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: 1 }}>TAM</Typography>
              </Box>
              <Typography sx={{ fontSize: { xs: 32, sm: 42, md: 52 }, fontWeight: 600, letterSpacing: '-0.06em', color: accent }}>
                {slide.title.includes('$') || slide.title.includes('B') || slide.title.includes('M') ? '$' : ''}XX
              </Typography>
              <Typography sx={{ mt: 2, fontSize: 14, color: 'rgba(255,255,255,.6)' }}>Total Addressable Market</Typography>
            </Box>
          </GlassCard>
          <GlassCard sx={{ p: { xs: 3, sm: 4 } }}>
            <Box sx={{ position: 'absolute', top: -80, right: -80, width: 192, height: 192, borderRadius: '50%', bgcolor: `${accent}10`, filter: 'blur(48px)' }} />
            <Box sx={{ position: 'relative' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Icon size={16} color={accent} />
                <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: 1 }}>SAM</Typography>
              </Box>
              <Typography sx={{ fontSize: { xs: 32, sm: 42, md: 52 }, fontWeight: 600, letterSpacing: '-0.06em', color: accent }}>
                {slide.title.includes('$') || slide.title.includes('B') || slide.title.includes('M') ? '$' : ''}XX
              </Typography>
              <Typography sx={{ mt: 2, fontSize: 14, color: 'rgba(255,255,255,.6)' }}>Serviceable Available Market</Typography>
            </Box>
          </GlassCard>
          <GlassCard sx={{ p: { xs: 3, sm: 4 } }}>
            <Box sx={{ position: 'absolute', top: -80, right: -80, width: 192, height: 192, borderRadius: '50%', bgcolor: `${accent}10`, filter: 'blur(48px)' }} />
            <Box sx={{ position: 'relative' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Icon size={16} color={accent} />
                <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: 1 }}>SOM</Typography>
              </Box>
              <Typography sx={{ fontSize: { xs: 32, sm: 42, md: 52 }, fontWeight: 600, letterSpacing: '-0.06em', color: accent }}>
                {slide.title.includes('$') || slide.title.includes('B') || slide.title.includes('M') ? '$' : ''}XX
              </Typography>
              <Typography sx={{ mt: 2, fontSize: 14, color: 'rgba(255,255,255,.6)' }}>Serviceable Obtainable Market</Typography>
            </Box>
          </GlassCard>
        </Box>
      </Box>
      <SlideFooter businessName={businessName} />
    </Box>
  );
}

function TractionSlide({ slide, index, total, logo, businessName, accent, decoration }: SlideCommon) {
  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <AuroraBackground accent={accent} />
      <Decoration type={decoration} accent={accent} />
      <SlideHeader logo={logo} businessName={businessName} slideType="Traction" index={index} total={total} />

      <Box sx={{
        position: 'relative', zIndex: 10, height: '100%',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        px: { xs: 4, sm: 6, md: 10 },
      }}>
        <Typography sx={{
          fontSize: { xs: 36, sm: 48, md: 72 }, fontWeight: 600,
          lineHeight: 0.95, letterSpacing: '-0.06em', color: 'white',
          overflowWrap: 'anywhere', wordBreak: 'break-word',
        }}>
          {slide.title}
        </Typography>

        <Box sx={{ mt: 6, display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 3 }}>
          {['Users', 'Revenue', 'Growth', 'Retention'].map((label, i) => (
            <GlassCard key={i} sx={{ p: { xs: 2.5, sm: 3.5 }, position: 'relative' }}>
              <Box sx={{
                position: 'absolute', bottom: 0, left: 0, height: 4,
                width: '100%', background: `linear-gradient(90deg, ${accent}, transparent)`,
                opacity: 0.7,
              }} />
              <Typography sx={{
                fontSize: { xs: 28, sm: 36, md: 48 }, fontWeight: 600,
                letterSpacing: '-0.05em', color: 'white',
              }}>
                {['12K+', '$2.4M', '47%', '94%'][i]}
              </Typography>
              <Typography sx={{ mt: 2, fontSize: 13, color: 'rgba(255,255,255,.45)' }}>
                {label}
              </Typography>
              <Typography sx={{ mt: 2, fontSize: 12, color: accent }}>
                ↗ {['+240%', '+180%', '+12%', '+5%'][i]}
              </Typography>
            </GlassCard>
          ))}
        </Box>
      </Box>
      <SlideFooter businessName={businessName} />
    </Box>
  );
}

function BusinessModelSlide({ slide, index, total, logo, businessName, accent, decoration }: SlideCommon) {
  const items = slide.bullets?.length ? slide.bullets : slide.content ? [slide.content] : [];
  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <AuroraBackground accent={accent} />
      <Decoration type={decoration} accent={accent} />
      <SlideHeader logo={logo} businessName={businessName} slideType="Business Model" index={index} total={total} />

      <Box sx={{
        position: 'relative', zIndex: 10, height: '100%',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        px: { xs: 4, sm: 6, md: 10 },
      }}>
        <Typography sx={{
          fontSize: { xs: 36, sm: 48, md: 72 }, fontWeight: 600,
          lineHeight: 0.95, letterSpacing: '-0.06em', color: 'white',
          overflowWrap: 'anywhere', wordBreak: 'break-word',
        }}>
          {slide.title}
        </Typography>

        <Box sx={{ mt: 6, display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
          {['Subscription', 'Enterprise', 'Marketplace'].map((label, i) => (
            <GlassCard key={i} sx={{ p: { xs: 3, sm: 4 } }}>
              <Box sx={{
                width: 48, height: 48, borderRadius: 2, mb: 4,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                bgcolor: `${accent}15`,
              }}>
                <Typography sx={{ fontSize: 18, fontWeight: 700, color: accent }}>{i + 1}</Typography>
              </Box>
              <Typography sx={{ fontSize: { xs: 18, sm: 20 }, fontWeight: 500, color: 'rgba(255,255,255,.8)', mb: 2, overflowWrap: 'anywhere' }}>
                {label}
              </Typography>
              <Typography sx={{ fontSize: 13, lineHeight: 1.7, color: 'rgba(255,255,255,.4)', overflowWrap: 'anywhere' }}>
                {items[i] || `Revenue stream ${i + 1} description with key metrics and pricing.`}
              </Typography>
            </GlassCard>
          ))}
        </Box>
      </Box>
      <SlideFooter businessName={businessName} />
    </Box>
  );
}

function AskSlide({ slide, index, total, logo, businessName, accent, accent2, decoration }: SlideCommon) {
  const uses = slide.bullets?.length ? slide.bullets : [];
  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <AuroraBackground accent={accent} secondary={accent2} />
      <Decoration type={decoration} accent={accent} accent2={accent2} />
      <SlideHeader logo={logo} businessName={businessName} slideType="The Ask" index={index} total={total} />

      <Box sx={{
        position: 'relative', zIndex: 10, height: '100%',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        px: { xs: 4, sm: 6, md: 10 },
      }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 8, alignItems: 'center', height: '100%' }}>
          <Box>
        <Typography sx={{
          fontSize: { xs: 36, sm: 48, md: 72 }, fontWeight: 600,
          lineHeight: 0.95, letterSpacing: '-0.06em', color: 'white',
          overflowWrap: 'anywhere', wordBreak: 'break-word',
        }}>
          {slide.title}
        </Typography>
            <Typography sx={{
              mt: 5, fontSize: { xs: 42, sm: 56, md: 80 }, fontWeight: 600,
              letterSpacing: '-0.07em',
              background: `linear-gradient(135deg, ${accent}, ${accent2})`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              {slide.title.includes('$') ? '' : '$'}XX
            </Typography>
          </Box>

          <GlassCard sx={{ p: { xs: 3, sm: 4 } }}>
            <Box sx={{ position: 'absolute', top: -80, right: -80, width: 192, height: 192, borderRadius: '50%', bgcolor: `${accent}15`, filter: 'blur(48px)' }} />
            <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', letterSpacing: 2, mb: 3 }}>
              Use of Funds
            </Typography>
            <Box>
              {uses.length > 0 ? uses.map((use, i) => (
                <Box key={i} sx={{
                  display: 'flex', alignItems: 'center', gap: 2,
                  py: 2.5, borderBottom: '1px solid rgba(255,255,255,.06)',
                  '&:last-child': { borderBottom: 'none' },
                }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: accent, minWidth: 28 }}>
                    0{i + 1}
                  </Typography>
                  <Typography sx={{ fontSize: { xs: 14, sm: 16 }, color: 'rgba(255,255,255,.7)', overflowWrap: 'anywhere' }}>
                    {use}
                  </Typography>
                </Box>
              )) : (
                <Typography sx={{ fontSize: 14, color: 'rgba(255,255,255,.4)', py: 4, textAlign: 'center' }}>
                  Use of funds breakdown
                </Typography>
              )}
            </Box>
          </GlassCard>
        </Box>
      </Box>
      <SlideFooter businessName={businessName} />
    </Box>
  );
}

function DefaultSlide({ slide, index, total, logo, businessName, accent, decoration }: SlideCommon) {
  const Icon = SLIDE_ICONS[slide.type] || Star;
  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <AuroraBackground accent={accent} />
      <Decoration type={decoration} accent={accent} />
      <SlideHeader logo={logo} businessName={businessName} slideType={slide.type} index={index} total={total} />

      <Box sx={{
        position: 'relative', zIndex: 10, height: '100%',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        px: { xs: 4, sm: 6, md: 10 },
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Icon size={14} color={accent} />
          <Box sx={{
            width: 10, height: 10, borderRadius: '50%', bgcolor: accent,
            boxShadow: `0 0 12px ${accent}60`,
          }} />
          <Typography sx={{ fontSize: 11, fontWeight: 600, color: accent, textTransform: 'uppercase', letterSpacing: 3, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {slide.type.replace('_', ' ')}
          </Typography>
        </Box>

        <Typography sx={{
          fontSize: { xs: 36, sm: 48, md: 72 }, fontWeight: 600,
          lineHeight: 0.95, letterSpacing: '-0.06em', color: 'white',
          maxWidth: '85%', overflowWrap: 'anywhere', wordBreak: 'break-word',
        }}>
          {slide.title}
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 4, mt: 5, alignItems: 'flex-start' }}>
          {slide.content && (
            <Typography sx={{ fontSize: { xs: 14, sm: 16 }, lineHeight: 1.8, color: 'rgba(255,255,255,.6)', maxWidth: 520, overflowWrap: 'anywhere' }}>
              {slide.content}
            </Typography>
          )}
          {slide.bullets && slide.bullets.length > 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {slide.bullets.map((bullet, bi) => (
                <Box key={bi} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                  <Box sx={{ minWidth: 6, height: 6, borderRadius: '50%', bgcolor: accent, mt: 0.75, boxShadow: `0 0 6px ${accent}60` }} />
                  <Typography sx={{ fontSize: { xs: 13, sm: 15 }, lineHeight: 1.6, color: 'rgba(255,255,255,.75)', overflowWrap: 'anywhere' }}>
                    {bullet}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Box>
      <SlideFooter businessName={businessName} />
    </Box>
  );
}

export function ModernPitchDeck({ slides, title: _title, logo, businessName, accentColor, secondaryColor }: ModernPitchDeckProps) {
  const [templateId, setTemplateId] = useState('velocity');
  const [pptxExporting, setPptxExporting] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);
  const template = TEMPLATES.find(t => t.id === templateId) || TEMPLATES[0];
  // explicit accentColor/secondaryColor props (e.g. brand colors) still win when provided;
  // otherwise the selected template drives the palette, matching the other VentureMate viewers.
  const accent = accentColor || template.accent;
  const secondary = secondaryColor || template.accent2;
  const deckRef = useRef<HTMLDivElement>(null);

  if (!slides || slides.length === 0) return null;

  const captureSlide = async (el: HTMLElement) => {
    // Strip any CSS color() functions that html2canvas 1.4.1 can't parse
    const clone = el.cloneNode(true) as HTMLElement;
    const allEls = clone.querySelectorAll('*');
    allEls.forEach((child: Element) => {
      const htmlChild = child as HTMLElement;
      if (htmlChild.style) {
        // Remove known unsupported CSS functions
        const s = htmlChild.style;
        if (s.background && s.background.includes('color(')) {
          s.background = s.background.replace(/color\([^)]+\)/g, 'transparent');
        }
        if (s.backgroundImage && s.backgroundImage.includes('color(')) {
          s.backgroundImage = s.backgroundImage.replace(/color\([^)]+\)/g, 'transparent');
        }
        // Replace color() in any inline style string
        if (htmlChild.getAttribute('style')) {
          const style = htmlChild.getAttribute('style') || '';
          htmlChild.setAttribute('style', style.replace(/color\([^)]+\)/g, '#08080b'));
        }
      }
    });
    // Also remove color() from any <style> blocks in the clone
    const styleTags = clone.querySelectorAll('style');
    styleTags.forEach((st: Element) => {
      st.textContent = (st.textContent || '').replace(/color\([^)]+\)/g, '#08080b');
    });

    // Temporarily append clone to capture it
    const wrapper = document.createElement('div');
    wrapper.style.position = 'absolute';
    wrapper.style.left = '-9999px';
    wrapper.style.top = '0';
    wrapper.style.width = el.offsetWidth + 'px';
    document.body.appendChild(wrapper);
    wrapper.appendChild(clone);

    try {
      const canvas = await html2canvas(clone, { scale: 3, useCORS: true, backgroundColor: '#08080b' });
      document.body.removeChild(wrapper);
      return canvas;
    } catch (e) {
      document.body.removeChild(wrapper);
      console.warn('html2canvas failed:', e);
      return null;
    }
  };

  const exportPDF = async () => {
    const el = deckRef.current;
    if (!el || pdfExporting) return;
    setPdfExporting(true);
    try {
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1920, 1080] });
      const slideEls = el.querySelectorAll('[data-mp-slide]');
      let hasError = false;
      for (let i = 0; i < slideEls.length; i++) {
        const slideEl = slideEls[i] as HTMLElement;
        const canvas = await captureSlide(slideEl);
        if (!canvas) { hasError = true; continue; }
        if (i > 0) pdf.addPage();
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 1920, 1080);
      }
      if (slideEls.length > 0) pdf.save(`${_title.replace(/[^a-zA-Z0-9]/g, '_')}_pitchdeck.pdf`);
      if (hasError) console.warn('Some slides could not be captured');
    } catch (error) {
      console.error('PDF export failed', error);
      window.alert(error instanceof Error ? error.message : 'PDF export failed. Please try again.');
    } finally {
      setPdfExporting(false);
    }
  };

  const exportPPTX = async () => {
    if (pptxExporting) return;
    setPptxExporting(true);
    try {
      await exportPitchDeckPptx({
        slides, title: _title, logo, businessName: businessName || _title,
        primary: accent, secondary, style: 'premium',
      });
    } catch (error) {
      console.error('PPTX export failed', error);
      window.alert(error instanceof Error ? error.message : 'PowerPoint export failed. Please try again.');
    } finally {
      setPptxExporting(false);
    }
  };

  return (
    <Box sx={{ position: 'relative', width: '100%' }}>
      {/* Template picker + download toolbar */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
          <Palette size={14} color="var(--vm-text-muted)" />
          {TEMPLATES.map(t => (
            <Chip key={t.id} label={t.label} size="small" onClick={() => setTemplateId(t.id)}
              sx={{
                bgcolor: templateId === t.id ? `${t.accent}20` : 'rgba(255,255,255,.04)',
                color: templateId === t.id ? t.accent : 'var(--vm-text-secondary)',
                fontWeight: templateId === t.id ? 700 : 500, cursor: 'pointer', fontSize: 11,
                border: templateId === t.id ? `1px solid ${t.accent}30` : '1px solid transparent',
                '&:hover': { bgcolor: `${t.accent}15` },
              }} />
          ))}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip title={pdfExporting ? 'Creating PDF…' : 'Download PDF'}>
            <span><IconButton size="small" disabled={pdfExporting || pptxExporting} onClick={exportPDF} sx={{ color: 'var(--vm-text-muted)' }}>{pdfExporting ? <CircularProgress size={15} /> : <FileText size={15} />}</IconButton></span>
          </Tooltip>
          <Tooltip title={pptxExporting ? 'Creating PowerPoint…' : 'Download editable PowerPoint'}>
            <span><IconButton size="small" disabled={pptxExporting || pdfExporting} onClick={exportPPTX} sx={{ color: 'var(--vm-text-muted)' }}>{pptxExporting ? <CircularProgress size={15} /> : <Download size={15} />}</IconButton></span>
          </Tooltip>
        </Box>
      </Box>
      <ExportProgress open={pdfExporting || pptxExporting} label={pptxExporting ? 'Building editable PowerPoint…' : 'Rendering pitch deck PDF…'} />
      <Box ref={deckRef} sx={{ position: 'relative', width: '100%' }} style={{ fontFamily: template.font }}>
      {slides.map((slide, index) => {
        const total = slides.length;
        const common: SlideCommon = { slide, index, total, logo, businessName, accent, accent2: secondary, decoration: template.decoration };

        let slideContent: React.ReactNode;
        switch (slide.type) {
          case 'title':
          case 'closing':
            slideContent = <CoverSlide {...common} />;
            break;
          case 'problem':
            slideContent = <ProblemSlide {...common} />;
            break;
          case 'solution':
            slideContent = <SolutionSlide {...common} />;
            break;
          case 'market':
            slideContent = <MarketSlide {...common} />;
            break;
          case 'traction':
            slideContent = <TractionSlide {...common} />;
            break;
          case 'business-model':
            slideContent = <BusinessModelSlide {...common} />;
            break;
          case 'ask':
            slideContent = <AskSlide {...common} />;
            break;
          default:
            slideContent = <DefaultSlide {...common} />;
        }

        return (
          <Box key={slide.id || index} data-mp-slide sx={{
            position: 'relative', width: '100%', aspectRatio: '16 / 9',
            overflow: 'auto', borderBottom: '1px solid rgba(255,255,255,.06)',
            minHeight: { xs: 300, sm: 400, md: 500 },
          }}>
            {slideContent}
          </Box>
        );
      })}
      </Box>
    </Box>
  );
}
