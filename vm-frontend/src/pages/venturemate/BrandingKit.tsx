import { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  Chip,
  Grid,
  Tabs,
  Tab,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  Palette,
  Copy,
  Check,
  Download,
  Image,
  FileText,
  Layout,
  Share2,
  Building2,
  Plus,
} from 'lucide-react';
import type { ViewType } from '../../types/venturemate';
import { GradientButton } from '../../components/shared/buttons';
import { useBusiness } from '../../contexts/BusinessContext';
import { NoBusinessSelected } from '../../components/venturemate/NoBusinessSelected';
import { DomainChat } from '../../components/venturemate/DomainChat';

interface BrandingKitProps {
  onViewChange?: (_view: ViewType) => void;
}

export function BrandingKitPage({}: BrandingKitProps) {
  const { selectedBusiness: currentBusiness } = useBusiness();
  const [activeTab, setActiveTab] = useState(0);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);

  if (!currentBusiness) {
    return <NoBusinessSelected message="Select a business to manage your brand kit." />;
  }

  const brandKit = currentBusiness.brandKit;

  const handleCopyColor = (color: string) => {
    navigator.clipboard.writeText(color);
    setCopiedColor(color);
    setTimeout(() => setCopiedColor(null), 2000);
  };

  const colorPalette = [
    { name: 'Primary', color: brandKit.primaryColor, description: 'Main brand color' },
    { name: 'Secondary', color: brandKit.secondaryColor, description: 'Supporting color' },
    { name: 'Accent', color: brandKit.accentColor, description: 'Highlights & CTAs' },
    { name: 'Dark', color: brandKit.darkColor, description: 'Text & backgrounds' },
  ];

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', mb: { xs: 3, md: 4 }, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 2, sm: 0 } }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1, flexWrap: 'wrap' }}>
<Typography sx={{ fontSize: { xs: 18, sm: 20, md: 24 }, fontWeight: 700, color: 'var(--vm-text-primary)' }}>
              Branding Kit
            </Typography>
            <Typography sx={{ fontSize: { xs: 12, sm: 13, md: 15 }, color: 'var(--vm-text-muted)' }}>
              Create and manage your brand assets
            </Typography>
            <Chip
              icon={<Building2 size={14} />}
              label={currentBusiness?.name}
              sx={{
                bgcolor: `${currentBusiness?.brandKit.primaryColor}20`,
                color: currentBusiness?.brandKit.primaryColor,
                fontWeight: 600,
              }}
            />
          </Box>
          <Typography sx={{ fontSize: 15, color: 'var(--vm-text-muted)' }}>
            Create and manage your brand assets
          </Typography>
        </Box>
        <GradientButton variant="primary" size="md">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Download size={18} />
            Export Kit
          </Box>
        </GradientButton>
      </Box>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          mb: 3,
          '& .MuiTabs-indicator': { bgcolor: brandKit.primaryColor },
          '& .MuiTab-root': {
            color: 'var(--vm-text-muted)',
            textTransform: 'none',
            fontSize: { xs: '0.75rem', sm: '0.875rem' },
            minWidth: { xs: 'auto', sm: 90 },
            '&.Mui-selected': { color: brandKit.primaryColor },
          },
        }}
      >
        <Tab icon={<Palette size={16} />} iconPosition="start" label="Colors" />
        <Tab icon={<Layout size={16} />} iconPosition="start" label="Typography" />
        <Tab icon={<Image size={16} />} iconPosition="start" label="Logos" />
        <Tab icon={<Share2 size={16} />} iconPosition="start" label="Social" />
      </Tabs>

      {/* Colors Tab */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {colorPalette.map((item) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={item.name}>
              <Card
                sx={{
                  bgcolor: 'var(--vm-bg-secondary)',
                  border: '1px solid var(--vm-border-subtle)',
                  borderRadius: 3,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': { transform: 'translateY(-4px)', borderColor: item.color },
                }}
                onClick={() => handleCopyColor(item.color)}
              >
                <Box
                  sx={{
                    height: 120,
                    bgcolor: item.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {copiedColor === item.color ? (
                    <Check size={32} color="#fff" />
                  ) : (
                    <Typography sx={{ fontSize: 14, color: '#fff', fontWeight: 600 }}>
                      {item.color}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ p: 2 }}>
                  <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'var(--vm-text-primary)' }}>
                    {item.name}
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)' }}>
                    {item.description}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <Typography
                      sx={{
                        fontSize: 12,
                        fontFamily: 'monospace',
                        color: 'var(--vm-text-secondary)',
                        bgcolor: 'var(--vm-bg-tertiary)',
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                      }}
                    >
                      {item.color}
                    </Typography>
                    <Tooltip title="Copy to clipboard">
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleCopyColor(item.color); }}>
                        <Copy size={14} color="var(--vm-text-muted)" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </Card>
            </Grid>
          ))}

          {/* Color Combinations */}
          <Grid size={{ xs: 12 }}>
            <Card sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, p: 3 }}>
              <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 2 }}>
                Color Combinations
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: { xs: 1, sm: 2 }, flexDirection: { xs: 'column', sm: 'row' } }}>
                  <Box sx={{ flex: 1, p: { xs: 2, sm: 3 }, bgcolor: brandKit.primaryColor, borderRadius: 2, textAlign: 'center' }}>
                    <Typography sx={{ color: '#fff', fontWeight: 600 }}>Primary on White</Typography>
                  </Box>
                  <Box sx={{ flex: 1, p: { xs: 2, sm: 3 }, bgcolor: brandKit.darkColor, borderRadius: 2, textAlign: 'center' }}>
                    <Typography sx={{ color: brandKit.accentColor, fontWeight: 600 }}>Accent on Dark</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: { xs: 1, sm: 2 }, flexDirection: { xs: 'column', sm: 'row' } }}>
                  <Box sx={{ flex: 1, p: { xs: 2, sm: 3 }, bgcolor: brandKit.secondaryColor, borderRadius: 2, textAlign: 'center' }}>
                    <Typography sx={{ color: '#fff', fontWeight: 600 }}>Secondary Background</Typography>
                  </Box>
                  <Box sx={{ flex: 1, p: { xs: 2, sm: 3 }, bgcolor: `${brandKit.primaryColor}20`, borderRadius: 2, textAlign: 'center', border: `2px solid ${brandKit.primaryColor}` }}>
                    <Typography sx={{ color: brandKit.primaryColor, fontWeight: 600 }}>Outline Style</Typography>
                  </Box>
                </Box>
              </Box>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Typography Tab */}
      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    bgcolor: `${brandKit.primaryColor}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FileText size={24} color={brandKit.primaryColor} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 14, color: 'var(--vm-text-muted)' }}>Heading Font</Typography>
                  <Typography sx={{ fontSize: 24, fontWeight: 700, color: 'var(--vm-text-primary)', fontFamily: brandKit.fontHeading }}>
                    {brandKit.fontHeading}
                  </Typography>
                </Box>
              </Box>
              <Typography sx={{ fontSize: 32, fontWeight: 700, color: 'var(--vm-text-primary)', fontFamily: brandKit.fontHeading, mb: 1 }}>
                Aa Bb Cc
              </Typography>
              <Typography sx={{ fontSize: 14, color: 'var(--vm-text-muted)' }}>
                The quick brown fox jumps over the lazy dog
              </Typography>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    bgcolor: `${brandKit.secondaryColor}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FileText size={24} color={brandKit.secondaryColor} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 14, color: 'var(--vm-text-muted)' }}>Body Font</Typography>
                  <Typography sx={{ fontSize: 24, fontWeight: 700, color: 'var(--vm-text-primary)', fontFamily: brandKit.fontBody }}>
                    {brandKit.fontBody}
                  </Typography>
                </Box>
              </Box>
              <Typography sx={{ fontSize: 32, fontWeight: 700, color: 'var(--vm-text-primary)', fontFamily: brandKit.fontBody, mb: 1 }}>
                Aa Bb Cc
              </Typography>
              <Typography sx={{ fontSize: 14, color: 'var(--vm-text-muted)', fontFamily: brandKit.fontBody }}>
                The quick brown fox jumps over the lazy dog
              </Typography>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Logos Tab */}
      {activeTab === 2 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, p: 4, textAlign: 'center' }}>
              <Typography sx={{ fontSize: 14, color: 'var(--vm-text-muted)', mb: 2 }}>Primary Logo</Typography>
              <Box
                sx={{
                  height: 120,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: '#fff',
                  borderRadius: 2,
                  mb: 2,
                }}
              >
                <Box sx={{ fontSize: 48, fontWeight: 700, color: brandKit.primaryColor }}>
                  {currentBusiness?.name[0]}
                </Box>
              </Box>
              <GradientButton variant="outline" size="sm" fullWidth>
                <Download size={14} />
                Download PNG
              </GradientButton>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, p: 4, textAlign: 'center' }}>
              <Typography sx={{ fontSize: 14, color: 'var(--vm-text-muted)', mb: 2 }}>White Logo</Typography>
              <Box
                sx={{
                  height: 120,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: brandKit.darkColor,
                  borderRadius: 2,
                  mb: 2,
                }}
              >
                <Box sx={{ fontSize: 48, fontWeight: 700, color: '#fff' }}>
                  {currentBusiness?.name[0]}
                </Box>
              </Box>
              <GradientButton variant="outline" size="sm" fullWidth>
                <Download size={14} />
                Download PNG
              </GradientButton>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, p: 4, textAlign: 'center' }}>
              <Typography sx={{ fontSize: 14, color: 'var(--vm-text-muted)', mb: 2 }}>Icon Only</Typography>
              <Box
                sx={{
                  height: 120,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: `${brandKit.primaryColor}20`,
                  borderRadius: 2,
                  mb: 2,
                }}
              >
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: 2,
                    bgcolor: brandKit.primaryColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 32,
                    fontWeight: 700,
                    color: '#fff',
                  }}
                >
                  {currentBusiness?.name[0]}
                </Box>
              </Box>
              <GradientButton variant="outline" size="sm" fullWidth>
                <Download size={14} />
                Download PNG
              </GradientButton>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Social Tab */}
      {activeTab === 3 && (
        <Grid container spacing={3}>
          {brandKit.socialBanners.length > 0 ? (
            brandKit.socialBanners.map((banner) => (
              <Grid size={{ xs: 12, sm: 6 }} key={banner.id}>
                <Card sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, overflow: 'hidden' }}>
                  <Box
                    sx={{
                      height: 160,
                      bgcolor: brandKit.primaryColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography sx={{ fontSize: 24, fontWeight: 700, color: '#fff', textTransform: 'capitalize' }}>
                      {banner.platform}
                    </Typography>
                  </Box>
                  <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'var(--vm-text-primary)', textTransform: 'capitalize' }}>
                      {banner.platform} Banner
                    </Typography>
                    <GradientButton variant="outline" size="sm">
                      <Download size={14} />
                    </GradientButton>
                  </Box>
                </Card>
              </Grid>
            ))
          ) : (
            <Grid size={{ xs: 12 }}>
              <Card sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, p: 6, textAlign: 'center' }}>
                <Image size={48} color="var(--vm-text-muted)" style={{ marginBottom: 16 }} />
                <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 1 }}>
                  No social banners yet
                </Typography>
                <Typography sx={{ fontSize: 14, color: 'var(--vm-text-muted)', mb: 3 }}>
                  Create banners for LinkedIn, Twitter, and other platforms
                </Typography>
                <GradientButton variant="primary" size="md">
                  <Plus size={18} />
                  Create Banner
                </GradientButton>
              </Card>
            </Grid>
          )}
        </Grid>
      )}
      <DomainChat domain="branding kit" placeholder="Ask me to generate a logo or update your brand colors..." />
    </Box>
  );
}
