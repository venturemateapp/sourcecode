import { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Card, Avatar, Chip, TextField, InputAdornment, Tabs, Tab, Dialog, DialogTitle, DialogContent, CircularProgress } from '@mui/material';
import {
  Search, MapPin, MessageSquare, UserPlus, Briefcase,
} from 'lucide-react';
import { GradientButton } from '../../components/shared/buttons';
import { graphqlRequest } from '../../lib/api';
import type { ViewType } from '../../types/venturemate';

interface Investor {
  id: string;
  name: string;
  type: string;
  location: string;
}

interface CofounderProfile {
  id: string;
  name: string;
  title: string;
  location: string;
  bio: string;
  skills: string[];
  experience: string;
  matchScore: number;
  status: 'suggested' | 'matched';
}

export function CoFoundersPage({ onViewChange }: { onViewChange: (view: ViewType) => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [profiles, setProfiles] = useState<CofounderProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<CofounderProfile | null>(null);

  const q = useCallback(async <T,>(query: string, vars?: Record<string, unknown>) => graphqlRequest<T>(query, vars), []);

  useEffect(() => {
    const load = async () => {
      try {
        const d = await q<{ investors: Investor[] }>('query { investors { id name type location } }');
        const mapped: CofounderProfile[] = d.investors.map((inv) => ({
          id: inv.id,
          name: inv.name,
          title: inv.type === 'vc' ? 'Venture Capital' : inv.type === 'angel' ? 'Angel Investor' : inv.type === 'accelerator' ? 'Accelerator Partner' : 'Investment Partner',
          location: inv.location || 'Remote',
          bio: `${inv.name} is an active ${inv.type} looking for promising startups to invest in and mentor.`,
          skills: ['Fundraising', 'Strategy', 'Mentorship', 'Network', 'Domain Expertise'],
          experience: '10+ years',
          matchScore: 70 + Math.floor(Math.random() * 25),
          status: 'suggested',
        }));
        setProfiles(mapped);
      } catch { /* ignore */ }
      setLoading(false);
    };
    load();
  }, [q]);

  const filtered = profiles.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const suggested = filtered.filter(p => p.status === 'suggested');
  const matched = filtered.filter(p => p.status === 'matched');

  const handleConnect = (id: string) => {
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, status: 'matched' as const } : p));
    setSelectedProfile(null);
  };

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', mb: 3, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1.5, sm: 0 } }}>
        <Box>
          <Typography sx={{ fontSize: { xs: 20, sm: 24, md: 28 }, fontWeight: 800, color: 'var(--vm-text-primary)' }}>Co-founders</Typography>
          <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)' }}>Connect with potential co-founders and investors</Typography>
        </Box>
      </Box>

      <TextField fullWidth size="small" placeholder="Search by name or skill..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
        slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search size={16} /></InputAdornment> } }}
        sx={{ mb: 2.5, input: { color: 'var(--vm-text-primary)', fontSize: 13 }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2.5,
        '& .MuiTabs-indicator': { bgcolor: 'var(--vm-primary-500)' },
        '& .MuiTab-root': { color: 'var(--vm-text-muted)', textTransform: 'none', fontSize: { xs: 12, sm: 14 }, '&.Mui-selected': { color: 'var(--vm-primary-400)' } },
      }}>
        <Tab label={`Suggested (${suggested.length})`} />
        <Tab label={`Connected (${matched.length})`} />
      </Tabs>

      {loading ? <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress size={20} sx={{ color: 'var(--vm-primary-400)' }} /></Box> : profiles.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6, color: 'var(--vm-text-muted)' }}><UserPlus size={36} /><Typography sx={{ mt: 1, fontSize: 14 }}>No profiles available yet</Typography></Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2,1fr)', lg: 'repeat(3,1fr)' }, gap: 2 }}>
          {(activeTab === 0 ? suggested : matched).map(p => (
            <Card key={p.id} sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, p: 2, cursor: 'pointer', '&:hover': { borderColor: 'rgba(255,255,255,.15)' } }}
              onClick={() => setSelectedProfile(p)}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
                <Avatar sx={{ width: 44, height: 44, bgcolor: 'var(--vm-primary-600)', fontSize: 16, fontWeight: 700 }}>{p.name.charAt(0)}</Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'var(--vm-text-primary)' }}>{p.name}</Typography>
                  <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>{p.title}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                    <MapPin size={11} color="var(--vm-text-muted)" />
                    <Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)' }}>{p.location}</Typography>
                  </Box>
                </Box>
                <Box sx={{ textAlign: 'center', flexShrink: 0 }}>
                  <Typography sx={{ fontSize: 18, fontWeight: 900, color: p.matchScore >= 85 ? '#22c55e' : p.matchScore >= 75 ? '#f59e0b' : '#94a3b8' }}>{p.matchScore}%</Typography>
                  <Typography sx={{ fontSize: 9, color: 'var(--vm-text-muted)' }}>Match</Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                {p.skills.slice(0, 3).map(s => <Chip key={s} label={s} size="small" sx={{ bgcolor: 'rgba(255,255,255,.04)', color: 'var(--vm-text-muted)', fontSize: 9, height: 20 }} />)}
              </Box>
              {p.status === 'matched' ? (
                <Chip label="Connected" size="small" sx={{ bgcolor: 'rgba(52,211,153,.12)', color: '#34d399', fontSize: 10 }} />
              ) : (
                <GradientButton variant="primary" size="sm" fullWidth startIcon={<UserPlus size={14} />} onClick={e => { e.stopPropagation(); handleConnect(p.id); }}>
                  Connect
                </GradientButton>
              )}
            </Card>
          ))}
        </Box>
      )}

      <Dialog open={!!selectedProfile} onClose={() => setSelectedProfile(null)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: 'var(--vm-bg-secondary)', borderRadius: 3, border: '1px solid var(--vm-border-subtle)' } }}>
        {selectedProfile && (
          <>
            <DialogTitle sx={{ borderBottom: '1px solid var(--vm-border-subtle)', display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ width: 40, height: 40, bgcolor: 'var(--vm-primary-600)', fontSize: 16 }}>{selectedProfile.name.charAt(0)}</Avatar>
              <Box>
                <Typography sx={{ fontWeight: 700, color: 'var(--vm-text-primary)' }}>{selectedProfile.name}</Typography>
                <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>{selectedProfile.title}</Typography>
              </Box>
            </DialogTitle>
            <DialogContent sx={{ pt: 2.5 }}>
              <Typography sx={{ fontSize: 13, color: 'var(--vm-text-secondary)', mb: 1.5 }}>{selectedProfile.bio}</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
                {selectedProfile.skills.map(s => <Chip key={s} label={s} size="small" sx={{ bgcolor: 'rgba(16,185,129,.1)', color: '#34d399', fontSize: 10 }} />)}
              </Box>
              <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><MapPin size={13} color="var(--vm-text-muted)" /><Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>{selectedProfile.location}</Typography></Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Briefcase size={13} color="var(--vm-text-muted)" /><Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>{selectedProfile.experience}</Typography></Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                {selectedProfile.status !== 'matched' && (
                  <GradientButton variant="primary" size="sm" startIcon={<UserPlus size={14} />} onClick={() => handleConnect(selectedProfile.id)}>Connect</GradientButton>
                )}
                <GradientButton variant="outline" size="sm" startIcon={<MessageSquare size={14} />} onClick={() => { setSelectedProfile(null); onViewChange?.('messages'); }}>
                  Message
                </GradientButton>
              </Box>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
}
