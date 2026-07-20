import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { Person } from '@mui/icons-material';
import {
  Box, Typography, Card, Avatar, TextField, Switch, Chip, Alert, Divider,
  Select, MenuItem, FormControl, InputLabel, InputAdornment, IconButton, Grid,
  Dialog, DialogTitle, DialogContent,
} from '@mui/material';
import { GradientButton } from '../../components/shared/buttons';
import {
  User, Lock, Bell, Palette, CreditCard, Shield,
  Globe, Mail, Eye, EyeOff, CheckCircle, Save, Upload, LogOut, X, Plus,
} from 'lucide-react';
import { graphqlRequest } from '../../lib/api';
import { AIProviderSettingsCard } from '../../components/venturemate/AIProviderSettingsCard';

const AVATAR_COLORS = ['#059669', '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#06b6d4'];

const MY_SETTINGS_QUERY = `
  query MySettings($userId: ID!) {
    mySettings(userId: $userId)
  }
`;

const UPDATE_SETTINGS_MUTATION = `
  mutation UpdateSettings($userId: ID!, $settings: String!) {
    updateSettings(userId: $userId, settings: $settings)
  }
`;

const CHANGE_PASSWORD_MUTATION = `
  mutation ChangePassword($userId: ID!, $currentPassword: String!, $newPassword: String!) {
    changePassword(userId: $userId, currentPassword: $currentPassword, newPassword: $newPassword)
  }
`;

const MY_SUBSCRIPTION_QUERY = `
  query MySubscription($userId: ID!) {
    mySubscription(userId: $userId) {
      id
      status
      plan { name displayName priceMonthly }
      currentPeriodStart
      currentPeriodEnd
      cancelAtPeriodEnd
    }
  }
`;

const defaultNotifications = [
  { id: '1', label: 'New Messages', description: 'When someone sends you a message', email: true, push: true, inApp: true },
  { id: '2', label: 'Investor Matches', description: 'When you get a new investor match', email: true, push: true, inApp: true },
  { id: '3', label: 'Milestone Updates', description: 'When milestones are due or completed', email: true, push: false, inApp: true },
  { id: '4', label: 'Document Shared', description: 'When someone shares a document', email: true, push: false, inApp: true },
  { id: '5', label: 'AI Insights', description: 'Weekly AI-generated insights', email: true, push: false, inApp: false },
  { id: '6', label: 'Marketing Updates', description: 'Product updates and tips', email: false, push: false, inApp: false },
];

interface SettingsData {
  language: string;
  timezone: string;
  dateFormat: string;
  notifications: typeof defaultNotifications;
  apiKey: string;
}

