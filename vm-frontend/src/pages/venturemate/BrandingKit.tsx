import { useCallback, useState } from 'react';
import { Box, Button, Card, Chip, CircularProgress, Typography, IconButton } from '@mui/material';
import { BookOpen, Building2, Palette, Sparkles, Type, Eye, ChevronLeft, ChevronRight, Check, X, RefreshCw, Download, Wand2, Layers, TrendingUp } from 'lucide-react';
import { AICreationStudio, type ProposedChange } from '../../components/venturemate/AICreationStudio';
import { NoBusinessSelected } from '../../components/venturemate/NoBusinessSelected';
import { useBusiness } from '../../contexts/BusinessContext';
import { graphqlRequest } from '../../lib/api';
import type { BrandKit, BrandingFull, LogoOption, ColorPalette, TypographyPair, LogoVariations, ViewType } from '../../types/venturemate';

interface BrandingKitProps { onViewChange?: (_view: ViewType) => void; }

const DEFAULT_BRAND_KIT: BrandKit = {
  logo: '', logoWhite: '', logoIcon: '', primaryColor: '#10b981', secondaryColor: '#059669',
  accentColor: '#34d399', darkColor: '#052e24', fontHeading: 'Inter', fontBody: 'Inter', patterns: [], socialBanners: [],
};

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
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
    return <Box sx={{ display: 'flex', '& svg': { width: sz, height: sz, maxWidth: sz, maxHeight: sz } }} dangerouslySetInnerHTML={{ __html: cleaned }} />;
  } catch { return null; }
}

