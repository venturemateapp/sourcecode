import { Box, Card, Chip, Typography } from '@mui/material';
import { Building2, Palette, Sparkles, Type } from 'lucide-react';
import { AICreationStudio, type ProposedChange } from '../../components/venturemate/AICreationStudio';
import { NoBusinessSelected } from '../../components/venturemate/NoBusinessSelected';
import { useBusiness } from '../../contexts/BusinessContext';
import type { BrandKit, ViewType } from '../../types/venturemate';

interface BrandingKitProps {
  onViewChange?: (_view: ViewType) => void;
}

const DEFAULT_BRAND_KIT: BrandKit = {
  logo: '',
  logoWhite: '',
  logoIcon: '',
  primaryColor: '#10b981',
  secondaryColor: '#059669',
  accentColor: '#34d399',
  darkColor: '#052e24',
  fontHeading: 'Inter',
  fontBody: 'Inter',
  patterns: [],
  socialBanners: [],
};

type BrandKitWithConcept = BrandKit & {
  logoConcept?: {
    mark?: string;
    shape?: string;
    style?: string;
    rationale?: string;
  };
};

function parseBrand(change: ProposedChange): BrandKitWithConcept | null {
  try {
    return JSON.parse(change.newValue) as BrandKitWithConcept;
  } catch {
    return null;
  }
}

function BrandPreview({ brand, businessName, proposed = false }: { brand: BrandKitWithConcept; businessName: string; proposed?: boolean }) {
  const colors = [
    ['Primary', brand.primaryColor],
    ['Secondary', brand.secondaryColor],
    ['Accent', brand.accentColor],
    ['Dark', brand.darkColor],
  ];
  return (
    <Box>
      <Box
        sx={{
          minHeight: { xs: 210, sm: 260 },
          p: { xs: 2, sm: 3 },
          borderRadius: 3,
          background: `radial-gradient(circle at 85% 15%, ${brand.accentColor}55, transparent 30%), linear-gradient(135deg, ${brand.darkColor}, ${brand.primaryColor})`,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '150px 1fr' },
          alignItems: 'center',
          gap: 2.5,
          border: proposed ? '1px solid var(--vm-primary-500)' : '1px solid var(--vm-border-subtle)',
        }}
      >
        <Box sx={{ width: 132, height: 132, borderRadius: 3, bgcolor: 'rgba(255,255,255,.09)', display: 'grid', placeItems: 'center', mx: { xs: 'auto', sm: 0 }, overflow: 'hidden' }}>
          {brand.logo ? (
            <Box component="img" src={brand.logo} alt={`${businessName} logo`} sx={{ width: 112, height: 112, objectFit: 'contain' }} />
          ) : (
            <Sparkles size={42} color="white" />
          )}
        </Box>
        <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
          <Typography sx={{ color: 'white', fontFamily: brand.fontHeading || 'Inter', fontSize: { xs: 25, sm: 34 }, fontWeight: 900 }}>
            {businessName}
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,.76)', fontFamily: brand.fontBody || 'Inter', mt: 0.75, fontSize: 13 }}>
            {brand.logoConcept?.rationale || 'An AI-created identity using the approved business details.'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 1.5, justifyContent: { xs: 'center', sm: 'flex-start' } }}>
            {brand.logoConcept?.style && <Chip size="small" label={brand.logoConcept.style} />}
            {brand.logoConcept?.shape && <Chip size="small" label={brand.logoConcept.shape} />}
            {brand.logoConcept?.mark && <Chip size="small" label={`Mark: ${brand.logoConcept.mark}`} />}
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 1.25, mt: 1.5 }}>
        {colors.map(([label, value]) => (
          <Card key={label} sx={{ bgcolor: 'var(--vm-bg-tertiary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 2.5, overflow: 'hidden' }}>
            <Box sx={{ height: 52, bgcolor: value }} />
            <Box sx={{ p: 1.1 }}>
              <Typography sx={{ color: 'var(--vm-text-primary)', fontSize: 12, fontWeight: 800 }}>{label}</Typography>
              <Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 11 }}>{value}</Typography>
            </Box>
          </Card>
        ))}
      </Box>

      <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 2.5, bgcolor: 'var(--vm-bg-tertiary)', border: '1px solid var(--vm-border-subtle)', display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Type size={16} /><Typography sx={{ color: 'var(--vm-text-secondary)', fontSize: 12 }}>Heading: <strong>{brand.fontHeading}</strong></Typography></Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Type size={16} /><Typography sx={{ color: 'var(--vm-text-secondary)', fontSize: 12 }}>Body: <strong>{brand.fontBody}</strong></Typography></Box>
      </Box>
    </Box>
  );
}

export function BrandingKitPage({}: BrandingKitProps) {
  const { selectedBusiness } = useBusiness();
  if (!selectedBusiness) return <NoBusinessSelected message="Select a business to create its identity with AI." />;

  const brand = { ...DEFAULT_BRAND_KIT, ...(selectedBusiness.brandKit || {}) } as BrandKitWithConcept;
  const hasApprovedBrand = Boolean(brand.logo);

  return (
    <Box sx={{ p: { xs: 1.25, sm: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Palette size={19} color="var(--vm-primary-400)" />
        <Chip icon={<Building2 size={14} />} label={selectedBusiness.name} size="small" />
        <Chip label="AI-only workflow" size="small" color="success" variant="outlined" />
      </Box>
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
