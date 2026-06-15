import { useState, useRef } from 'react';
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
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
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
  Trash2,
  Edit2,
  Upload,
  Save,
  X,
} from 'lucide-react';
import type { ViewType, BrandKit, SocialBanner } from '../../types/venturemate';
import { GradientButton } from '../../components/shared/buttons';
import { useBusiness } from '../../contexts/BusinessContext';
import { NoBusinessSelected } from '../../components/venturemate/NoBusinessSelected';
import { DomainChat } from '../../components/venturemate/DomainChat';
import { uploadFile } from '../../lib/api';

interface BrandingKitProps {
  onViewChange?: (_view: ViewType) => void;
}

const PLATFORMS = ['linkedin', 'twitter', 'facebook', 'instagram'] as const;

const DEFAULT_BRAND_KIT: BrandKit = {
  logo: '',
  logoWhite: '',
  logoIcon: '',
  primaryColor: '#6366f1',
  secondaryColor: '#8b5cf6',
  accentColor: '#06b6d4',
  darkColor: '#1e293b',
  fontHeading: 'Inter',
  fontBody: 'Inter',
  patterns: [],
  socialBanners: [],
};

export function BrandingKitPage({}: BrandingKitProps) {
  const { selectedBusiness: currentBusiness, updateBusiness, refreshBusiness } = useBusiness();
  const [activeTab, setActiveTab] = useState(0);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<BrandKit>(DEFAULT_BRAND_KIT);

  const [bannerDialogOpen, setBannerDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<SocialBanner | null>(null);
  const [bannerPlatform, setBannerPlatform] = useState<string>('linkedin');
  const [bannerUrl, setBannerUrl] = useState('');

  const primaryFileRef = useRef<HTMLInputElement>(null);
  const whiteFileRef = useRef<HTMLInputElement>(null);
  const iconFileRef = useRef<HTMLInputElement>(null);

  if (!currentBusiness) {
    return <NoBusinessSelected message="Select a business to manage your brand kit." />;
  }

  const brandKit = currentBusiness.brandKit ?? DEFAULT_BRAND_KIT;

  const colors = [
    { key: 'primaryColor' as const, name: 'Primary', description: 'Main brand color', color: editMode ? draft.primaryColor : brandKit.primaryColor },
    { key: 'secondaryColor' as const, name: 'Secondary', description: 'Supporting color', color: editMode ? draft.secondaryColor : brandKit.secondaryColor },
    { key: 'accentColor' as const, name: 'Accent', description: 'Highlights & CTAs', color: editMode ? draft.accentColor : brandKit.accentColor },
    { key: 'darkColor' as const, name: 'Dark', description: 'Text & backgrounds', color: editMode ? draft.darkColor : brandKit.darkColor },
  ];

  const handleCopyColor = (color: string) => {
    navigator.clipboard.writeText(color);
    setCopiedColor(color);
    setTimeout(() => setCopiedColor(null), 2000);
  };

  const handleEdit = () => {
    setDraft({ ...brandKit });
    setEditMode(true);
  };

  const handleCancel = () => {
    setEditMode(false);
    setDraft(DEFAULT_BRAND_KIT);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const success = await updateBusiness(currentBusiness.id, { brandKit: draft });
      if (success) {
        setEditMode(false);
        await refreshBusiness();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleColorChange = (key: keyof BrandKit, value: string) => {
    setDraft(prev => ({ ...prev, [key]: value }));
  };

  const handleLogoUpload = async (file: File, key: 'logo' | 'logoWhite' | 'logoIcon') => {
    try {
      const result = await uploadFile(file, currentBusiness.id, 'brand-logos', key);
      setDraft(prev => ({ ...prev, [key]: result.document.url }));
    } catch (err) {
      console.error('Logo upload failed:', err);
    }
  };

  const handleOpenBannerDialog = (banner?: SocialBanner) => {
    if (banner) {
      setEditingBanner(banner);
      setBannerPlatform(banner.platform);
      setBannerUrl(banner.url);
    } else {
      setEditingBanner(null);
      setBannerPlatform('linkedin');
      setBannerUrl('');
    }
    setBannerDialogOpen(true);
  };

  const handleSaveBanner = () => {
    if (!bannerPlatform || !bannerUrl) return;
    const banner: SocialBanner = {
      id: editingBanner?.id || `sb_${Date.now()}`,
      platform: bannerPlatform as SocialBanner['platform'],
      url: bannerUrl,
    };
    setDraft(prev => ({
      ...prev,
      socialBanners: editingBanner
        ? prev.socialBanners.map(b => b.id === editingBanner.id ? banner : b)
        : [...prev.socialBanners, banner],
    }));
    setBannerDialogOpen(false);
    setEditingBanner(null);
  };

  const handleDeleteBanner = (id: string) => {
    setDraft(prev => ({
      ...prev,
      socialBanners: prev.socialBanners.filter(b => b.id !== id),
    }));
  };

  const current = editMode ? draft : brandKit;

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
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
              label={currentBusiness.name}
              sx={{
                bgcolor: `${currentBusiness.brandKit.primaryColor}20`,
                color: currentBusiness.brandKit.primaryColor,
                fontWeight: 600,
              }}
            />
          </Box>
          <Typography sx={{ fontSize: 15, color: 'var(--vm-text-muted)' }}>
            Create and manage your brand assets
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {editMode ? (
            <>
              <Button
                variant="outlined"
                size="small"
                onClick={handleCancel}
                startIcon={<X size={16} />}
                sx={{ color: 'var(--vm-text-muted)', borderColor: 'var(--vm-border-primary)' }}
              >
                Cancel
              </Button>
              <GradientButton
                variant="primary"
                size="sm"
                onClick={handleSave}
                loading={saving}
                startIcon={<Save size={16} />}
              >
                Save Changes
              </GradientButton>
            </>
          ) : (
            <>
              <GradientButton variant="outline" size="sm" startIcon={<Edit2 size={16} />} onClick={handleEdit}>
                Edit Kit
              </GradientButton>
              <GradientButton variant="primary" size="sm">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Download size={18} />
                  Export Kit
                </Box>
              </GradientButton>
            </>
          )}
        </Box>
      </Box>

      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          mb: 3,
          '& .MuiTabs-indicator': { bgcolor: current.primaryColor },
          '& .MuiTab-root': {
            color: 'var(--vm-text-muted)',
            textTransform: 'none',
            fontSize: { xs: '0.75rem', sm: '0.875rem' },
            minWidth: { xs: 'auto', sm: 90 },
            '&.Mui-selected': { color: current.primaryColor },
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
          {colors.map((item) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={item.key}>
              <Card
                sx={{
                  bgcolor: 'var(--vm-bg-secondary)',
                  border: '1px solid var(--vm-border-subtle)',
                  borderRadius: 3,
                  overflow: 'hidden',
                  transition: 'all 0.2s',
                  '&:hover': { transform: 'translateY(-4px)', borderColor: item.color },
                }}
              >
                <Box
                  sx={{
                    height: 120,
                    bgcolor: item.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}
                >
                  {editMode && (
                    <Box
                      component="label"
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'rgba(0,0,0,0.3)',
                        cursor: 'pointer',
                        opacity: 0,
                        transition: 'opacity 0.2s',
                        '&:hover': { opacity: 1 },
                      }}
                    >
                      <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>Change Color</Typography>
                      <input
                        type="color"
                        value={item.color}
                        onChange={(e) => handleColorChange(item.key, e.target.value)}
                        style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                      />
                    </Box>
                  )}
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
                    {!editMode && (
                      <Tooltip title="Copy to clipboard">
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleCopyColor(item.color); }}>
                          <Copy size={14} color="var(--vm-text-muted)" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </Box>
              </Card>
            </Grid>
          ))}

          <Grid size={{ xs: 12 }}>
            <Card sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, p: 3 }}>
              <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 2 }}>
                Color Combinations
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: { xs: 1, sm: 2 }, flexDirection: { xs: 'column', sm: 'row' } }}>
                  <Box sx={{ flex: 1, p: { xs: 2, sm: 3 }, bgcolor: current.primaryColor, borderRadius: 2, textAlign: 'center' }}>
                    <Typography sx={{ color: '#fff', fontWeight: 600 }}>Primary on White</Typography>
                  </Box>
                  <Box sx={{ flex: 1, p: { xs: 2, sm: 3 }, bgcolor: current.darkColor, borderRadius: 2, textAlign: 'center' }}>
                    <Typography sx={{ color: current.accentColor, fontWeight: 600 }}>Accent on Dark</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: { xs: 1, sm: 2 }, flexDirection: { xs: 'column', sm: 'row' } }}>
                  <Box sx={{ flex: 1, p: { xs: 2, sm: 3 }, bgcolor: current.secondaryColor, borderRadius: 2, textAlign: 'center' }}>
                    <Typography sx={{ color: '#fff', fontWeight: 600 }}>Secondary Background</Typography>
                  </Box>
                  <Box sx={{ flex: 1, p: { xs: 2, sm: 3 }, bgcolor: `${current.primaryColor}20`, borderRadius: 2, textAlign: 'center', border: `2px solid ${current.primaryColor}` }}>
                    <Typography sx={{ color: current.primaryColor, fontWeight: 600 }}>Outline Style</Typography>
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
                    bgcolor: `${current.primaryColor}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FileText size={24} color={current.primaryColor} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: 14, color: 'var(--vm-text-muted)' }}>Heading Font</Typography>
                  {editMode ? (
                    <TextField
                      size="small"
                      value={draft.fontHeading}
                      onChange={(e) => setDraft(prev => ({ ...prev, fontHeading: e.target.value }))}
                      sx={{
                        mt: 0.5,
                        '& .MuiInputBase-root': {
                          bgcolor: 'var(--vm-bg-primary)',
                          color: 'var(--vm-text-primary)',
                          fontSize: 20,
                          fontWeight: 700,
                        },
                      }}
                    />
                  ) : (
                    <Typography sx={{ fontSize: 24, fontWeight: 700, color: 'var(--vm-text-primary)', fontFamily: current.fontHeading }}>
                      {current.fontHeading}
                    </Typography>
                  )}
                </Box>
              </Box>
              <Typography sx={{ fontSize: 32, fontWeight: 700, color: 'var(--vm-text-primary)', fontFamily: current.fontHeading, mb: 1 }}>
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
                    bgcolor: `${current.secondaryColor}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FileText size={24} color={current.secondaryColor} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: 14, color: 'var(--vm-text-muted)' }}>Body Font</Typography>
                  {editMode ? (
                    <TextField
                      size="small"
                      value={draft.fontBody}
                      onChange={(e) => setDraft(prev => ({ ...prev, fontBody: e.target.value }))}
                      sx={{
                        mt: 0.5,
                        '& .MuiInputBase-root': {
                          bgcolor: 'var(--vm-bg-primary)',
                          color: 'var(--vm-text-primary)',
                          fontSize: 20,
                          fontWeight: 700,
                        },
                      }}
                    />
                  ) : (
                    <Typography sx={{ fontSize: 24, fontWeight: 700, color: 'var(--vm-text-primary)', fontFamily: current.fontBody }}>
                      {current.fontBody}
                    </Typography>
                  )}
                </Box>
              </Box>
              <Typography sx={{ fontSize: 32, fontWeight: 700, color: 'var(--vm-text-primary)', fontFamily: current.fontBody, mb: 1 }}>
                Aa Bb Cc
              </Typography>
              <Typography sx={{ fontSize: 14, color: 'var(--vm-text-muted)', fontFamily: current.fontBody }}>
                The quick brown fox jumps over the lazy dog
              </Typography>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Logos Tab */}
      {activeTab === 2 && (
        <Grid container spacing={3}>
          {([
            { key: 'logo' as const, label: 'Primary Logo', bg: '#fff', color: current.primaryColor, fileRef: primaryFileRef },
            { key: 'logoWhite' as const, label: 'White Logo', bg: current.darkColor, color: '#fff', fileRef: whiteFileRef },
            { key: 'logoIcon' as const, label: 'Icon Only', bg: `${current.primaryColor}20`, color: current.primaryColor, fileRef: iconFileRef },
          ]).map((item) => (
            <Grid size={{ xs: 12, md: 4 }} key={item.key}>
              <Card sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, p: 4, textAlign: 'center' }}>
                <Typography sx={{ fontSize: 14, color: 'var(--vm-text-muted)', mb: 2 }}>{item.label}</Typography>
                <Box
                  sx={{
                    height: 120,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: item.bg,
                    borderRadius: 2,
                    mb: 2,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {current[item.key] ? (
                    <Box
                      component="img"
                      src={current[item.key]}
                      alt={item.label}
                      sx={{ maxWidth: '80%', maxHeight: 80, objectFit: 'contain' }}
                    />
                  ) : (
                    <Box sx={{ fontSize: 48, fontWeight: 700, color: item.color }}>
                      {currentBusiness.name[0]}
                    </Box>
                  )}
                </Box>
                <input
                  ref={item.fileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleLogoUpload(file, item.key);
                  }}
                />
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {editMode && (
                    <>
                      <GradientButton
                        variant="outline"
                        size="sm"
                        fullWidth
                        startIcon={<Upload size={14} />}
                        onClick={() => item.fileRef.current?.click()}
                      >
                        Upload
                      </GradientButton>
                      {current[item.key] && (
                        <GradientButton
                          variant="outline"
                          size="sm"
                          onClick={() => setDraft(prev => ({ ...prev, [item.key]: '' }))}
                          sx={{ minWidth: 40, px: 1, borderColor: '#ef4444', color: '#ef4444' }}
                        >
                          <Trash2 size={14} />
                        </GradientButton>
                      )}
                    </>
                  )}
                  {current[item.key] && !editMode && (
                    <GradientButton variant="outline" size="sm" fullWidth startIcon={<Download size={14} />}>
                      Download PNG
                    </GradientButton>
                  )}
                  {!current[item.key] && !editMode && (
                    <GradientButton variant="outline" size="sm" fullWidth startIcon={<Download size={14} />}>
                      Download PNG
                    </GradientButton>
                  )}
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Social Tab */}
      {activeTab === 3 && (
        <Grid container spacing={3}>
          {editMode && (
            <Grid size={{ xs: 12 }}>
              <GradientButton variant="primary" size="md" onClick={() => handleOpenBannerDialog()} startIcon={<Plus size={18} />}>
                Add Banner
              </GradientButton>
            </Grid>
          )}
          {current.socialBanners.length > 0 ? (
            current.socialBanners.map((banner) => (
              <Grid size={{ xs: 12, sm: 6 }} key={banner.id}>
                <Card sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, overflow: 'hidden' }}>
                  <Box
                    sx={{
                      height: 160,
                      bgcolor: current.primaryColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                    }}
                  >
                    <Typography sx={{ fontSize: 24, fontWeight: 700, color: '#fff', textTransform: 'capitalize' }}>
                      {banner.platform}
                    </Typography>
                    {editMode && (
                      <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 0.5 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenBannerDialog(banner)}
                          sx={{ bgcolor: 'rgba(0,0,0,0.3)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,0.5)' } }}
                        >
                          <Edit2 size={14} />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteBanner(banner.id)}
                          sx={{ bgcolor: 'rgba(0,0,0,0.3)', color: '#fff', '&:hover': { bgcolor: 'rgba(255,0,0,0.5)' } }}
                        >
                          <Trash2 size={14} />
                        </IconButton>
                      </Box>
                    )}
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
                <GradientButton variant="primary" size="md" onClick={() => handleOpenBannerDialog()} startIcon={<Plus size={18} />}>
                  Create Banner
                </GradientButton>
              </Card>
            </Grid>
          )}
        </Grid>
      )}

      {/* Banner Dialog */}
      <Dialog open={bannerDialogOpen} onClose={() => setBannerDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingBanner ? 'Edit Banner' : 'Add Banner'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Platform</InputLabel>
              <Select
                value={bannerPlatform}
                label="Platform"
                onChange={(e) => setBannerPlatform(e.target.value)}
              >
                {PLATFORMS.map(p => (
                  <MenuItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Banner URL"
              size="small"
              value={bannerUrl}
              onChange={(e) => setBannerUrl(e.target.value)}
              placeholder="https://example.com/banner.png"
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBannerDialogOpen(false)} sx={{ color: 'var(--vm-text-muted)' }}>Cancel</Button>
          <GradientButton variant="primary" size="sm" onClick={handleSaveBanner} disabled={!bannerPlatform || !bannerUrl}>
            {editingBanner ? 'Update' : 'Add'}
          </GradientButton>
        </DialogActions>
      </Dialog>

      <DomainChat domain="branding kit" placeholder="Ask me to generate a logo or update your brand colors..." />
    </Box>
  );
}
