import { useCallback, useEffect, useState } from 'react';
import {
  Box, Typography, Card, Chip, Tabs, Tab, IconButton, CircularProgress, Button, TextField, Dialog, DialogTitle, DialogContent,
} from '@mui/material';
import { GradientButton } from '../../components/shared/buttons';
import { graphqlRequest } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  Users, TrendingUp, Heart, Calendar, Globe, X, MessageCircle, Share2, LogIn, RefreshCw,
  BarChart3,
} from 'lucide-react';
import type { ViewType } from '../../types/venturemate';

const PLATFORM_META: Record<string, { label: string; color: string }> = {
  instagram: { label: 'Instagram', color: '#E4405F' },
  twitter: { label: 'Twitter', color: '#1DA1F2' },
  facebook: { label: 'Facebook', color: '#1877F2' },
  linkedin: { label: 'LinkedIn', color: '#0A66C2' },
  tiktok: { label: 'TikTok', color: '#000' },
  youtube: { label: 'YouTube', color: '#FF0000' },
  pinterest: { label: 'Pinterest', color: '#E60023' },
  threads: { label: 'Threads', color: '#000' },
  bluesky: { label: 'Bluesky', color: '#0285FF' },
  twitch: { label: 'Twitch', color: '#9146FF' },
};

const POST_TYPES = ['posts', 'reels', 'stories'] as const;

interface MetricoolConnection {
  metricoolUserId: string;
  activeBrandId: string;
}

interface Brand {
  id: string;
  label: string;
  userId: string;
  timezone: string;
}

interface Post {
  id: string;
  text: string;
  date: string;
  impressions?: number;
  engagement?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  mediaUrl?: string;
  permalink?: string;
}

interface ScheduledPost {
  id: string;
  text: string;
  date: string;
  network: string;
  status: string;
}

