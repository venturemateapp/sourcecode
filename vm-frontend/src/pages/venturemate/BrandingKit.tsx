import { useCallback, useState } from 'react';
import { Box, Button, Card, Chip, CircularProgress, Typography } from '@mui/material';
import { BookOpen, Building2, Palette, Sparkles, Type, Droplets, Eye } from 'lucide-react';
import { AICreationStudio, type ProposedChange } from '../../components/venturemate/AICreationStudio';
import { NoBusinessSelected } from '../../components/venturemate/NoBusinessSelected';
import { useBusiness } from '../../contexts/BusinessContext';
import { graphqlRequest } from '../../lib/api';
import type { BrandKit, ViewType } from '../../types/venturemate';

interface BrandingKitProps { onViewChange?: (_view: ViewType) => void; }

const DEFAULT_BRAND_KIT: BrandKit = {
  logo: '', logoWhite: '', logoIcon: '', primaryColor: '#10b981', secondaryColor: '#059669',
  accentColor: '#34d399', darkColor: '#052e24', fontHeading: 'Inter', fontBody: 'Inter', patterns: [], socialBanners: [],
};

type BrandKitWithConcept = BrandKit & { logoConcept?: { mark?: string; shape?: string; style?: string; rationale?: string; }; };

function parseBrand(change: ProposedChange): BrandKitWithConcept | null {
  try { return JSON.parse(change.newValue) as BrandKitWithConcept; } catch { return null; }
}

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // WCAG relative luminance
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 160;
}

