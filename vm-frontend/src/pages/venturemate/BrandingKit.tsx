import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Button, Chip, CircularProgress, Typography, IconButton, Tooltip } from '@mui/material';
import { BookOpen, Palette, Sparkles, Type, Eye, Check, X, Wand2, Download } from 'lucide-react';
import { AICreationStudio, type ProposedChange } from '../../components/venturemate/AICreationStudio';
import { NoBusinessSelected } from '../../components/venturemate/NoBusinessSelected';
import { useBusiness } from '../../contexts/BusinessContext';
import { graphqlRequest } from '../../lib/api';
import { PageHeader } from '../../components/shared';
import type { BrandKit, BrandingFull, LogoOption, ColorPalette, TypographyPair, ViewType } from '../../types/venturemate';

interface BrandingKitProps { onViewChange?: (_view: ViewType) => void; }

const DEFAULT_BRAND_KIT: BrandKit = {
  logo: '', logoWhite: '', logoIcon: '', primaryColor: '#10b981', secondaryColor: '#059669',
  accentColor: '#34d399', darkColor: '#052e24', fontHeading: 'Inter', fontBody: 'Inter', patterns: [], socialBanners: [],
};

function downloadSvg(svg: string, filename: string) {
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click(); URL.revokeObjectURL(a.href);
}

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) > 160;
}

function adaptColor(match: string, attr: string, onDark: boolean): string {
  const color = match.replace(`${attr}="`, '').replace('"', '');
  if (!/^#[0-9A-Fa-f]{6}$/.test(color)) return match;
  const light = isLightColor(color);
  return onDark ? (light ? match : `${attr}="rgba(255,255,255,.85)"`) : (light ? `${attr}="rgba(0,0,0,.75)"` : match);
}

function renderSvg(svg: string, options?: { dark?: boolean; size?: number }) {
  try {
    let cleaned = svg.startsWith('data:') ? atob(svg.split(',')[1]?.replace(/-/g, '+').replace(/_/g, '/') || '') : svg;
    const onDark = options?.dark === true;
    cleaned = cleaned.replace(/(fill=")(?:none|transparent)(")/gi, '___KEEP_FILL___$1$2___END_KEEP___');
    cleaned = cleaned.replace(/fill="#[0-9A-Fa-f]{6}"/gi, (m) => adaptColor(m, 'fill', onDark));
    cleaned = cleaned.replace(/stroke="#[0-9A-Fa-f]{6}"/gi, (m) => adaptColor(m, 'stroke', onDark));
    cleaned = cleaned.replace(/<text[^>]*fill="#[0-9A-Fa-f]{6}"/gi, (m) => {
      const color = m.match(/fill="#([0-9A-Fa-f]{6})"/i);
      if (!color) return m;
      const light = isLightColor('#' + color[1]);
      return onDark ? (light ? m : m.replace(/fill="#[0-9A-Fa-f]{6}"/i, 'fill="rgba(255,255,255,.9)"')) : (light ? m.replace(/fill="#[0-9A-Fa-f]{6}"/i, 'fill="rgba(0,0,0,.8)"') : m);
    });
    cleaned = cleaned.replace(/___KEEP_FILL___fill="(?:none|transparent)"___END_KEEP___/g, 'fill="none"');
    const sz = options?.size || 100;
    return <Box sx={{ display: 'flex', '& svg': { width: { xs: Math.min(sz, 60), sm: sz }, height: { xs: Math.min(sz, 60), sm: sz }, maxWidth: '100%', maxHeight: sz } }} dangerouslySetInnerHTML={{ __html: cleaned }} />;
  } catch { return null; }
}

function ColorSwatch({ label, value, onClick }: { label: string; value: string; onClick?: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <Tooltip title={copied ? 'Copied!' : 'Click to copy'}>
      <Box sx={{
        borderRadius: 2, overflow: 'hidden', border: '1px solid rgba(255,255,255,.08)',
        cursor: 'pointer', transition: 'all .25s cubic-bezier(.4,0,.2,1)',
        '&:hover': { transform: 'translateY(-4px) scale(1.02)', boxShadow: `0 8px 32px ${value}30` },
      }} onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
        <Box sx={{ height: { xs: 52, sm: 64 }, background: `linear-gradient(135deg, ${value}, ${value}dd)`, position: 'relative', overflow: 'hidden', '&::before': { content: '""', position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,.2), transparent 70%)' } }} />
        <Box sx={{ px: 1.5, py: 1 }}>
          <Typography sx={{ color: 'var(--vm-text-primary)', fontSize: 10, fontWeight: 700, textTransform: 'capitalize' }}>{label}</Typography>
          <Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 9, fontFamily: 'monospace' }}>{value}</Typography>
        </Box>
      </Box>
    </Tooltip>
  );
}