function ColorSwatch({ label, value, gradient, onClick }: { label: string; value: string; gradient?: string; onClick?: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <Box sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid rgba(255,255,255,.08)', bgcolor: 'rgba(255,255,255,.02)', cursor: onClick ? 'pointer' : 'default', transition: 'transform .15s, border-color .15s', '&:hover': onClick ? { transform: 'translateY(-2px)', borderColor: 'var(--vm-primary-500)' } : {} }}
      onClick={() => { if (onClick) { onClick(); return; } navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
      <Box sx={{ height: { xs: 48, sm: 56 }, background: gradient || value, position: 'relative' }} />
      <Box sx={{ px: 1.25, py: 1 }}>
        <Typography sx={{ color: 'var(--vm-text-primary)', fontSize: 11, fontWeight: 700, textTransform: 'capitalize' }}>{label}</Typography>
        <Typography sx={{ color: copied ? '#22c55e' : 'var(--vm-text-muted)', fontSize: 10, fontFamily: 'monospace' }}>{copied ? 'Copied!' : value}</Typography>
      </Box>
    </Box>
  );
}

function FontPreview({ name, label }: { name: string; label: string }) {
  if (!name) return null;
  return (
    <Box sx={{ flex: 1, p: 1.5, borderRadius: 2, bgcolor: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
      <Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, mb: 0.5 }}>{label}</Typography>
      <Typography sx={{ fontFamily: name, fontSize: 16, fontWeight: 700, color: 'var(--vm-text-primary)' }}>{name}</Typography>
      <Typography sx={{ fontFamily: name, fontSize: 11, color: 'var(--vm-text-muted)', mt: 0.25, opacity: 0.7 }}>Aa Bb Cc Dd Ee Ff Gg 0123456789</Typography>
    </Box>
  );
}

// ─── Step 1: Pick Color Palette ───
function ColorPickerStep({ palettes, selected, onSelect, businessName, primary }: {
  palettes: ColorPalette[]; selected: number; onSelect: (i: number) => void; businessName: string; primary: string;
}) {
  return (
    <Box>
      <Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, mb: 2 }}>Choose a colour palette</Typography>
      <Box sx={{ display: 'flex', gap: 1.5, flexDirection: { xs: 'column', sm: 'row' } }}>
        {palettes.map((pal, i) => {
          const c = pal.colors;
          const isSelected = i === selected;
          return (
            <Card key={i} onClick={() => onSelect(i)} sx={{
              flex: 1, p: 1.5, cursor: 'pointer', borderRadius: 2.5, border: isSelected ? `2px solid ${c.primary}` : '1px solid var(--vm-border-subtle)',
              bgcolor: isSelected ? `${c.primary}08` : 'var(--vm-bg-secondary)', transition: 'all .2s', '&:hover': { transform: 'translateY(-3px)', boxShadow: `0 8px 24px ${c.primary}20` },
            }}>
              <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
                {[c.primary, c.secondary, c.accent, c.background, c.text].map((h, j) => (
                  <Box key={j} sx={{ flex: 1, height: { xs: 28, sm: 36 }, borderRadius: 1, bgcolor: h, border: h === '#ffffff' || h === c.background ? '1px solid rgba(255,255,255,.1)' : 'none' }} />
                ))}
              </Box>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'var(--vm-text-primary)' }}>{pal.name}</Typography>
              <Typography sx={{ fontSize: 10, color: 'var(--vm-text-muted)', mt: 0.25, lineHeight: 1.5 }}>{pal.rationale?.slice(0, 80)}</Typography>
              <Box sx={{ display: 'flex', gap: 0.75, mt: 1, flexWrap: 'wrap' }}>
                <Chip size="small" label={c.primary} sx={{ bgcolor: c.primary, color: isLightColor(c.primary) ? '#111' : '#fff', fontSize: 9, fontWeight: 700 }} />
                <Chip size="small" label={c.secondary} sx={{ bgcolor: c.secondary, color: isLightColor(c.secondary) ? '#111' : '#fff', fontSize: 9, fontWeight: 700 }} />
                <Chip size="small" label={c.accent} sx={{ bgcolor: c.accent, color: isLightColor(c.accent) ? '#111' : '#fff', fontSize: 9, fontWeight: 700 }} />
              </Box>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
}

// ─── Step 2: Pick Typography ───
function TypoPickerStep({ pairs, selected, onSelect }: {
  pairs: TypographyPair[]; selected: number; onSelect: (i: number) => void;
}) {
  return (
    <Box>
      <Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, mb: 2 }}>Choose a typography pair</Typography>
      <Box sx={{ display: 'flex', gap: 1.5, flexDirection: { xs: 'column', sm: 'row' } }}>
        {pairs.map((pair, i) => {
          const isSelected = i === selected;
          return (
            <Card key={i} onClick={() => onSelect(i)} sx={{
              flex: 1, p: 2, cursor: 'pointer', borderRadius: 2.5, border: isSelected ? '2px solid var(--vm-primary-500)' : '1px solid var(--vm-border-subtle)',
              bgcolor: isSelected ? 'var(--vm-primary-700)10' : 'var(--vm-bg-secondary)', transition: 'all .2s', '&:hover': { transform: 'translateY(-3px)' },
            }}>
              <Box sx={{ mb: 1.5 }}>
                <Typography sx={{ fontFamily: pair.primaryFont, fontSize: 22, fontWeight: 800, color: 'var(--vm-text-primary)', lineHeight: 1.1 }}>{pair.primaryFont}</Typography>
                <Typography sx={{ fontFamily: pair.secondaryFont, fontSize: 14, color: 'var(--vm-text-muted)', mt: 0.5 }}>{pair.secondaryFont}</Typography>
              </Box>
              <Typography sx={{ fontSize: 11, color: 'var(--vm-text-secondary)', fontFamily: pair.secondaryFont, lineHeight: 1.6 }}>
                {pair.rationale?.slice(0, 100)}
              </Typography>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
}

// ─── Step 3: Pick Logo ───
function LogoPickerStep({ logos, selected, onSelect }: {
  logos: LogoOption[]; selected: number; onSelect: (i: number) => void;
}) {
  return (
    <Box>
      <Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, mb: 2 }}>Choose your logo concept</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 1.5 }}>
        {logos.map((logo, i) => {
          const isSelected = i === selected;
          return (
            <Card key={i} onClick={() => onSelect(i)} sx={{
              p: 2, cursor: 'pointer', borderRadius: 2.5, border: isSelected ? '2px solid var(--vm-primary-500)' : '1px solid var(--vm-border-subtle)',
              bgcolor: isSelected ? 'var(--vm-primary-700)15' : 'var(--vm-bg-secondary)', transition: 'all .2s', textAlign: 'center', '&:hover': { transform: 'translateY(-3px)' },
            }}>
              <Box sx={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5 }}>
                {renderSvg(logo.svg, { size: 80 })}
              </Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'var(--vm-text-primary)' }}>{logo.name}</Typography>
              <Chip size="small" label={logo.type} sx={{ mt: 0.5, fontSize: 9, textTransform: 'capitalize' }} />
              <Typography sx={{ fontSize: 10, color: 'var(--vm-text-muted)', mt: 0.75, lineHeight: 1.5 }}>{logo.concept?.slice(0, 80)}</Typography>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
}

// ─── Step 4: Logo Variations ───
function VariationsDisplay({ logo, darkColor, primary }: { logo: LogoOption; darkColor: string; primary: string }) {
  const items: { label: string; svg: string; bg: string; dark: boolean }[] = [
    { label: 'Light BG', svg: logo.variations?.lightBackground || logo.svg, bg: '#ffffff', dark: false },
    { label: 'Dark BG', svg: logo.variations?.darkBackground || logo.svg, bg: darkColor || '#0f172a', dark: true },
    { label: 'Monochrome', svg: logo.variations?.monochrome || logo.svg, bg: '#f8fafc', dark: false },
  ];
  return (
    <Box>
      <Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, mb: 2 }}>
        Logo Variations
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(3, 1fr)' }, gap: 1 }}>
        {items.map((item) => (
          <Box key={item.label} sx={{ p: 2, borderRadius: 2, bgcolor: item.bg, border: '1px solid rgba(255,255,255,.08)', textAlign: 'center', minHeight: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {renderSvg(item.svg, { dark: item.dark, size: 72 })}
            <Typography sx={{ fontSize: 9, color: item.dark ? 'rgba(255,255,255,.5)' : 'rgba(0,0,0,.4)', mt: 0.75 }}>{item.label}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// ─── Full brand preview ───
function BrandPreview({ brand, businessName, proposed = false }: { brand: BrandingFull; businessName: string; proposed?: boolean }) {
  const { primaryColor, secondaryColor, accentColor, darkColor, fontHeading, fontBody } = brand;
  const gradient = `linear-gradient(135deg, ${darkColor}, ${primaryColor})`;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{ p: { xs: 2.5, sm: 3.5 }, borderRadius: 3, background: gradient, border: proposed ? '1px solid var(--vm-primary-500)' : '1px solid rgba(255,255,255,.08)', position: 'relative', overflow: 'hidden' }}>
        <Box sx={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: `radial-gradient(circle, ${accentColor}30, transparent 70%)` }} />
        <Box sx={{ position: 'absolute', bottom: -20, left: -20, width: 100, height: 100, borderRadius: '50%', background: `radial-gradient(circle, ${primaryColor}40, transparent 70%)` }} />
        <Box sx={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '120px 1fr' }, gap: 2.5, alignItems: 'center' }}>
          <Box sx={{ width: { xs: 96, sm: 120 }, height: { xs: 96, sm: 120 }, borderRadius: 2.5, bgcolor: 'rgba(255,255,255,.08)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: { xs: 'auto', sm: 0 }, border: '1px solid rgba(255,255,255,.1)' }}>
            {brand.logo ? (brand.logo.includes('<svg') || brand.logo.startsWith('data:') ? renderSvg(brand.logo, { dark: true, size: 80 }) : <Box component="img" src={brand.logo} sx={{ maxWidth: 80, maxHeight: 80, objectFit: 'contain' }} />) : <Sparkles size={36} color="rgba(255,255,255,.3)" />}
          </Box>
          <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
            <Typography sx={{ color: 'white', fontFamily: fontHeading, fontSize: { xs: 22, sm: 30 }, fontWeight: 900, lineHeight: 1.1 }}>{businessName}</Typography>
            <Typography sx={{ color: 'rgba(255,255,255,.65)', fontFamily: fontBody, fontSize: 12, mt: 0.75, lineHeight: 1.6, maxWidth: 400 }}>
              {brand.logoConcept || 'AI-crafted brand identity for your business.'}
            </Typography>
          </Box>
        </Box>
      </Box>
      <Box>
        <Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, mb: 1, display: 'flex', alignItems: 'center', gap: 0.75 }}><Palette size={14} /> Color Palette</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', sm: 'repeat(4,1fr)' }, gap: 1 }}>
          <ColorSwatch label="Primary" value={primaryColor} gradient={`linear-gradient(135deg, ${primaryColor}, ${accentColor})`} />
          <ColorSwatch label="Secondary" value={secondaryColor} />
          <ColorSwatch label="Accent" value={accentColor} />
          <ColorSwatch label="Dark" value={darkColor} />
        </Box>
      </Box>
      <Box>
        <Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, mb: 1, display: 'flex', alignItems: 'center', gap: 0.75 }}><Type size={14} /> Typography</Typography>
        <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
          <FontPreview name={fontHeading || 'Inter'} label="Heading Font" />
          <FontPreview name={fontBody || 'Inter'} label="Body Font" />
        </Box>
      </Box>
      {brand.logo && (
        <Box>
          <Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, mb: 1, display: 'flex', alignItems: 'center', gap: 0.75 }}><Eye size={14} /> Logo Variations</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', sm: 'repeat(3,1fr)' }, gap: 1 }}>
            {[
              { label: 'Light', bg: '#ffffff', dark: false },
              { label: 'Dark', bg: darkColor, dark: true },
              { label: 'Gradient', bg: gradient, dark: true },
            ].map(({ label, bg, dark }) => (
              <Box key={label} sx={{ p: 2, borderRadius: 2, bgcolor: bg, border: '1px solid rgba(255,255,255,.08)', textAlign: 'center', minHeight: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                {renderSvg(brand.logo, { dark, size: 64 })}
                <Typography sx={{ fontSize: 9, color: dark ? 'rgba(255,255,255,.5)' : 'rgba(0,0,0,.4)', mt: 0.75 }}>{label}</Typography>
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

  // Multi-step wizard state
  const [step, setStep] = useState<'colors' | 'typography' | 'logos' | 'variations' | 'complete'>('colors');
  const [proposedBrand, setProposedBrand] = useState<BrandingFull | null>(null);
  const [selectedColorIdx, setSelectedColorIdx] = useState(0);
  const [selectedTypoIdx, setSelectedTypoIdx] = useState(0);
  const [selectedLogoIdx, setSelectedLogoIdx] = useState(0);
  const [wizardLoading, setWizardLoading] = useState(false);
  const [wizardError, setWizardError] = useState<string | null>(null);

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

  const stepLabels = ['Colors', 'Typography', 'Logo', 'Variations'];
  const stepKeys: (typeof step)[] = ['colors', 'typography', 'logos', 'variations'];
  const currentStepIdx = stepKeys.indexOf(step);

  const advanceStep = () => {
    const next = currentStepIdx + 1;
    if (next < stepKeys.length) setStep(stepKeys[next]);
    else setStep('complete');
  };

  return (
    <Box sx={{ p: { xs: 1.25, sm: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Palette size={19} color="var(--vm-primary-400)" />
        <Chip icon={<Building2 size={14} />} label={selectedBusiness.name} size="small" />
        <Chip label="Multi-step wizard" size="small" color="success" variant="outlined" />
        {hasApprovedBrand && (
          <Button size="small" variant="outlined" startIcon={guideLoading ? <CircularProgress size={13} /> : <BookOpen size={13} />} disabled={guideLoading} onClick={handleGenerateGuide} sx={{ textTransform: 'none', ml: 'auto', fontSize: 12 }}>
            {guideLoading ? 'Generating…' : 'Brand Guide'}
          </Button>
        )}
      </Box>

      {/* Step indicator */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5, overflow: 'auto' }}>
        {stepLabels.map((label, i) => (
          <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{
              width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, flexShrink: 0,
              bgcolor: i <= currentStepIdx ? 'var(--vm-primary-500)' : 'var(--vm-bg-tertiary)',
              color: i <= currentStepIdx ? '#fff' : 'var(--vm-text-muted)',
              border: i <= currentStepIdx ? 'none' : '1px solid var(--vm-border-subtle)',
            }}>{i + 1}</Box>
            <Typography sx={{ fontSize: 11, fontWeight: i === currentStepIdx ? 700 : 400, color: i <= currentStepIdx ? 'var(--vm-text-primary)' : 'var(--vm-text-muted)', whiteSpace: 'nowrap', display: { xs: i === currentStepIdx ? 'block' : 'none', sm: 'block' } }}>{label}</Typography>
            {i < stepLabels.length - 1 && <Box sx={{ width: 24, height: 1, bgcolor: i < currentStepIdx ? 'var(--vm-primary-500)' : 'var(--vm-border-subtle)', display: { xs: 'none', sm: 'block' } }} />}
          </Box>
        ))}
      </Box>

      {guideSections && (
        <Card sx={{ mb: 2.5, border: '1px solid var(--vm-border-subtle)', borderRadius: 3, overflow: 'hidden' }}>
          <Box sx={{ px: 2, py: 1.5, bgcolor: 'var(--vm-bg-secondary)', borderBottom: '1px solid var(--vm-border-subtle)', display: 'flex', alignItems: 'center', gap: 1 }}>
            <BookOpen size={16} />
            <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Brand Identity Guide</Typography>
            <Button size="small" sx={{ ml: 'auto', textTransform: 'none', fontSize: 11 }} onClick={() => {
              const html = guideSections.sort((a, b) => a.order - b.order).map(s => s.content).join('');
              const w = window.open('', '_blank');
              if (w) { w.document.write(html); w.document.close(); }
            }}>Open Full Guide</Button>
            <IconButton size="small" onClick={() => setGuideSections(null)} sx={{ color: 'var(--vm-text-muted)' }}><X size={14} /></IconButton>
          </Box>
          {guideSections.sort((a, b) => a.order - b.order).map(s => (
            <Box key={s.id} sx={{ '& > *': { maxWidth: '100%' } }} dangerouslySetInnerHTML={{ __html: s.content }} />
          ))}
        </Card>
      )}

      {/* Wizard + AICreationStudio */}
      {selectedBusiness && (
        <Box>
          {/* If we have no brand data at all, show wizard */}
          {!hasApprovedBrand && !proposedBrand && (
            <Card sx={{ p: 3, mb: 2.5, borderRadius: 3, border: '1px solid var(--vm-border-subtle)', bgcolor: 'var(--vm-bg-secondary)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Wand2 size={20} color="var(--vm-primary-400)" />
                <Box>
                  <Typography sx={{ fontSize: 16, fontWeight: 900 }}>Start your brand identity</Typography>
                  <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>Generate colours, typography, and logo concepts in one step</Typography>
                </Box>
              </Box>
              <AICreationStudio
                domain="branding"
                title=""
                description=""
                placeholder="Describe the brand feel you want (e.g., 'Modern, trustworthy edtech brand with green tones')"
                starterPrompts={[
                  'Generate a complete brand identity from my business details.',
                  'Create a premium luxury brand feel.',
                  'Make it warm, friendly and approachable.',
                  'Design a bold tech-forward identity.',
                ]}
                emptyLabel="Generate your first brand identity to get started."
                renderCurrent={() => null}
                renderProposal={(change: ProposedChange) => {
                  const parsed = (() => { try { return JSON.parse(change.newValue) as BrandingFull; } catch { return null; } })();
                  if (!parsed) return <Typography color="error">Invalid proposal</Typography>;
                  setProposedBrand(parsed);
                  return <BrandPreview brand={{ ...DEFAULT_BRAND_KIT, ...parsed }} businessName={selectedBusiness.name} proposed />;
                }}
                onApproved={() => { setStep('colors'); window.location.reload(); }}
              />
            </Card>
          )}

          {/* After brand kit exists, show step-by-step picker */}
          {(hasApprovedBrand || proposedBrand) && palettes.length > 0 && step === 'colors' && (
            <Card sx={{ p: 2.5, mb: 2, borderRadius: 3, border: '1px solid var(--vm-border-subtle)' }}>
              <ColorPickerStep palettes={palettes} selected={selectedColorIdx} onSelect={setSelectedColorIdx} businessName={selectedBusiness.name} primary={fullBrand.primaryColor} />
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="contained" endIcon={<ChevronRight size={16} />} onClick={advanceStep}>Next: Typography</Button>
              </Box>
            </Card>
          )}

          {typoPairs.length > 0 && step === 'typography' && (
            <Card sx={{ p: 2.5, mb: 2, borderRadius: 3, border: '1px solid var(--vm-border-subtle)' }}>
              <TypoPickerStep pairs={typoPairs} selected={selectedTypoIdx} onSelect={setSelectedTypoIdx} />
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                <Button variant="text" startIcon={<ChevronLeft size={16} />} onClick={() => setStep('colors')}>Back</Button>
                <Button variant="contained" endIcon={<ChevronRight size={16} />} onClick={advanceStep}>Next: Logo</Button>
              </Box>
            </Card>
          )}

          {logos.length > 0 && step === 'logos' && (
            <Card sx={{ p: 2.5, mb: 2, borderRadius: 3, border: '1px solid var(--vm-border-subtle)' }}>
              <LogoPickerStep logos={logos} selected={selectedLogoIdx} onSelect={setSelectedLogoIdx} />
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                <Button variant="text" startIcon={<ChevronLeft size={16} />} onClick={() => setStep('typography')}>Back</Button>
                <Button variant="contained" endIcon={<ChevronRight size={16} />} onClick={advanceStep}>Next: Variations</Button>
              </Box>
            </Card>
          )}

          {logos.length > 0 && step === 'variations' && (
            <Card sx={{ p: 2.5, mb: 2, borderRadius: 3, border: '1px solid var(--vm-border-subtle)' }}>
              <VariationsDisplay logo={logos[selectedLogoIdx]} darkColor={fullBrand.darkColor} primary={fullBrand.primaryColor} />
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                <Button variant="text" startIcon={<ChevronLeft size={16} />} onClick={() => setStep('logos')}>Back</Button>
                <Button variant="contained" color="success" endIcon={<Check size={16} />} onClick={() => setStep('complete')}>Complete Brand Identity</Button>
              </Box>
            </Card>
          )}

          {/* AICreationStudio for revisions (shown when not in wizard steps) */}
          {(hasApprovedBrand && step === 'complete') || (!palettes.length && !typoPairs.length && !logos.length && hasApprovedBrand) ? (
            <AICreationStudio
              domain="branding"
              title="AI Brand & Logo Studio"
              description="Revise or regenerate your brand identity through conversation."
              placeholder="Example: Create a more premium and minimal logo option."
              starterPrompts={[
                'Generate a complete logo and brand identity from my business details.',
                'Create a more premium and minimal logo option.',
                'Keep my colours but redesign the logo mark to feel more memorable.',
                'Make the identity warmer, friendlier, and suitable for social media.',
              ]}
              emptyLabel="No approved AI brand exists yet. Generate the first logo and identity."
              renderCurrent={() => hasApprovedBrand ? <BrandPreview brand={brand} businessName={selectedBusiness.name} /> : null}
              renderProposal={(change: ProposedChange) => {
                const parsed = (() => { try { return JSON.parse(change.newValue) as BrandingFull; } catch { return null; } })();
                return parsed ? <BrandPreview brand={{ ...DEFAULT_BRAND_KIT, ...parsed }} businessName={selectedBusiness.name} proposed /> : <Typography color="error">Invalid proposal</Typography>;
              }}
            />
          ) : null}
        </Box>
      )}
    </Box>
  );
}