function adaptColor(match: string, attr: string, onDark: boolean): string {
  const color = match.replace(`${attr}="`, '').replace('"', '');
  if (!/^#[0-9A-Fa-f]{6}$/.test(color)) return match;
  const light = isLightColor(color);
  if (onDark) {
    // On dark bg: dark colors → white, light colors stay
    return light ? match : `${attr}="rgba(255,255,255,.85)"`;
  } else {
    // On light bg: light colors → dark, dark colors stay
    return light ? `${attr}="rgba(0,0,0,.75)"` : match;
  }
}

function renderSvg(svg: string, options?: { dark?: boolean; size?: number }) {
  try {
    let cleaned = svg.startsWith('data:') ? atob(svg.split(',')[1]?.replace(/-/g, '+').replace(/_/g, '/') || '') : svg;
    const onDark = options?.dark === true;

    // Preserve none/transparent fills
    cleaned = cleaned.replace(/(fill=")(?:none|transparent)(")/gi, '___KEEP_FILL___$1$2___END_KEEP___');

    // Adapt fill colors
    cleaned = cleaned.replace(/fill="#[0-9A-Fa-f]{6}"/gi, (m) => adaptColor(m, 'fill', onDark));

    // Adapt stroke colors
    cleaned = cleaned.replace(/stroke="#[0-9A-Fa-f]{6}"/gi, (m) => adaptColor(m, 'stroke', onDark));

    // Adapt text fill for readability
    cleaned = cleaned.replace(/<text[^>]*fill="#[0-9A-Fa-f]{6}"/gi, (m) => {
      const color = m.match(/fill="#([0-9A-Fa-f]{6})"/i);
      if (!color) return m;
      const light = isLightColor('#' + color[1]);
      if (onDark) return light ? m : m.replace(/fill="#[0-9A-Fa-f]{6}"/i, 'fill="rgba(255,255,255,.9)"');
      else return light ? m.replace(/fill="#[0-9A-Fa-f]{6}"/i, 'fill="rgba(0,0,0,.8)"') : m;
    });

    // Restore none/transparent fills
    cleaned = cleaned.replace(/___KEEP_FILL___fill="(?:none|transparent)"___END_KEEP___/g, 'fill="none"');

    const sz = options?.size || 100;
    return <Box sx={{ display: 'flex', '& svg': { width: sz, height: sz, maxWidth: sz, maxHeight: sz } }} dangerouslySetInnerHTML={{ __html: cleaned }} />;
  } catch { return null; }
}

function ColorSwatch({ label, value, gradient }: { label: string; value: string; gradient?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Box sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid rgba(255,255,255,.08)', bgcolor: 'rgba(255,255,255,.02)', cursor: 'pointer', transition: 'transform .15s', '&:hover': { transform: 'translateY(-2px)' } }}
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
      <Box sx={{ height: { xs: 48, sm: 56 }, background: gradient || value, position: 'relative' }}>
        <Box sx={{ position: 'absolute', inset: 0, background: gradient ? 'none' : value, opacity: 0.9 }} />
      </Box>
      <Box sx={{ px: 1.25, py: 1 }}>
        <Typography sx={{ color: 'var(--vm-text-primary)', fontSize: 11, fontWeight: 700, textTransform: 'capitalize' }}>{label}</Typography>
        <Typography sx={{ color: copied ? '#22c55e' : 'var(--vm-text-muted)', fontSize: 10, fontFamily: 'monospace' }}>{copied ? 'Copied!' : value}</Typography>
      </Box>
    </Box>
  );
}

function FontPreview({ name, label }: { name: string; label: string }) {
  return (
    <Box sx={{ flex: 1, p: 1.5, borderRadius: 2, bgcolor: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
      <Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, mb: 0.5 }}>{label}</Typography>
      <Typography sx={{ fontFamily: name, fontSize: 16, fontWeight: 700, color: 'var(--vm-text-primary)' }}>{name}</Typography>
      <Typography sx={{ fontFamily: name, fontSize: 11, color: 'var(--vm-text-muted)', mt: 0.25, opacity: 0.7 }}>
        Aa Bb Cc Dd Ee Ff Gg 0123456789
      </Typography>
    </Box>
  );
}

function BrandPreview({ brand, businessName, proposed = false }: { brand: BrandKitWithConcept; businessName: string; proposed?: boolean }) {
  const { primaryColor, secondaryColor, accentColor, darkColor } = brand;
  const gradient = `linear-gradient(135deg, ${darkColor}, ${primaryColor})`;
  const gradientAccent = `linear-gradient(135deg, ${primaryColor}, ${accentColor})`;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {/* Brand header card */}
      <Box sx={{
        p: { xs: 2.5, sm: 3.5 }, borderRadius: 3, background: gradient,
        border: proposed ? '1px solid var(--vm-primary-500)' : '1px solid rgba(255,255,255,.08)',
        position: 'relative', overflow: 'hidden',
      }}>
        <Box sx={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: `radial-gradient(circle, ${accentColor}30, transparent 70%)` }} />
        <Box sx={{ position: 'absolute', bottom: -20, left: -20, width: 100, height: 100, borderRadius: '50%', background: `radial-gradient(circle, ${primaryColor}40, transparent 70%)` }} />
        <Box sx={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '120px 1fr' }, gap: 2.5, alignItems: 'center' }}>
          <Box sx={{ width: { xs: 96, sm: 120 }, height: { xs: 96, sm: 120 }, borderRadius: 2.5, bgcolor: 'rgba(255,255,255,.08)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: { xs: 'auto', sm: 0 }, border: '1px solid rgba(255,255,255,.1)' }}>
          {brand.logo ? (
            brand.logo.includes('<svg') || brand.logo.startsWith('data:') ? renderSvg(brand.logo, { dark: true, size: 80 }) : <Box component="img" src={brand.logo} sx={{ maxWidth: 80, maxHeight: 80, objectFit: 'contain' }} />
          ) : <Sparkles size={36} color="rgba(255,255,255,.3)" />}
          </Box>
          <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
            <Typography sx={{ color: 'white', fontFamily: brand.fontHeading, fontSize: { xs: 22, sm: 30 }, fontWeight: 900, lineHeight: 1.1 }}>{businessName}</Typography>
            <Typography sx={{ color: 'rgba(255,255,255,.65)', fontFamily: brand.fontBody, fontSize: 12, mt: 0.75, lineHeight: 1.6, maxWidth: 400 }}>
              {brand.logoConcept?.rationale || 'AI-crafted brand identity for your business.'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 1.5, justifyContent: { xs: 'center', sm: 'flex-start' } }}>
              {brand.logoConcept?.style && <Chip size="small" label={brand.logoConcept.style} sx={{ bgcolor: 'rgba(255,255,255,.1)', color: 'rgba(255,255,255,.8)', fontSize: 10 }} />}
              {brand.logoConcept?.shape && <Chip size="small" label={brand.logoConcept.shape} sx={{ bgcolor: 'rgba(255,255,255,.1)', color: 'rgba(255,255,255,.8)', fontSize: 10 }} />}
              {brand.logoConcept?.mark && <Chip size="small" label={`Mark: ${brand.logoConcept.mark}`} sx={{ bgcolor: 'rgba(255,255,255,.1)', color: 'rgba(255,255,255,.8)', fontSize: 10 }} />}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Color palette */}
      <Box>
        <Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, mb: 1, display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Droplets size={14} /> Color Palette
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', sm: 'repeat(4,1fr)' }, gap: 1 }}>
          <ColorSwatch label="Primary" value={primaryColor} gradient={gradientAccent} />
          <ColorSwatch label="Secondary" value={secondaryColor} />
          <ColorSwatch label="Accent" value={accentColor} />
          <ColorSwatch label="Dark" value={darkColor} />
        </Box>
      </Box>

      {/* Typography */}
      <Box>
        <Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, mb: 1, display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Type size={14} /> Typography
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
          <FontPreview name={brand.fontHeading || 'Inter'} label="Heading Font" />
          <FontPreview name={brand.fontBody || 'Inter'} label="Body Font" />
        </Box>
      </Box>

      {/* Logo on different backgrounds */}
      {brand.logo && (
        <Box>
          <Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, mb: 1, display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Eye size={14} /> Logo Variations
          </Typography>
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

const BRAND_GUIDE_QUERY = `
  mutation GenGuide($businessId: ID!) {
    generateBrandGuide(businessId: $businessId) {
      id title content order
    }
  }
`;

interface BrandGuideSection { id: string; title: string; content: string; order: number; }

export function BrandingKitPage(_props: BrandingKitProps) {
  const { selectedBusiness } = useBusiness();
  const [guideSections, setGuideSections] = useState<BrandGuideSection[] | null>(null);
  const [guideLoading, setGuideLoading] = useState(false);

  const handleGenerateGuide = useCallback(async () => {
    if (!selectedBusiness) return;
    setGuideLoading(true);
    try {
      const data = await graphqlRequest<{ generateBrandGuide: BrandGuideSection[] }>(BRAND_GUIDE_QUERY, { businessId: selectedBusiness.id });
      setGuideSections(data.generateBrandGuide);
    } catch { /* ignore */ } finally { setGuideLoading(false); }
  }, [selectedBusiness]);

  if (!selectedBusiness) return <NoBusinessSelected message="Select a business to create its identity with AI." />;

  const brand = { ...DEFAULT_BRAND_KIT, ...(selectedBusiness.brandKit || {}) } as BrandKitWithConcept;
  const hasApprovedBrand = Boolean(brand.logo);

  return (
    <Box sx={{ p: { xs: 1.25, sm: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Palette size={19} color="var(--vm-primary-400)" />
        <Chip icon={<Building2 size={14} />} label={selectedBusiness.name} size="small" />
        <Chip label="AI-only workflow" size="small" color="success" variant="outlined" />
        {hasApprovedBrand && (
          <Button size="small" variant="outlined" startIcon={guideLoading ? <CircularProgress size={13} /> : <BookOpen size={13} />} disabled={guideLoading} onClick={handleGenerateGuide} sx={{ textTransform: 'none', ml: 'auto', fontSize: 12 }}>
            {guideLoading ? 'Generating…' : 'Brand Guide'}
          </Button>
        )}
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
          </Box>
          {guideSections.sort((a, b) => a.order - b.order).map(s => (
            <Box key={s.id} sx={{ '& > *': { maxWidth: '100%' } }} dangerouslySetInnerHTML={{ __html: s.content }} />
          ))}
        </Card>
      )}

      <AICreationStudio
        domain="branding"
        title="AI Brand & Logo Studio"
        description="There are no upload or manual colour controls here. Tell VentureMate AI what the brand should feel like, review the generated identity, request another option or a precise revision, then approve the version you want."
        placeholder="Example: Create a modern trustworthy logo for my education business. Use an abstract upward mark, emerald green, and a clean premium typeface."
        starterPrompts={[
          'Generate a complete logo and brand identity from my business details.',
          'Create a more premium and minimal logo option.',
          'Keep my colours but redesign the logo mark to feel more memorable.',
          'Make the identity warmer, friendlier, and suitable for social media.',
        ]}
        emptyLabel="No approved AI brand exists yet. Generate the first logo and identity."
        renderCurrent={() => hasApprovedBrand ? <BrandPreview brand={brand} businessName={selectedBusiness.name} /> : null}
        renderProposal={(change) => {
          const proposed = parseBrand(change);
          return proposed ? <BrandPreview brand={{ ...DEFAULT_BRAND_KIT, ...proposed }} businessName={selectedBusiness.name} proposed /> : <Typography color="error">The AI proposal could not be previewed.</Typography>;
        }}
      />
    </Box>
  );
}