function FontPreview({ name, label }: { name: string; label: string }) {
  if (!name) return null;
  return (
    <Box sx={{ flex: 1, p: 2, borderRadius: 2.5, border: '1px solid rgba(255,255,255,.06)', bgcolor: 'rgba(255,255,255,.02)', transition: 'all .2s', '&:hover': { borderColor: 'rgba(255,255,255,.12)', bgcolor: 'rgba(255,255,255,.04)' } }}>
      <Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, mb: 1 }}>{label}</Typography>
      <Typography sx={{ fontFamily: name, fontSize: 20, fontWeight: 800, color: 'var(--vm-text-primary)', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{name}</Typography>
      <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid rgba(255,255,255,.04)' }}>
        <Typography sx={{ fontFamily: name, fontSize: 11, color: 'var(--vm-text-muted)', lineHeight: 1.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>ABCDEFGHIJKLMNOPQRSTUVWXYZ</Typography>
        <Typography sx={{ fontFamily: name, fontSize: 11, color: 'var(--vm-text-muted)', lineHeight: 1.8, opacity: .7 }}>abcdefghijklmnopqrstuvwxyz 0123456789</Typography>
      </Box>
    </Box>
  );
}

function LogoCard({ logo, selected, onSelect, size = 72 }: { logo: LogoOption; selected: boolean; onSelect: () => void; size?: number }) {
  return (
    <Box onClick={onSelect} sx={{
      p: 2.5, borderRadius: 3, cursor: 'pointer', textAlign: 'center',
      border: selected ? '2px solid var(--vm-primary-400)' : '1px solid rgba(255,255,255,.06)',
      bgcolor: selected ? 'rgba(16,185,129,.06)' : 'rgba(255,255,255,.02)',
      transition: 'all .25s cubic-bezier(.4,0,.2,1)',
      position: 'relative', overflow: 'hidden',
      '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 40px rgba(0,0,0,.3)', borderColor: selected ? 'var(--vm-primary-400)' : 'rgba(255,255,255,.12)' },
      '&::before': selected ? { content: '""', position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 0%, rgba(16,185,129,.08), transparent 70%)' } : {},
    }}>
      {selected && <Box sx={{ position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: '50%', bgcolor: 'var(--vm-primary-500)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={12} color="#fff" /></Box>}
      <Box sx={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5 }}>{renderSvg(logo.svg, { size })}</Box>
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'var(--vm-text-primary)', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{logo.name}</Typography>
      <Chip size="small" label={logo.type} sx={{ mt: 0.75, fontSize: 9, textTransform: 'capitalize', bgcolor: selected ? 'rgba(16,185,129,.15)' : 'rgba(255,255,255,.06)', color: selected ? 'var(--vm-primary-400)' : 'var(--vm-text-muted)', height: 20 }} />
      <Typography sx={{ fontSize: 10, color: 'var(--vm-text-muted)', mt: 1, lineHeight: 1.6, overflowWrap: 'anywhere' }}>{logo.concept?.slice(0, 90)}</Typography>
      <IconButton size="small" onClick={(e) => { e.stopPropagation(); downloadSvg(logo.svg, `${logo.name.replace(/[^a-zA-Z0-9]/g, '_')}.svg`); }} sx={{ mt: 1, color: 'var(--vm-text-muted)', '&:hover': { color: 'var(--vm-primary-400)' } }}>
        <Download size={13} />
      </IconButton>
    </Box>
  );
}

function BrandPreview({ brand, businessName, proposed = false }: { brand: BrandingFull; businessName: string; proposed?: boolean }) {
  const { primaryColor, secondaryColor, accentColor, darkColor, fontHeading, fontBody } = brand;
  const gradient = `linear-gradient(135deg, ${darkColor}, ${primaryColor})`;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{
        p: { xs: 3, sm: 4 }, borderRadius: 3.5, background: gradient, position: 'relative', overflow: 'hidden',
        border: proposed ? '1px solid var(--vm-primary-500)' : '1px solid rgba(255,255,255,.08)',
        '&::before': { content: '""', position: 'absolute', inset: 0, background: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,.08), transparent 60%)', pointerEvents: 'none' },
        '&::after': { content: '""', position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: `radial-gradient(circle, ${accentColor}25, transparent 70%)`, pointerEvents: 'none' },
      }}>
        {!proposed && brand.logo && (
          <IconButton onClick={() => downloadSvg(brand.logo, `${businessName.replace(/[^a-zA-Z0-9]/g, '_')}_logo.svg`)}
            sx={{ position: 'absolute', top: 12, right: 12, zIndex: 2, bgcolor: 'rgba(255,255,255,.08)', backdropFilter: 'blur(8px)', color: 'rgba(255,255,255,.6)', '&:hover': { bgcolor: 'rgba(255,255,255,.15)', color: 'white' } }}>
            <Download size={18} />
          </IconButton>
        )}
        <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 3, alignItems: { xs: 'center', sm: 'flex-start' } }}>
          <Box sx={{
            width: { xs: 120, sm: 140 }, height: { xs: 120, sm: 140 }, borderRadius: 3,
            bgcolor: 'rgba(255,255,255,.08)', backdropFilter: 'blur(20px)', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(255,255,255,.12)',
            boxShadow: '0 8px 32px rgba(0,0,0,.2)',
          }}>
            {brand.logo ? (
              brand.logo.includes('<svg') || brand.logo.startsWith('data:') ? renderSvg(brand.logo, { dark: true, size: 90 }) :
              <Box component="img" src={brand.logo} sx={{ maxWidth: 90, maxHeight: 90, objectFit: 'contain', borderRadius: 1 }} />
            ) : <Sparkles size={40} color="rgba(255,255,255,.3)" />}
            {brand.logo && brand.logo.includes('<svg') && (
              <IconButton size="small" onClick={() => downloadSvg(brand.logo, `${businessName.replace(/[^a-zA-Z0-9]/g, '_')}_logo.svg`)}
                sx={{ position: 'absolute', bottom: -8, right: -8, bgcolor: 'rgba(0,0,0,.5)', color: 'white', width: 28, height: 28, '&:hover': { bgcolor: 'rgba(0,0,0,.7)' } }}>
                <Download size={13} />
              </IconButton>
            )}
          </Box>
          <Box sx={{ textAlign: { xs: 'center', sm: 'left' }, flex: 1 }}>
            <Typography sx={{ color: 'white', fontFamily: fontHeading, fontSize: { xs: 26, sm: 34, md: 40 }, fontWeight: 900, lineHeight: 1.1, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{businessName}</Typography>
            <Typography sx={{ color: 'rgba(255,255,255,.6)', fontFamily: fontBody, fontSize: 13, mt: 1, lineHeight: 1.7, maxWidth: 500, overflowWrap: 'anywhere' }}>
              {brand.logoConcept || 'AI-crafted brand identity.'}
            </Typography>
            {proposed && <Chip icon={<Sparkles size={12} />} label="Proposal" size="small" sx={{ mt: 1.5, bgcolor: 'rgba(16,185,129,.2)', color: '#34d399', fontSize: 10, fontWeight: 700 }} />}
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
        <Box>
          <Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Palette size={13} /> Colour Palette
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 1 }}>
            <ColorSwatch label="Primary" value={primaryColor} />
            <ColorSwatch label="Secondary" value={secondaryColor} />
            <ColorSwatch label="Accent" value={accentColor} />
            <ColorSwatch label="Dark" value={darkColor} />
          </Box>
        </Box>
        <Box>
          <Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Type size={13} /> Typography
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
            <FontPreview name={fontHeading || 'Inter'} label="Heading" />
            <FontPreview name={fontBody || 'Inter'} label="Body" />
          </Box>
        </Box>
      </Box>

      {brand.logo && (
        <Box>
          <Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Eye size={13} /> Logo Variations
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', sm: 'repeat(3,1fr)' }, gap: 1 }}>
            {[
              { label: 'Light Background', bg: '#ffffff', dark: false },
              { label: 'Dark Background', bg: darkColor, dark: true },
              { label: 'Gradient', bg: gradient, dark: true },
            ].map(({ label, bg, dark }) => (
              <Box key={label} sx={{
                p: 2.5, borderRadius: 2.5, bgcolor: bg, border: '1px solid rgba(255,255,255,.06)',
                textAlign: 'center', minHeight: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
                transition: 'all .2s', '&:hover': { transform: 'scale(1.02)' },
              }}>
                {renderSvg(brand.logo, { dark, size: 72 })}
                <Typography sx={{ fontSize: 9, color: dark ? 'rgba(255,255,255,.5)' : 'rgba(0,0,0,.4)', fontWeight: 600 }}>{label}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}

const BRAND_GUIDE_QUERY = `mutation GenGuide($businessId: ID!) { generateBrandGuide(businessId: $businessId) { id title content order } }`;
interface BrandGuideSection { id: string; title: string; content: string; order: number; }

export function BrandingKitPage(_props: BrandingKitProps) {
  const { selectedBusiness } = useBusiness();
  const [guideSections, setGuideSections] = useState<BrandGuideSection[] | null>(null);
  const [guideLoading, setGuideLoading] = useState(false);
  const [proposedBrand, setProposedBrand] = useState<BrandingFull | null>(null);
  const [activeTab, setActiveTab] = useState<'logo' | 'colors' | 'typography' | 'variations' | 'mockups'>('logo');
  const [selectedColorIdx, setSelectedColorIdx] = useState(0);
  const [selectedTypoIdx, setSelectedTypoIdx] = useState(0);
  const [selectedLogoIdx, setSelectedLogoIdx] = useState(0);

  useEffect(() => {
    const kit = selectedBusiness?.brandKit as Record<string, unknown> | undefined;
    if (kit?.logo) setActiveTab('logo');
  }, [selectedBusiness?.brandKit]);

  const handleGenerateGuide = useCallback(async () => {
    if (!selectedBusiness) return;
    setGuideLoading(true);
    try {
      const data = await graphqlRequest<{ generateBrandGuide: BrandGuideSection[] }>(BRAND_GUIDE_QUERY, { businessId: selectedBusiness.id });
      setGuideSections(data.generateBrandGuide);
    } catch { /* ignore */ } finally { setGuideLoading(false); }
  }, [selectedBusiness]);

  if (!selectedBusiness) return <NoBusinessSelected message="Select a business to create its identity with AI." />;

  const brand = { ...DEFAULT_BRAND_KIT, ...(selectedBusiness.brandKit || {}) } as BrandingFull;
  const hasApprovedBrand = Boolean(brand.logo);
  const fullBrand = proposedBrand || brand;
  const logos = fullBrand.logos || [];
  const palettes = fullBrand.colors || [];
  const typoPairs = fullBrand.typography || [];
  const gradient = `linear-gradient(135deg, ${brand.darkColor || '#052e24'}, ${brand.primaryColor || '#10b981'})`;
  const tabGradient = `linear-gradient(135deg, ${brand.primaryColor || '#10b981'}20, transparent)`;

  const tabs = [
    { key: 'logo' as const, label: 'Logo', icon: <Eye size={14} /> },
    { key: 'colors' as const, label: 'Colours', icon: <Palette size={14} /> },
    { key: 'typography' as const, label: 'Typography', icon: <Type size={14} /> },
    { key: 'variations' as const, label: 'Variations', icon: <Wand2 size={14} /> },
    { key: 'mockups' as const, label: 'Mockups', icon: <Wand2 size={14} /> },
  ];

  return (
    <Box sx={{ p: { xs: 1.25, sm: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
      <PageHeader
        icon={<Palette size={18} />}
        title="Branding Kit"
        subtitle="AI-crafted brand identity"
        businessName={selectedBusiness.name}
        chips={hasApprovedBrand ? (
          <Button size="small" variant="outlined" startIcon={guideLoading ? <CircularProgress size={13} /> : <BookOpen size={13} />} disabled={guideLoading} onClick={handleGenerateGuide} sx={{ textTransform: 'none', fontSize: 11, borderRadius: 2, borderColor: 'rgba(255,255,255,.1)' }}>
            {guideLoading ? 'Generating…' : 'Brand Guide'}
          </Button>
        ) : undefined}
      />

      {guideSections && (
        <Box sx={{
          mb: 2.5, borderRadius: 3, overflow: 'hidden',
          bgcolor: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: { xs: 2, sm: 3 }, py: 1.5, borderBottom: '1px solid rgba(255,255,255,.06)' }}>
            <BookOpen size={16} color="var(--vm-primary-400)" />
            <Typography sx={{ fontSize: 13, fontWeight: 700, flex: 1, color: 'var(--vm-text-primary)' }}>Brand Identity Guide</Typography>
            <Button size="small" sx={{ textTransform: 'none', fontSize: 11, color: 'var(--vm-primary-400)', whiteSpace: 'nowrap' }} onClick={() => {
              const content = guideSections.sort((a, b) => a.order - b.order).map(s => s.content).join('\n');
              const font = brand.fontHeading || 'Inter';
              const full = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${selectedBusiness.name} Brand Guide</title><link href="https://fonts.googleapis.com/css2?family=${font.replace(/ /g,'+')}:wght@300;400;500;600;700;800&display=swap" rel="stylesheet"><style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'${font}',sans-serif;color:#1a1a2e;background:#fff;line-height:1.7;-webkit-font-smoothing:antialiased}
.section{padding:clamp(32px,5vw,80px) clamp(16px,3vw,48px);max-width:960px;margin:0 auto}
@media(min-width:768px){.section{padding:80px 48px}}
.section-alt{background:#f8fafc;border-radius:16px;margin:24px auto}
h1{font-size:clamp(28px,5vw,48px);font-weight:800;line-height:1.15;margin-bottom:8px}
h2{font-size:clamp(20px,3vw,32px);font-weight:700;margin-bottom:16px;line-height:1.25}
h3{font-size:clamp(16px,2vw,22px);font-weight:600;margin-bottom:12px;line-height:1.3}
p{color:#475569;font-size:clamp(13px,1.2vw,16px);line-height:1.8;margin-bottom:16px;max-width:720px}
img{max-width:100%;height:auto;border-radius:8px}
svg{max-width:100%;height:auto}
.logo-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:clamp(8px,1.5vw,16px);margin:16px 0}
.logo-cell{padding:clamp(12px,2vw,24px);border-radius:12px;text-align:center;background:#fff;border:1px solid #e2e8f0;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:120px}
.logo-cell img,.logo-cell svg{max-width:140px;max-height:80px;width:auto;height:auto}
.logo-label{font-size:10px;color:#64748b;margin-top:8px;text-transform:uppercase;letter-spacing:.08em;font-weight:600}
.swatch{width:100%;height:clamp(40px,5vw,60px);border-radius:8px;margin-bottom:10px}
.color-label{font-size:clamp(11px,1vw,14px);font-weight:600}
.color-hex{font-size:10px;color:#64748b;font-family:monospace;margin-top:2px}
.color-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:clamp(8px,1.5vw,16px);margin:16px 0}
.dark-bg{background:${brand.darkColor || '#052e24'};color:#fff;padding:clamp(20px,3vw,40px);border-radius:16px;margin:24px 0}
.dark-bg p{color:rgba(255,255,255,.7)}
.rule-card{padding:clamp(12px,1.5vw,20px);border-left:4px solid ${brand.primaryColor || '#10b981'};background:#f8fafc;border-radius:0 8px 8px 0;margin-bottom:12px}
.rule-do{border-color:#10b981}.rule-dont{border-color:#ef4444}
</style></head><body>${content}</body></html>`;
              const w = window.open('', '_blank');
              if (w) { w.document.write(full); w.document.close(); }
            }}>Open Full Guide</Button>
            <IconButton size="small" onClick={() => setGuideSections(null)} sx={{ color: 'var(--vm-text-muted)' }}><X size={14} /></IconButton>
          </Box>
          <Box sx={{ px: { xs: 1.5, sm: 3 }, py: { xs: 1.5, sm: 2.5 }, maxWidth: 900, mx: 'auto' }}>
            {guideSections.sort((a, b) => a.order - b.order).map(s => (
              <Box key={s.id} sx={{
                mb: 3,
                '& > *': { maxWidth: '100%', overflowWrap: 'break-word', wordBreak: 'break-word' },
                '& h1, & h2, & h3': { color: 'var(--vm-text-primary)', fontWeight: 700, mb: 1.5, mt: 2.5 },
                '& h1': { fontSize: { xs: 20, sm: 26 }, mt: 0 },
                '& h2': { fontSize: { xs: 16, sm: 20 } },
                '& h3': { fontSize: { xs: 14, sm: 16 } },
                '& p': { color: 'var(--vm-text-secondary)', fontSize: { xs: 12, sm: 13.5 }, lineHeight: 1.8, mb: 1.5 },
                '& img': { maxWidth: '100%', height: 'auto', borderRadius: 2, my: 1.5 },
                '& svg': { maxWidth: '100%', height: 'auto' },
                '& .grid, & .logo-grid': { display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)' } as any, gap: { xs: 1, sm: 2 }, my: 2 },
                '& .logo-cell': { p: { xs: 1.5, sm: 2.5 }, borderRadius: 2, bgcolor: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)', textAlign: 'center' },
                '& .logo-label': { fontSize: 10, color: 'var(--vm-text-muted)', mt: 0.75, textTransform: 'uppercase', letterSpacing: 0.5 },
                '& .card': { p: { xs: 1.5, sm: 2.5 }, borderRadius: 2.5, border: '1px solid rgba(255,255,255,.06)', textAlign: 'center', bgcolor: 'rgba(255,255,255,.02)' },
                '& .swatch': { width: '100%', height: { xs: 40, sm: 60 }, borderRadius: 1.5, mb: 1 },
                '& .color-label': { fontSize: 12, fontWeight: 600, color: 'var(--vm-text-primary)' },
                '& .color-hex': { fontSize: 10, color: 'var(--vm-text-muted)', fontFamily: 'monospace' },
                '& .rule-card': { p: { xs: 1.25, sm: 2 }, borderRadius: 2, borderLeft: '4px solid var(--vm-primary-400)', bgcolor: 'rgba(255,255,255,.03)', mb: 1.5 },
                '& .rule-do': { borderColor: '#10b981' },
                '& .rule-dont': { borderColor: '#ef4444' },
                '& .dark-bg': { bgcolor: brand.darkColor || '#052e24', color: '#fff', p: { xs: 2, sm: 3 }, borderRadius: 2.5, my: 2 },
                '& .dark-bg p': { color: 'rgba(255,255,255,.7)' },
                '& .section': { mb: { xs: 2, sm: 3 } },
                '& .section-alt': { p: { xs: 1.5, sm: 2.5 }, borderRadius: 2.5, bgcolor: 'rgba(255,255,255,.02)' },
              }} dangerouslySetInnerHTML={{ __html: s.content }} />
            ))}
          </Box>
        </Box>
      )}

      {!hasApprovedBrand && !proposedBrand ? (
        <Box sx={{ borderRadius: 3.5, overflow: 'hidden', border: '1px solid rgba(255,255,255,.06)', bgcolor: 'rgba(255,255,255,.02)' }}>
          <AICreationStudio
            domain="branding" title="" description=""
            placeholder="Describe the brand feel you want (e.g., 'Modern, trustworthy edtech brand with green tones')"
            starterPrompts={[
              'Generate a complete brand identity from my business details.',
              'Create a premium luxury brand feel.',
              'Make it warm, friendly and approachable.',
              'Design a bold tech-forward identity.',
            ]}
            emptyLabel=""
            renderCurrent={() => (
              <Box sx={{ textAlign: 'center', py: 6, px: 3 }}>
                <Box sx={{ width: 80, height: 80, borderRadius: 3, background: gradient, mx: 'auto', mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 32px rgba(0,0,0,.3)' }}>
                  <Sparkles size={36} color="rgba(255,255,255,.9)" />
                </Box>
                <Typography sx={{ color: 'var(--vm-text-primary)', fontSize: 20, fontWeight: 800 }}>Your brand identity awaits</Typography>
                <Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 13, mt: 0.75, maxWidth: 400, mx: 'auto', lineHeight: 1.6 }}>
                  Describe your brand vision or choose a starter prompt below. AI will generate a complete brand identity with logos, colours, and typography.
                </Typography>
              </Box>
            )}
            renderProposal={(change: ProposedChange) => {
              const parsed = (() => { try { return JSON.parse(change.newValue) as BrandingFull; } catch { return null; } })();
              if (!parsed) return <Typography color="error">Invalid proposal</Typography>;
              setProposedBrand(parsed);
              return <BrandPreview brand={{ ...DEFAULT_BRAND_KIT, ...parsed }} businessName={selectedBusiness.name} proposed />;
            }}
            onApproved={() => window.location.reload()}
          />
        </Box>
      ) : (
        <Box>
          {/* Brand Hero */}
          {hasApprovedBrand && (
            <Box sx={{ mb: 2.5 }}>
              <BrandPreview brand={brand} businessName={selectedBusiness.name} />
            </Box>
          )}

          {/* Tab navigation for the wizard steps */}
          {hasApprovedBrand && logos.length > 0 && (
            <Box sx={{ mb: 2.5 }}>
              <Box sx={{ display: 'flex', gap: 0.5, p: 0.5, borderRadius: 2.5, bgcolor: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)', overflow: 'auto' }}>
                {tabs.map(tab => (
                  <Box key={tab.key} onClick={() => setActiveTab(tab.key)}
                    sx={{
                      px: 2, py: 1, borderRadius: 2, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1,
                      bgcolor: activeTab === tab.key ? tabGradient : 'transparent',
                      border: activeTab === tab.key ? '1px solid rgba(16,185,129,.2)' : '1px solid transparent',
                      transition: 'all .2s', whiteSpace: 'nowrap',
                      '&:hover': { bgcolor: activeTab === tab.key ? tabGradient : 'rgba(255,255,255,.04)' },
                    }}>
                    {tab.icon}
                    <Typography sx={{ fontSize: 12, fontWeight: activeTab === tab.key ? 700 : 500, color: activeTab === tab.key ? 'var(--vm-text-primary)' : 'var(--vm-text-muted)' }}>{tab.label}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* Tab content */}
          {activeTab === 'logo' && logos.length > 0 && (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3,1fr)' }, gap: 1.5, mb: 2 }}>
              {logos.map((logo, i) => (
                <LogoCard key={i} logo={logo} selected={selectedLogoIdx === i} onSelect={() => setSelectedLogoIdx(i)} />
              ))}
            </Box>
          )}

          {activeTab === 'colors' && palettes.length > 0 && (
            <Box sx={{ display: 'flex', gap: 1.5, flexDirection: { xs: 'column', sm: 'row' }, mb: 2 }}>
              {palettes.map((pal, i) => {
                const c = pal.colors;
                const isSelected = i === selectedColorIdx;
                return (
                  <Box key={i} onClick={() => setSelectedColorIdx(i)} sx={{
                    flex: 1, p: 2, borderRadius: 3, cursor: 'pointer',
                    border: isSelected ? `2px solid ${c.primary}` : '1px solid rgba(255,255,255,.06)',
                    bgcolor: isSelected ? `${c.primary}08` : 'rgba(255,255,255,.02)',
                    transition: 'all .25s cubic-bezier(.4,0,.2,1)',
                    '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 8px 32px ${c.primary}20` },
                  }}>
                    <Box sx={{ display: 'flex', gap: 0.5, mb: 1.5 }}>
                      {[c.primary, c.secondary, c.accent, c.background, c.text].map((h, j) => (
                        <Box key={j} sx={{ flex: 1, height: { xs: 36, sm: 48 }, borderRadius: 1.5, bgcolor: h, border: h === '#ffffff' || h === c.background ? '1px solid rgba(255,255,255,.1)' : 'none' }} />
                      ))}
                    </Box>
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'var(--vm-text-primary)', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{pal.name}</Typography>
                    <Typography sx={{ fontSize: 10, color: 'var(--vm-text-muted)', mt: 0.5, lineHeight: 1.6, overflowWrap: 'anywhere' }}>{pal.rationale?.slice(0, 100)}</Typography>
                    {isSelected && <Chip size="small" label="Selected" sx={{ mt: 1, bgcolor: `${c.primary}20`, color: c.primary, fontSize: 9, fontWeight: 700 }} />}
                  </Box>
                );
              })}
            </Box>
          )}

          {activeTab === 'typography' && typoPairs.length > 0 && (
            <Box sx={{ display: 'flex', gap: 1.5, flexDirection: { xs: 'column', sm: 'row' }, mb: 2 }}>
              {typoPairs.map((pair, i) => {
                const isSelected = i === selectedTypoIdx;
                return (
                  <Box key={i} onClick={() => setSelectedTypoIdx(i)} sx={{
                    flex: 1, p: 2.5, borderRadius: 3, cursor: 'pointer',
                    border: isSelected ? '2px solid var(--vm-primary-400)' : '1px solid rgba(255,255,255,.06)',
                    bgcolor: isSelected ? 'rgba(16,185,129,.04)' : 'rgba(255,255,255,.02)',
                    transition: 'all .25s cubic-bezier(.4,0,.2,1)',
                    '&:hover': { transform: 'translateY(-4px)' },
                  }}>
                    <Box sx={{ mb: 1.5 }}>
                      <Typography sx={{ fontFamily: pair.primaryFont, fontSize: 26, fontWeight: 800, color: 'var(--vm-text-primary)', lineHeight: 1.1, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{pair.primaryFont}</Typography>
                      <Typography sx={{ fontFamily: pair.secondaryFont, fontSize: 16, color: 'var(--vm-text-muted)', mt: 0.75 }}>{pair.secondaryFont}</Typography>
                    </Box>
                    <Box sx={{ pt: 1.5, borderTop: '1px solid rgba(255,255,255,.04)' }}>
                      <Typography sx={{ fontSize: 11, color: 'var(--vm-text-secondary)', fontFamily: pair.secondaryFont, lineHeight: 1.7, overflowWrap: 'anywhere' }}>{pair.rationale?.slice(0, 120)}</Typography>
                    </Box>
                    {isSelected && <Chip size="small" label="Selected" sx={{ mt: 1.5, bgcolor: 'rgba(16,185,129,.15)', color: 'var(--vm-primary-400)', fontSize: 9, fontWeight: 700 }} />}
                  </Box>
                );
              })}
            </Box>
          )}

          {activeTab === 'mockups' && (brand.logo || logos.length > 0) && (
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, mb: 2, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Wand2 size={13} /> Logo on Apparel
              </Typography>
              {(() => {
                const logoEl = brand.logo?.startsWith('http') ? (
                  <Box component="img" src={brand.logo} sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                ) : brand.logo?.startsWith('data:') ? (
                  <Box sx={{ maxWidth: '90%', maxHeight: '90%', display: 'flex', alignItems: 'center', justifyContent: 'center', '& svg': { maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto' } }} dangerouslySetInnerHTML={{ __html: atob(brand.logo.split(',')[1]?.replace(/-/g,'+').replace(/_/g,'/') || '') }} />
                ) : logos[selectedLogoIdx]?.svg ? (
                  <Box sx={{ maxWidth: '90%', maxHeight: '90%', display: 'flex', alignItems: 'center', justifyContent: 'center', '& svg': { maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto' } }} dangerouslySetInnerHTML={{ __html: logos[selectedLogoIdx].svg }} />
                ) : null;
                const shirtUrl = 'https://freepngimg.com/convert-png/2798-white-t-shirt-png-image';
                return (
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)' }, gap: 2 }}>
                    <Box sx={{ position: 'relative', borderRadius: 2.5, overflow: 'hidden', bgcolor: '#fff', border: '1px solid rgba(255,255,255,.06)' }}>
                      <Box sx={{ position: 'absolute', top: '26%', left: '50%', transform: 'translateX(-50%)', width: '32%', height: '22%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>{logoEl}</Box>
                      <Box component="img" src={shirtUrl} alt="White t-shirt" sx={{ width: '100%', height: 'auto', display: 'block', position: 'relative', zIndex: 0 }} />
                      <Typography sx={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', fontSize: 9, color: 'rgba(0,0,0,.3)', zIndex: 1, whiteSpace: 'nowrap' }}>Light Background</Typography>
                    </Box>
                    <Box sx={{ position: 'relative', borderRadius: 2.5, overflow: 'hidden', bgcolor: brand.darkColor || '#0f172a', border: '1px solid rgba(255,255,255,.06)' }}>
                      <Box sx={{ position: 'absolute', top: '26%', left: '50%', transform: 'translateX(-50%)', width: '32%', height: '22%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, filter: 'brightness(0) invert(1)' }}>{logoEl}</Box>
                      <Box component="img" src={shirtUrl} alt="Dark t-shirt" sx={{ width: '100%', height: 'auto', display: 'block', position: 'relative', zIndex: 0, opacity: 0.85 }} />
                      <Typography sx={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', fontSize: 9, color: 'rgba(255,255,255,.3)', zIndex: 1, whiteSpace: 'nowrap' }}>Dark Background</Typography>
                    </Box>
                  </Box>
                );
              })()}
            </Box>
          )}

          {activeTab === 'variations' && logos.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', sm: 'repeat(3,1fr)' }, gap: 1.5 }}>
                {[
                  { label: 'Light Background', svg: logos[selectedLogoIdx].variations?.lightBackground || logos[selectedLogoIdx].svg, bg: '#ffffff', dark: false },
                  { label: 'Dark Background', svg: logos[selectedLogoIdx].variations?.darkBackground || logos[selectedLogoIdx].svg, bg: fullBrand.darkColor || '#0f172a', dark: true },
                  { label: 'Monochrome', svg: logos[selectedLogoIdx].variations?.monochrome || logos[selectedLogoIdx].svg, bg: '#f8fafc', dark: false },
                ].map((item) => (
                  <Box key={item.label} sx={{
                    p: 2.5, borderRadius: 2.5, bgcolor: item.bg, border: '1px solid rgba(255,255,255,.06)',
                    textAlign: 'center', minHeight: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
                    position: 'relative', transition: 'all .2s', '&:hover': { transform: 'scale(1.02)' },
                  }}>
                    {renderSvg(item.svg, { dark: item.dark, size: 64 })}
                    <Typography sx={{ fontSize: 10, color: item.dark ? 'rgba(255,255,255,.5)' : 'rgba(0,0,0,.4)', fontWeight: 600 }}>{item.label}</Typography>
                    <IconButton size="small" onClick={() => downloadSvg(item.svg, `${logos[selectedLogoIdx].name.replace(/[^a-zA-Z0-9]/g, '_')}_${item.label.replace(/ /g, '_').toLowerCase()}.svg`)}
                      sx={{ position: 'absolute', top: 6, right: 6, color: item.dark ? 'rgba(255,255,255,.3)' : 'rgba(0,0,0,.3)', '&:hover': { color: item.dark ? 'white' : 'black' } }}>
                      <Download size={11} />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* AI revision studio */}
          <Box sx={{ borderRadius: 3.5, overflow: 'hidden', border: '1px solid rgba(255,255,255,.06)', bgcolor: 'rgba(255,255,255,.02)' }}>
            <AICreationStudio
              domain="branding" title="" description=""
              placeholder="Tell AI what to revise in your brand identity…"
              starterPrompts={['Create a more premium and minimal logo option.', 'Keep my colours but redesign the logo mark.', 'Make the identity warmer and friendlier.']}
              emptyLabel=""
              renderCurrent={() => <BrandPreview brand={brand} businessName={selectedBusiness.name} />}
              renderProposal={(change: ProposedChange) => {
                const parsed = (() => { try { return JSON.parse(change.newValue) as BrandingFull; } catch { return null; } })();
                return parsed ? <BrandPreview brand={{ ...DEFAULT_BRAND_KIT, ...parsed }} businessName={selectedBusiness.name} proposed /> : <Typography color="error">Invalid proposal</Typography>;
              }}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
}