export function SettingsPage() {
  const navigate = useNavigate();
  const { user, logout, updateProfile } = useAuth();
  const { currency: ctxCurrency, setCurrency: setCtxCurrency, format } = useCurrency();
  const [activeTab, setActiveTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarData, setAvatarData] = useState<string | null>(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [settings, setSettings] = useState<SettingsData>({
    language: 'en', timezone: 'UTC', dateFormat: 'DD/MM/YYYY',
    notifications: defaultNotifications,
    apiKey: '',
  });
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const [subscription, setSubscription] = useState<{
    plan: { name: string; displayName: string; priceMonthly: number } | null;
    status: string;
    currentPeriodEnd: string;
  } | null>(null);

  const [profile, setProfile] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    bio: user?.bio || '',
    location: user?.location || '',
    linkedIn: user?.linkedIn || '',
    twitter: user?.twitter || '',
    website: user?.website || '',
  });

  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [newPaymentMethod, setNewPaymentMethod] = useState({ cardNumber: '', expiryDate: '', cvv: '', cardholderName: '' });
  const [addingPayment, setAddingPayment] = useState(false);

  useEffect(() => {
    if (!user) return;
    const userId = user.id;

    Promise.all([
      graphqlRequest<{ mySettings: string }>(MY_SETTINGS_QUERY, { userId }),
      graphqlRequest<{ mySubscription: { id: string; status: string; plan: { name: string; displayName: string; priceMonthly: number }; currentPeriodStart: string; currentPeriodEnd: string; cancelAtPeriodEnd: boolean } | null }>(MY_SUBSCRIPTION_QUERY, { userId }),
    ]).then(([settingsRes, subRes]) => {
      try {
        const parsed = JSON.parse(settingsRes.mySettings);
        setSettings({
          language: parsed.language || 'en',
          timezone: parsed.timezone || 'UTC',
          dateFormat: parsed.dateFormat || 'DD/MM/YYYY',
          notifications: parsed.notifications || defaultNotifications,
          apiKey: parsed.apiKey || '',
        });
        setTwoFactorEnabled(parsed.twoFactorEnabled || false);
      } catch { /* use defaults */ }
      setSettingsLoaded(true);

      if (subRes.mySubscription) {
        setSubscription({
          plan: subRes.mySubscription.plan,
          status: subRes.mySubscription.status,
          currentPeriodEnd: subRes.mySubscription.currentPeriodEnd,
        });
      } else {
        setSubscription(null);
      }
    });
  }, [user]);

  const saveSettingsToBackend = async (updated: SettingsData) => {
    if (!user) return;
    const payload = { ...updated, twoFactorEnabled };
    await graphqlRequest(UPDATE_SETTINGS_MUTATION, {
      userId: user.id,
      settings: JSON.stringify(payload),
    });
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    const result = await updateProfile({
      firstName: profile.firstName,
      lastName: profile.lastName,
      bio: profile.bio,
      location: profile.location,
      linkedIn: profile.linkedIn,
      twitter: profile.twitter,
      website: profile.website,
      ...(avatarData ? { avatar: avatarData } : {}),
    });
    setSaving(false);
    if (result) {
      setAvatarData(null);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleChangePassword = async () => {
    if (!user) return;
    setPasswordError('');
    setPasswordSuccess('');
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }
    setChangingPassword(true);
    try {
      await graphqlRequest(CHANGE_PASSWORD_MUTATION, {
        userId: user.id,
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      setPasswordSuccess('Password updated successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSavePreferences = async () => {
    if (!user) return;
    setSaving(true);
    setCtxCurrency(profile.email ? ctxCurrency : ctxCurrency);
    await updateProfile({ preferredCurrency: ctxCurrency || 'USD' });
    await saveSettingsToBackend(settings);
    setSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleNotificationToggle = (id: string, type: 'email' | 'push' | 'inApp') => {
    setSettings(prev => ({
      ...prev,
      notifications: prev.notifications.map(n =>
        n.id === id ? { ...n, [type]: !n[type] } : n
      ),
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.size > 2 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarData(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleGeneratedAvatar = (color: string) => {
    const initials = ((user?.firstName?.[0] || '') + (user?.lastName?.[0] || '')).toUpperCase();
    const canvas = document.createElement('canvas');
    canvas.width = 200; canvas.height = 200;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(100, 100, 100, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 80px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials || '?', 100, 100);
    setAvatarData(canvas.toDataURL('image/png'));
    setShowAvatarPicker(false);
  };

  const tabs = [
    { label: 'Profile', icon: User },
    { label: 'Security', icon: Lock },
    { label: 'Notifications', icon: Bell },
    { label: 'Preferences', icon: Palette },
    { label: 'Billing', icon: CreditCard },
  ];

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', mb: { xs: 2, sm: 4 }, gap: { xs: 2, sm: 0 } }}>
        <Box>
          <Typography sx={{ fontSize: { xs: 20, sm: 24 }, fontWeight: 700, color: 'var(--vm-text-primary)', mb: 0.5 }}>Settings</Typography>
          <Typography sx={{ fontSize: { xs: 12, sm: 13, md: 14 }, color: 'var(--vm-text-muted)' }}>Configure your account settings and preferences</Typography>
        </Box>
        <GradientButton variant="primary" size="md" onClick={activeTab === 0 ? handleSaveProfile : activeTab === 3 ? handleSavePreferences : handleSaveProfile} disabled={saving} sx={{ width: { xs: '100%', sm: 'auto' } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {saving ? <Box sx={{ width: 16, height: 16, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> : <Save size={18} />}
            Save
          </Box>
        </GradientButton>
      </Box>

      {saveSuccess && (
        <Alert severity="success" icon={<CheckCircle size={20} />} sx={{ mb: 3, bgcolor: 'rgba(34,197,94,0.1)', color: '#22c55e', '& .MuiAlert-icon': { color: '#22c55e' } }}>
          Settings saved successfully!
        </Alert>
      )}

      <AIProviderSettingsCard />

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
        <Card sx={{ width: { xs: '100%', md: 240 }, bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, p: { xs: 1, md: 2 }, flexShrink: 0, display: 'flex', flexDirection: { xs: 'row', md: 'column' }, gap: { xs: 0.5, md: 0.5 }, overflow: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
          {tabs.map((tab, idx) => (
            <Box key={tab.label} onClick={() => setActiveTab(idx)} sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'center', md: 'flex-start' }, gap: { xs: 0, md: 2 }, p: { xs: 1.5, md: 2 }, borderRadius: 2, cursor: 'pointer', mb: 0.5, transition: 'all 0.2s', minWidth: { xs: 48, md: 'auto' }, bgcolor: activeTab === idx ? 'var(--vm-primary-900)' : 'transparent', color: activeTab === idx ? 'var(--vm-primary-400)' : 'var(--vm-text-muted)', '&:hover': { bgcolor: activeTab === idx ? 'var(--vm-primary-900)' : 'var(--vm-bg-tertiary)' } }}>
              <tab.icon size={18} />
              <Typography sx={{ fontSize: 14, fontWeight: 500, display: { xs: 'none', md: 'block' } }}>{tab.label}</Typography>
            </Box>
          ))}
          <Divider sx={{ my: 2, borderColor: 'var(--vm-border-subtle)', display: { xs: 'none', md: 'block' } }} />
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'center', md: 'flex-start' }, gap: { xs: 0, md: 2 }, p: { xs: 1.5, md: 2 }, borderRadius: 2, cursor: 'pointer', minWidth: { xs: 48, md: 'auto' }, color: '#ef4444', '&:hover': { bgcolor: 'rgba(239,68,68,0.1)' } }} onClick={() => { logout(); navigate('/vm/auth/signin'); }}>
            <LogOut size={18} />
            <Typography sx={{ fontSize: 14, fontWeight: 500, display: { xs: 'none', md: 'block' } }}>Sign Out</Typography>
          </Box>
        </Card>

        <Box sx={{ flex: 1, width: '100%', overflow: 'hidden' }}>
          {activeTab === 0 && (
            <Card sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, p: { xs: 2, sm: 3, md: 4 } }}>
              <Typography sx={{ fontSize: 20, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 3 }}>Profile Information</Typography>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center', gap: { xs: 2, md: 3 }, mb: 4 }}>
                <Avatar
                  src={avatarData || user?.avatar || undefined}
                  sx={{
                    width: 100,
                    height: 100,
                    border: '3px solid var(--vm-primary-600)',
                    bgcolor: (avatarData || user?.avatar) ? 'transparent' : 'var(--vm-primary-600)',
                  }}
                >
                  {!(avatarData || user?.avatar) && <Person sx={{ fontSize: 48 }} />}
                </Avatar>
                <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />
                  <GradientButton variant="outline" size="sm" sx={{ mb: 1 }} onClick={() => fileInputRef.current?.click()}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Upload size={14} />Upload Photo</Box>
                  </GradientButton>
                  <GradientButton variant="outline" size="sm" sx={{ mb: 1, ml: { xs: 0, md: 1 }, mt: { xs: 0.5, md: 0 } }} onClick={() => setShowAvatarPicker(true)}>Generated Avatar</GradientButton>
                  <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>JPG, PNG or GIF. Max size 2MB.</Typography>
                </Box>
              </Box>
              <Dialog open={showAvatarPicker} onClose={() => setShowAvatarPicker(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3 } }}>
                <DialogTitle sx={{ color: 'var(--vm-text-primary)', fontSize: 18, fontWeight: 700 }}>Choose Avatar Color</DialogTitle>
                <DialogContent>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center', py: 3 }}>
                    {AVATAR_COLORS.map(color => (
                      <Avatar key={color} onClick={() => handleGeneratedAvatar(color)} sx={{ width: 72, height: 72, bgcolor: color, cursor: 'pointer', fontSize: 24, fontWeight: 700, transition: 'all 0.2s', '&:hover': { transform: 'scale(1.1)' } }}>
                        {((user?.firstName?.[0] || '') + (user?.lastName?.[0] || '')).toUpperCase() || '?'}
                      </Avatar>
                    ))}
                  </Box>
                </DialogContent>
              </Dialog>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="First Name" value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} sx={{ '& .MuiInputBase-root': { bgcolor: 'var(--vm-bg-primary)', color: 'var(--vm-text-primary)' }, '& .MuiInputLabel-root': { color: 'var(--vm-text-muted)' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' } }} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="Last Name" value={profile.lastName} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} sx={{ '& .MuiInputBase-root': { bgcolor: 'var(--vm-bg-primary)', color: 'var(--vm-text-primary)' }, '& .MuiInputLabel-root': { color: 'var(--vm-text-muted)' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' } }} />
                </Grid>
                <Grid size={12}>
                  <TextField fullWidth label="Email" type="email" value={profile.email} disabled InputProps={{ startAdornment: <InputAdornment position="start"><Mail size={18} color="var(--vm-text-muted)" /></InputAdornment> }} sx={{ '& .MuiInputBase-root': { bgcolor: 'var(--vm-bg-primary)', color: 'var(--vm-text-primary)' }, '& .MuiInputLabel-root': { color: 'var(--vm-text-muted)' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' } }} />
                </Grid>
                <Grid size={12}>
                  <TextField fullWidth label="Bio" multiline rows={3} value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} placeholder="Tell us about yourself..." sx={{ '& .MuiInputBase-root': { bgcolor: 'var(--vm-bg-primary)', color: 'var(--vm-text-primary)' }, '& .MuiInputLabel-root': { color: 'var(--vm-text-muted)' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' } }} />
                </Grid>
                <Grid size={12}>
                  <TextField fullWidth label="Location" value={profile.location} onChange={(e) => setProfile({ ...profile, location: e.target.value })} InputProps={{ startAdornment: <InputAdornment position="start"><Globe size={18} color="var(--vm-text-muted)" /></InputAdornment> }} sx={{ '& .MuiInputBase-root': { bgcolor: 'var(--vm-bg-primary)', color: 'var(--vm-text-primary)' }, '& .MuiInputLabel-root': { color: 'var(--vm-text-muted)' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' } }} />
                </Grid>
                <Grid size={12}>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'var(--vm-text-primary)', mt: 2, mb: 2 }}>Social Links</Typography>
                </Grid>
                <Grid size={12}>
                  <TextField fullWidth label="LinkedIn Profile" value={profile.linkedIn} onChange={(e) => setProfile({ ...profile, linkedIn: e.target.value })} InputProps={{ startAdornment: <InputAdornment position="start"><Globe size={18} color="var(--vm-text-muted)" /></InputAdornment> }} sx={{ '& .MuiInputBase-root': { bgcolor: 'var(--vm-bg-primary)', color: 'var(--vm-text-primary)' }, '& .MuiInputLabel-root': { color: 'var(--vm-text-muted)' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' } }} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="Twitter Handle" value={profile.twitter} onChange={(e) => setProfile({ ...profile, twitter: e.target.value })} InputProps={{ startAdornment: <InputAdornment position="start"><Globe size={18} color="var(--vm-text-muted)" /></InputAdornment> }} sx={{ '& .MuiInputBase-root': { bgcolor: 'var(--vm-bg-primary)', color: 'var(--vm-text-primary)' }, '& .MuiInputLabel-root': { color: 'var(--vm-text-muted)' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' } }} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="Website" value={profile.website} onChange={(e) => setProfile({ ...profile, website: e.target.value })} InputProps={{ startAdornment: <InputAdornment position="start"><Globe size={18} color="var(--vm-text-muted)" /></InputAdornment> }} sx={{ '& .MuiInputBase-root': { bgcolor: 'var(--vm-bg-primary)', color: 'var(--vm-text-primary)' }, '& .MuiInputLabel-root': { color: 'var(--vm-text-muted)' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' } }} />
                </Grid>
              </Grid>
            </Card>
          )}

          {activeTab === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Card sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, px: { xs: 0, md: 3 }, p: { xs: 3, md: 4 } }}>
                <Typography sx={{ fontSize: 20, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 3 }}>Change Password</Typography>
                {passwordError && <Alert severity="error" sx={{ mb: 2, bgcolor: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>{passwordError}</Alert>}
                {passwordSuccess && <Alert severity="success" sx={{ mb: 2, bgcolor: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>{passwordSuccess}</Alert>}
                <Grid container spacing={3}>
                  <Grid size={12}>
                    <TextField fullWidth label="Current Password" type={showPassword ? 'text' : 'password'} value={passwordData.currentPassword} onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })} InputProps={{ endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowPassword(!showPassword)} sx={{ color: 'var(--vm-text-muted)' }}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</IconButton></InputAdornment> }} sx={{ '& .MuiInputBase-root': { bgcolor: 'var(--vm-bg-primary)', color: 'var(--vm-text-primary)' }, '& .MuiInputLabel-root': { color: 'var(--vm-text-muted)' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' } }} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth label="New Password" type="password" value={passwordData.newPassword} onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })} sx={{ '& .MuiInputBase-root': { bgcolor: 'var(--vm-bg-primary)', color: 'var(--vm-text-primary)' }, '& .MuiInputLabel-root': { color: 'var(--vm-text-muted)' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' } }} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth label="Confirm Password" type="password" value={passwordData.confirmPassword} onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} sx={{ '& .MuiInputBase-root': { bgcolor: 'var(--vm-bg-primary)', color: 'var(--vm-text-primary)' }, '& .MuiInputLabel-root': { color: 'var(--vm-text-muted)' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' } }} />
                  </Grid>
                </Grid>
                <Box sx={{ mt: 3, textAlign: 'center' }}>
                  <GradientButton variant="primary" size="sm" onClick={handleChangePassword} disabled={!passwordData.currentPassword || !passwordData.newPassword || passwordData.newPassword !== passwordData.confirmPassword || changingPassword}>
                    {changingPassword ? 'Updating...' : 'Update Password'}
                  </GradientButton>
                </Box>
              </Card>

              <Card sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, px: { xs: 0, md: 3 }, p: { xs: 3, md: 4 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: { xs: 2, md: 0 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: 'var(--vm-bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Shield size={24} color="var(--vm-primary-400)" /></Box>
                    <Box>
                      <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'var(--vm-text-primary)' }}>Two-Factor Authentication</Typography>
                      <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)' }}>Add an extra layer of security to your account</Typography>
                    </Box>
                  </Box>
                  <Switch checked={twoFactorEnabled} onChange={async (e) => {
                    const val = e.target.checked;
                    setTwoFactorEnabled(val);
                    if (user && settingsLoaded) {
                      await graphqlRequest(UPDATE_SETTINGS_MUTATION, {
                        userId: user.id,
                        settings: JSON.stringify({ ...settings, twoFactorEnabled: val }),
                      });
                    }
                  }} sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: 'var(--vm-primary-500)' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: 'var(--vm-primary-600)' } }} />
                </Box>
              </Card>
            </Box>
          )}

          {activeTab === 2 && (
            <Card sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, overflow: 'hidden', px: { xs: 0, md: 3 } }}>
              <Box sx={{ p: 3, borderBottom: '1px solid var(--vm-border-subtle)' }}>
                <Typography sx={{ fontSize: 20, fontWeight: 600, color: 'var(--vm-text-primary)' }}>Notification Preferences</Typography>
              </Box>
              <Box>
                <Box sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 2, p: 2, bgcolor: 'var(--vm-bg-tertiary)', borderBottom: '1px solid var(--vm-border-subtle)' }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'var(--vm-text-muted)' }}>NOTIFICATION TYPE</Typography>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'var(--vm-text-muted)', textAlign: 'center' }}>EMAIL</Typography>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'var(--vm-text-muted)', textAlign: 'center' }}>PUSH</Typography>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'var(--vm-text-muted)', textAlign: 'center' }}>IN-APP</Typography>
                </Box>
                {settings.notifications.map((notification) => (
                  <Box key={notification.id} sx={{ display: { xs: 'flex', md: 'grid' }, flexDirection: { xs: 'column', md: 'unset' }, gridTemplateColumns: { xs: undefined, md: '2fr 1fr 1fr 1fr' }, gap: { xs: 1.5, md: 2 }, p: { xs: 2, md: 2 }, alignItems: { xs: 'stretch', md: 'center' }, borderBottom: '1px solid var(--vm-border-subtle)', '&:last-child': { borderBottom: 'none' } }}>
                    <Box>
                      <Typography sx={{ fontSize: 14, fontWeight: 500, color: 'var(--vm-text-primary)' }}>{notification.label}</Typography>
                      <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)', mb: { xs: 1, md: 0 } }}>{notification.description}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                      {(['email', 'push', 'inApp'] as const).map((type) => (
                        <Box key={type} sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, justifyContent: type === 'email' ? 'flex-start' : type === 'inApp' ? 'flex-end' : 'center' }}>
                          <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)', display: { xs: 'inline', md: 'none' }, minWidth: 40 }}>{type.charAt(0).toUpperCase() + type.slice(1)}</Typography>
                          <Switch size="small" checked={notification[type]} onChange={() => handleNotificationToggle(notification.id, type)} sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: 'var(--vm-primary-500)' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: 'var(--vm-primary-600)' } }} />
                        </Box>
                      ))}
                    </Box>
                  </Box>
                ))}
              </Box>
            </Card>
          )}

          {activeTab === 3 && (
            <Card sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, px: { xs: 0, md: 3 }, p: { xs: 3, md: 4 } }}>
              <Typography sx={{ fontSize: 20, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 3 }}>Regional & Language Preferences</Typography>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ color: 'var(--vm-text-muted)' }}>Language</InputLabel>
                    <Select value={settings.language} label="Language" onChange={(e) => setSettings({ ...settings, language: e.target.value })} sx={{ color: 'var(--vm-text-primary)', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' } }}>
                      <MenuItem value="en" sx={{ color: 'var(--vm-text-primary)', textTransform: 'capitalize' }}>English</MenuItem>
                      <MenuItem value="es" sx={{ color: 'var(--vm-text-primary)', textTransform: 'capitalize' }}>Spanish</MenuItem>
                      <MenuItem value="fr" sx={{ color: 'var(--vm-text-primary)', textTransform: 'capitalize' }}>French</MenuItem>
                      <MenuItem value="de" sx={{ color: 'var(--vm-text-primary)', textTransform: 'capitalize' }}>German</MenuItem>
                      <MenuItem value="pt" sx={{ color: 'var(--vm-text-primary)', textTransform: 'capitalize' }}>Portuguese</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ color: 'var(--vm-text-muted)' }}>Timezone</InputLabel>
                    <Select value={settings.timezone} label="Timezone" onChange={(e) => setSettings({ ...settings, timezone: e.target.value })} sx={{ color: 'var(--vm-text-primary)', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' } }}>
                      <MenuItem value="UTC" sx={{ color: 'var(--vm-text-primary)', textTransform: 'capitalize' }}>UTC</MenuItem>
                      <MenuItem value="EST" sx={{ color: 'var(--vm-text-primary)', textTransform: 'capitalize' }}>Eastern Time (EST)</MenuItem>
                      <MenuItem value="PST" sx={{ color: 'var(--vm-text-primary)', textTransform: 'capitalize' }}>Pacific Time (PST)</MenuItem>
                      <MenuItem value="GMT" sx={{ color: 'var(--vm-text-primary)', textTransform: 'capitalize' }}>London (GMT)</MenuItem>
                      <MenuItem value="CET" sx={{ color: 'var(--vm-text-primary)', textTransform: 'capitalize' }}>Central European (CET)</MenuItem>
                      <MenuItem value="JST" sx={{ color: 'var(--vm-text-primary)', textTransform: 'capitalize' }}>Tokyo (JST)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ color: 'var(--vm-text-muted)' }}>Date Format</InputLabel>
                    <Select value={settings.dateFormat} label="Date Format" onChange={(e) => setSettings({ ...settings, dateFormat: e.target.value })} sx={{ color: 'var(--vm-text-primary)', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' } }}>
                      <MenuItem value="DD/MM/YYYY" sx={{ color: 'var(--vm-text-primary)', textTransform: 'capitalize' }}>DD/MM/YYYY</MenuItem>
                      <MenuItem value="MM/DD/YYYY" sx={{ color: 'var(--vm-text-primary)', textTransform: 'capitalize' }}>MM/DD/YYYY</MenuItem>
                      <MenuItem value="YYYY-MM-DD" sx={{ color: 'var(--vm-text-primary)', textTransform: 'capitalize' }}>YYYY-MM-DD</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ color: 'var(--vm-text-muted)' }}>Currency</InputLabel>
                    <Select value={ctxCurrency || 'USD'} label="Currency" onChange={(e) => setCtxCurrency(e.target.value)} sx={{ color: 'var(--vm-text-primary)', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' } }}>
                      <MenuItem value="USD" sx={{ color: 'var(--vm-text-primary)', textTransform: 'capitalize' }}>USD ($)</MenuItem>
                      <MenuItem value="EUR" sx={{ color: 'var(--vm-text-primary)', textTransform: 'capitalize' }}>EUR (€)</MenuItem>
                      <MenuItem value="GBP" sx={{ color: 'var(--vm-text-primary)', textTransform: 'capitalize' }}>GBP (£)</MenuItem>
                      <MenuItem value="GHS" sx={{ color: 'var(--vm-text-primary)', textTransform: 'capitalize' }}>GHS (₵)</MenuItem>
                      <MenuItem value="NGN" sx={{ color: 'var(--vm-text-primary)', textTransform: 'capitalize' }}>NGN (₦)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Card>
          )}

          {activeTab === 4 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Card sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, px: { xs: 0, md: 3 }, p: { xs: 3, md: 4 } }}>
                <Typography sx={{ fontSize: 20, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 3 }}>Current Plan</Typography>
                {subscription ? (
                  <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', md: 'center' }, justifyContent: 'space-between', flexDirection: { xs: 'column', md: 'row' }, gap: { xs: 2, md: 0 }, p: 3, bgcolor: 'var(--vm-bg-tertiary)', borderRadius: 2, border: '2px solid var(--vm-primary-600)' }}>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                        <Typography sx={{ fontSize: 24, fontWeight: 700, color: 'var(--vm-primary-400)' }}>{subscription.plan?.displayName || subscription.plan?.name || 'Free'}</Typography>
                        <Chip size="small" label={subscription.status} sx={{ bgcolor: subscription.status === 'active' ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)', color: subscription.status === 'active' ? '#22c55e' : '#f59e0b', fontSize: 11 }} />
                      </Box>
                      <Typography sx={{ fontSize: 14, color: 'var(--vm-text-muted)' }}>
                        {format(subscription.plan?.priceMonthly || 0)}/month
                        {subscription.currentPeriodEnd ? ` • Renews ${new Date(subscription.currentPeriodEnd).toLocaleDateString('en-GB')}` : ''}
                      </Typography>
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ p: 3, bgcolor: 'var(--vm-bg-tertiary)', borderRadius: 2, textAlign: 'center' }}>
                    <Typography sx={{ fontSize: 14, color: 'var(--vm-text-muted)' }}>Free Plan — No active subscription</Typography>
                  </Box>
                )}
              </Card>

              <Card sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, px: { xs: 0, md: 3 }, p: { xs: 3, md: 4 } }}>
                <Typography sx={{ fontSize: 20, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 3 }}>Payment Methods</Typography>
                <Box sx={{ p: 3, bgcolor: 'var(--vm-bg-tertiary)', borderRadius: 2, border: '1px solid var(--vm-border-subtle)', textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 14, color: 'var(--vm-text-muted)' }}>No payment methods saved yet.</Typography>
                </Box>
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  <GradientButton variant="outline" size="sm" onClick={() => setPaymentModalOpen(true)}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Plus size={14} />Add Payment Method</Box>
                  </GradientButton>
                </Box>
              </Card>

              <Card sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, overflow: 'hidden' }}>
                <Box sx={{ p: 3, borderBottom: '1px solid var(--vm-border-subtle)' }}>
                  <Typography sx={{ fontSize: 20, fontWeight: 600, color: 'var(--vm-text-primary)' }}>Billing History</Typography>
                </Box>
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 14, color: 'var(--vm-text-muted)' }}>No billing history yet.</Typography>
                </Box>
              </Card>
            </Box>
          )}
        </Box>
      </Box>

      <Dialog open={paymentModalOpen} onClose={() => !addingPayment && setPaymentModalOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: 'var(--vm-bg-secondary)', color: 'var(--vm-text-primary)', borderRadius: 3 } }}>
        <DialogTitle sx={{ borderBottom: '1px solid var(--vm-border-subtle)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <CreditCard size={24} color="var(--vm-primary-400)" />
              <Typography sx={{ fontSize: 18, fontWeight: 600 }}>Add Payment Method</Typography>
            </Box>
            <Box onClick={() => !addingPayment && setPaymentModalOpen(false)} sx={{ cursor: addingPayment ? 'not-allowed' : 'pointer', p: 1, borderRadius: 1, opacity: addingPayment ? 0.5 : 1, '&:hover': !addingPayment ? { bgcolor: 'var(--vm-bg-tertiary)' } : undefined }}><X size={20} color="var(--vm-text-muted)" /></Box>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3.5 }}>
          <Grid container spacing={3}>
            <Grid size={12}>
              <TextField fullWidth label="Cardholder Name" value={newPaymentMethod.cardholderName} onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, cardholderName: e.target.value })} sx={{ '& .MuiInputBase-root': { bgcolor: 'var(--vm-bg-primary)', color: 'var(--vm-text-primary)' }, '& .MuiInputLabel-root': { color: 'var(--vm-text-muted)' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' } }} />
            </Grid>
            <Grid size={12}>
              <TextField fullWidth label="Card Number" placeholder="1234 5678 9012 3456" value={newPaymentMethod.cardNumber} onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, cardNumber: e.target.value })} InputProps={{ startAdornment: <InputAdornment position="start"><CreditCard size={18} color="var(--vm-text-muted)" /></InputAdornment> }} sx={{ '& .MuiInputBase-root': { bgcolor: 'var(--vm-bg-primary)', color: 'var(--vm-text-primary)' }, '& .MuiInputLabel-root': { color: 'var(--vm-text-muted)' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' } }} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Expiry Date" placeholder="MM/YY" value={newPaymentMethod.expiryDate} onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, expiryDate: e.target.value })} sx={{ '& .MuiInputBase-root': { bgcolor: 'var(--vm-bg-primary)', color: 'var(--vm-text-primary)' }, '& .MuiInputLabel-root': { color: 'var(--vm-text-muted)' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' } }} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="CVV" placeholder="123" type="password" value={newPaymentMethod.cvv} onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, cvv: e.target.value })} sx={{ '& .MuiInputBase-root': { bgcolor: 'var(--vm-bg-primary)', color: 'var(--vm-text-primary)' }, '& .MuiInputLabel-root': { color: 'var(--vm-text-muted)' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' } }} />
            </Grid>
          </Grid>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 4 }}>
            <GradientButton variant="outline" onClick={() => setPaymentModalOpen(false)} disabled={addingPayment}>Cancel</GradientButton>
            <GradientButton variant="primary" onClick={() => { setAddingPayment(true); setTimeout(() => { setAddingPayment(false); setPaymentModalOpen(false); setNewPaymentMethod({ cardNumber: '', expiryDate: '', cvv: '', cardholderName: '' }); }, 1500); }} disabled={addingPayment || !newPaymentMethod.cardholderName || !newPaymentMethod.cardNumber || !newPaymentMethod.expiryDate || !newPaymentMethod.cvv}>
              {addingPayment ? 'Adding...' : 'Add Card'}
            </GradientButton>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