export function SocialPage({ onViewChange }: { onViewChange?: (v: ViewType) => void }) {
  const { user } = useAuth();

  // Connection state
  const [conn, setConn] = useState<MetricoolConnection | null>(null);
  const [connLoading, setConnLoading] = useState(true);
  const [showConnForm, setShowConnForm] = useState(false);
  const [connToken, setConnToken] = useState('');
  const [connUserId, setConnUserId] = useState('');
  const [connSaving, setConnSaving] = useState(false);

  // Brands
  const [brands, setBrands] = useState<Brand[]>([]);
  const [activeBrandId, setActiveBrandId] = useState<string>('');
  const [brandsLoading, setBrandsLoading] = useState(false);

  // Data
  const [posts, setPosts] = useState<Post[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState('instagram');
  const [postType, setPostType] = useState<string>('posts');
  const [tab, setTab] = useState(0);

  const q = useCallback(async <T,>(query: string, vars?: Record<string, unknown>) => graphqlRequest<T>(query, vars), []);

  // Load connection
  const loadConnection = useCallback(async () => {
    if (!user) return;
    setConnLoading(true);
    try {
      const d = await q<{ metricoolConnection: MetricoolConnection | null }>('query Q($u:ID!){metricoolConnection(userId:$u){metricoolUserId activeBrandId}}', { u: user.id });
      if (d.metricoolConnection?.metricoolUserId) {
        setConn(d.metricoolConnection);
        if (d.metricoolConnection.activeBrandId) setActiveBrandId(d.metricoolConnection.activeBrandId);
      }
    } catch { /* no connection */ }
    setConnLoading(false);
  }, [user, q]);

  useEffect(() => { loadConnection(); }, [loadConnection]);

  // Load brands
  const loadBrands = useCallback(async () => {
    if (!user || !conn) return;
    setBrandsLoading(true);
    try {
      const d = await q<{ metricoolBrands: Brand[] }>('query Q($u:ID!){metricoolBrands(userId:$u){id label userId timezone}}', { u: user.id });
      setBrands(d.metricoolBrands);
      if (!activeBrandId && d.metricoolBrands.length > 0) {
        setActiveBrandId(d.metricoolBrands[0].id);
      }
    } catch { /* ignore */ }
    setBrandsLoading(false);
  }, [user, conn, q, activeBrandId]);

  useEffect(() => { if (conn) loadBrands(); }, [conn, loadBrands]);

  // Load posts
  const loadPosts = useCallback(async () => {
    if (!user || !activeBrandId || !conn) return;
    setLoading(true);
    try {
      const [postsData, scheduledData] = await Promise.all([
        q<{ metricoolPosts: Post[] }>('query Q($u:ID!,$b:String!,$n:String!,$t:String){metricoolPosts(userId:$u brandId:$b network:$n postType:$t){id text date impressions engagement likes comments shares mediaUrl permalink}}', {
          u: user.id, b: activeBrandId, n: selectedNetwork, t: postType,
        }),
        q<{ metricoolScheduledPosts: ScheduledPost[] }>('query Q($u:ID!,$b:String!){metricoolScheduledPosts(userId:$u brandId:$b){id text date network status}}', {
          u: user.id, b: activeBrandId,
        }),
      ]);
      setPosts(postsData.metricoolPosts);
      setScheduled(scheduledData.metricoolScheduledPosts);
    } catch { /* ignore */ }
    setLoading(false);
  }, [user, activeBrandId, conn, q, selectedNetwork, postType]);

  useEffect(() => { if (conn && activeBrandId) loadPosts(); }, [conn, activeBrandId, loadPosts]);

  const saveConnection = async () => {
    if (!user || !connToken || !connUserId) return;
    setConnSaving(true);
    try {
      const d = await q<{ saveMetricoolConnection: MetricoolConnection }>('mutation M($u:ID!,$t:String!,$i:String!){saveMetricoolConnection(userId:$u metricoolUserToken:$t metricoolUserId:$i){metricoolUserId activeBrandId}}', {
        u: user.id, t: connToken, i: connUserId,
      });
      setConn(d.saveMetricoolConnection);
      setShowConnForm(false);
      setConnToken('');
      setConnUserId('');
    } catch { /* ignore */ }
    setConnSaving(false);
  };

  const selectBrand = async (brandId: string) => {
    if (!user) return;
    setActiveBrandId(brandId);
    await q('mutation M($u:ID!,$b:String!){setActiveMetricoolBrand(userId:$u brandId:$b)}', { u: user.id, b: brandId });
  };

  // Aggregate account-level stats
  const totalPosts = posts.length;
  const totalEngagement = posts.reduce((s, p) => s + (p.engagement || 0), 0);
  const totalImpressions = posts.reduce((s, p) => s + (p.impressions || 0), 0);

  if (connLoading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={20} sx={{ color: 'var(--vm-primary-400)' }} /></Box>;

  // Not connected - show connect screen
  if (!conn) {
    return (
      <Box sx={{ p: { xs: 2, sm: 4 }, maxWidth: 480, mx: 'auto', mt: { xs: 2, sm: 6 } }}>
        <Card sx={{ p: { xs: 2, sm: 3 }, bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, textAlign: 'center' }}>
          <Box sx={{ width: 56, height: 56, borderRadius: 2, bgcolor: 'rgba(245,158,11,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
            <Globe size={28} color="#f59e0b" />
          </Box>
          <Typography sx={{ fontSize: 18, fontWeight: 800, color: 'var(--vm-text-primary)', mb: 0.5 }}>Connect Metricool</Typography>
          <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)', mb: 3 }}>
            Link your Metricool account to view analytics, manage posts, and track engagement across all your social networks.
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, textAlign: 'left', mb: 3, px: { xs: 0, sm: 2 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 2, bgcolor: 'rgba(16,185,129,.08)' }}>
              <BarChart3 size={16} color="#10b981" />
              <Typography sx={{ fontSize: 12, color: 'var(--vm-text-secondary)' }}>Real-time analytics across all platforms</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 2, bgcolor: 'rgba(16,185,129,.08)' }}>
              <Calendar size={16} color="#10b981" />
              <Typography sx={{ fontSize: 12, color: 'var(--vm-text-secondary)' }}>Schedule and manage posts</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 2, bgcolor: 'rgba(16,185,129,.08)' }}>
              <Users size={16} color="#10b981" />
              <Typography sx={{ fontSize: 12, color: 'var(--vm-text-secondary)' }}>Track followers and engagement</Typography>
            </Box>
          </Box>
          <GradientButton variant="primary" size="md" onClick={() => setShowConnForm(true)} startIcon={<LogIn size={16} />}>
            Connect Metricool
          </GradientButton>
          <Button size="small" sx={{ mt: 1.5, fontSize: 11, color: 'var(--vm-text-muted)', textTransform: 'none' }}
            onClick={() => onViewChange?.('settings')}>
            Need a Metricool account? Get one at metricool.com
          </Button>
        </Card>

        <Dialog open={showConnForm} onClose={() => setShowConnForm(false)} maxWidth="sm" fullWidth
          PaperProps={{ sx: { bgcolor: 'var(--vm-bg-secondary)', borderRadius: 3, border: '1px solid var(--vm-border-subtle)' } }}>
          <DialogTitle sx={{ borderBottom: '1px solid var(--vm-border-subtle)', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <LogIn size={20} color="var(--vm-primary-400)" />
            <Typography sx={{ fontWeight: 700 }}>Connect Metricool</Typography>
            <IconButton size="small" onClick={() => setShowConnForm(false)} sx={{ ml: 'auto', color: 'var(--vm-text-muted)' }}><X size={18} /></IconButton>
          </DialogTitle>
          <DialogContent sx={{ pt: 3.5 }}>
            <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)', mb: 2 }}>
              Go to Metricool → Settings → API to find your User Token and User ID. Requires an Advanced plan.
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField size="small" label="Metricool User Token" value={connToken} onChange={e => setConnToken(e.target.value)}
                sx={{ input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
              <TextField size="small" label="Metricool User ID" value={connUserId} onChange={e => setConnUserId(e.target.value)}
                sx={{ input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
            </Box>
          </DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, p: 2.5, pt: 0 }}>
            <GradientButton variant="ghost" size="sm" onClick={() => setShowConnForm(false)}>Cancel</GradientButton>
            <GradientButton variant="primary" size="sm" disabled={connSaving || !connToken || !connUserId} onClick={saveConnection}>
              {connSaving ? <CircularProgress size={14} /> : 'Connect'}
            </GradientButton>
          </Box>
        </Dialog>
      </Box>
    );
  }

  const meta = PLATFORM_META[selectedNetwork] || { label: selectedNetwork, color: 'var(--vm-text-primary)' };

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', mb: 2.5, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1.5, sm: 0 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'rgba(245,158,11,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Globe size={20} color="#f59e0b" />
          </Box>
          <Box>
            <Typography sx={{ fontSize: { xs: 18, sm: 22 }, fontWeight: 800, color: 'var(--vm-text-primary)' }}>Social Media</Typography>
            <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>Powered by Metricool</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <GradientButton variant="ghost" size="sm" startIcon={<RefreshCw size={14} />} onClick={loadPosts}>Refresh</GradientButton>
        </Box>
      </Box>

      {/* Brand selector */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2.5, overflowX: 'auto', pb: 0.5 }}>
        {brandsLoading ? <CircularProgress size={16} sx={{ color: 'var(--vm-primary-400)' }} /> : brands.map(b => (
          <Chip key={b.id} label={b.label} onClick={() => selectBrand(b.id)}
            sx={{ bgcolor: b.id === activeBrandId ? 'rgba(16,185,129,.15)' : 'rgba(255,255,255,.04)', color: b.id === activeBrandId ? '#10b981' : 'var(--vm-text-secondary)', fontWeight: b.id === activeBrandId ? 700 : 500, cursor: 'pointer', '&:hover': { bgcolor: 'rgba(16,185,129,.1)' } }} />
        ))}
      </Box>

      {/* Network selector */}
      <Box sx={{ display: 'flex', gap: 0.75, mb: 2.5, overflowX: 'auto', pb: 0.5 }}>
        {Object.entries(PLATFORM_META).map(([key, m]) => (
          <Chip key={key} label={m.label} onClick={() => { setSelectedNetwork(key); setPostType('posts'); }}
            sx={{ bgcolor: key === selectedNetwork ? `${m.color}20` : 'rgba(255,255,255,.04)', color: key === selectedNetwork ? m.color : 'var(--vm-text-secondary)', fontWeight: key === selectedNetwork ? 700 : 500, cursor: 'pointer', '&:hover': { bgcolor: `${m.color}15` } }} />
        ))}
      </Box>

      {/* Stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', sm: 'repeat(4,1fr)' }, gap: { xs: 1.5, sm: 2 }, mb: 2.5 }}>
        {[
          { icon: BarChart3, label: 'Posts', value: totalPosts, color: meta.color },
          { icon: Heart, label: 'Engagement', value: totalEngagement.toLocaleString(), color: '#e91e63' },
          { icon: TrendingUp, label: 'Impressions', value: totalImpressions.toLocaleString(), color: '#22c55e' },
          { icon: Calendar, label: 'Scheduled', value: scheduled.length, color: '#f59e0b' },
        ].map(s => (
          <Card key={s.label} sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 2.5 }}>
            <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 0.75 }}>
              <s.icon size={16} color={s.color} />
            </Box>
            <Typography sx={{ fontSize: { xs: 18, sm: 22 }, fontWeight: 800, color: 'var(--vm-text-primary)', lineHeight: 1.1 }}>{s.value}</Typography>
            <Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)', mt: 0.25 }}>{s.label}</Typography>
          </Card>
        ))}
      </Box>

      {/* Posts type selector */}
      <Box sx={{ display: 'flex', gap: 0.75, mb: 2 }}>
        {POST_TYPES.map(pt => (
          <Chip key={pt} label={pt.charAt(0).toUpperCase() + pt.slice(1)} onClick={() => setPostType(pt)}
            sx={{ bgcolor: pt === postType ? `${meta.color}20` : 'rgba(255,255,255,.04)', color: pt === postType ? meta.color : 'var(--vm-text-secondary)', fontWeight: pt === postType ? 700 : 500, cursor: 'pointer', textTransform: 'capitalize' }} />
        ))}
      </Box>

      {/* Posts grid */}
      {loading ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 4, justifyContent: 'center' }}>
          <CircularProgress size={16} sx={{ color: 'var(--vm-primary-400)' }} />
          <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)' }}>Loading {meta.label} {postType}...</Typography>
        </Box>
      ) : posts.length === 0 && scheduled.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Globe size={36} color="var(--vm-text-muted)" />
          <Typography sx={{ mt: 1, color: 'var(--vm-text-muted)', fontSize: 14 }}>No {postType} found for {meta.label}. Try a different network or refresh.</Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Tab: Posts / Scheduled */}
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 1, minHeight: 36,
            '& .MuiTab-root': { fontSize: 13, minHeight: 36, py: 0.5, textTransform: 'none', color: 'var(--vm-text-muted)', '&.Mui-selected': { color: 'var(--vm-primary-400)' } },
            '& .MuiTabs-indicator': { bgcolor: 'var(--vm-primary-500)' },
          }}>
            <Tab label={`${postType.charAt(0).toUpperCase() + postType.slice(1)} (${posts.length})`} />
            <Tab label={`Scheduled (${scheduled.length})`} />
          </Tabs>

          {/* Posts */}
          {tab === 0 && posts.map(p => (
            <Card key={p.id} sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 2.5, p: { xs: 1.5, sm: 2 } }}>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                {p.mediaUrl && (
                  <Box component="img" src={p.mediaUrl} sx={{ width: 72, height: 72, borderRadius: 1.5, objectFit: 'cover', flexShrink: 0 }} />
                )}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  {p.permalink ? (
                    <a href={p.permalink} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                      <Typography sx={{ fontSize: 13, color: 'var(--vm-text-primary)', mb: 1, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.text}</Typography>
                    </a>
                  ) : (
                    <Typography sx={{ fontSize: 13, color: 'var(--vm-text-primary)', mb: 1, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.text}</Typography>
                  )}
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    {p.likes !== undefined && <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Heart size={12} color="var(--vm-text-muted)" /><Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)' }}>{p.likes}</Typography></Box>}
                    {p.comments !== undefined && <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><MessageCircle size={12} color="var(--vm-text-muted)" /><Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)' }}>{p.comments}</Typography></Box>}
                    {p.shares !== undefined && <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Share2 size={12} color="var(--vm-text-muted)" /><Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)' }}>{p.shares}</Typography></Box>}
                    <Typography sx={{ fontSize: 10, color: 'var(--vm-text-muted)', ml: 'auto' }}>{new Date(p.date).toLocaleDateString('en-GB')}</Typography>
                  </Box>
                </Box>
              </Box>
            </Card>
          ))}

          {/* Scheduled */}
          {tab === 1 && scheduled.map(sp => {
            const pm = PLATFORM_META[sp.network];
            return (
              <Card key={sp.id} sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 2.5, p: { xs: 1.5, sm: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: pm ? `${pm.color}18` : 'rgba(255,255,255,.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Globe size={16} color={pm?.color || 'var(--vm-text-muted)'} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 13, color: 'var(--vm-text-primary)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{sp.text}</Typography>
                    <Box sx={{ display: 'flex', gap: 1.5, mt: 0.25 }}>
                      <Chip label={pm?.label || sp.network} size="small" sx={{ bgcolor: pm ? `${pm.color}15` : 'rgba(255,255,255,.05)', color: pm?.color || 'var(--vm-text-muted)', fontSize: 9, height: 18 }} />
                      <Chip label={sp.status} size="small" sx={{ bgcolor: sp.status === 'scheduled' ? 'rgba(59,130,246,.12)' : 'rgba(34,197,94,.12)', color: sp.status === 'scheduled' ? '#3b82f6' : '#22c55e', fontSize: 9, height: 18 }} />
                    </Box>
                  </Box>
                  <Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)', flexShrink: 0 }}>{new Date(sp.date).toLocaleDateString('en-GB')}</Typography>
                </Box>
              </Card>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
