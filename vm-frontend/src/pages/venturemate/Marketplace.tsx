import { useCallback, useEffect, useState } from 'react';
import { Box, Typography, Card, Tabs, Tab, Chip, Avatar, TextField, CircularProgress } from '@mui/material';
import { GradientButton } from '../../components/shared/buttons';
import { Modal } from '../../components/shared/Modal';
import { graphqlRequest } from '../../lib/api';
import {
  Calendar, CheckCircle, Briefcase, Clock, Building2,
} from 'lucide-react';
import { useCurrency } from '../../contexts/CurrencyContext';

interface ServiceProvider {
  id: string;
  name: string;
  title: string;
  category: string;
  bio: string;
  picture: string;
  rateHourly: number;
  skills: string;
  yearsExperience: number;
}

interface Booking {
  id: string;
  providerId: string;
  providerName: string;
  userName: string;
  businessId: string;
  projectTitle: string;
  description: string;
  status: string;
  adminNotes: string;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = [
  { value: 'engineering', label: 'Engineering', color: '#3b82f6' },
  { value: 'design', label: 'Design', color: '#8b5cf6' },
  { value: 'marketing', label: 'Marketing', color: '#f59e0b' },
  { value: 'legal', label: 'Legal', color: '#10b981' },
  { value: 'accounting', label: 'Accounting', color: '#06b6d4' },
  { value: 'consulting', label: 'Consulting', color: '#ec4899' },
  { value: 'hr', label: 'HR', color: '#f97316' },
  { value: 'media', label: 'Media', color: '#ef4444' },
];

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('en-GB');
}

export function MarketplacePage() {
  const { format } = useCurrency();
  const [tab, setTab] = useState(0);
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState('');

  // Booking form
  const [bookingProvider, setBookingProvider] = useState<ServiceProvider | null>(null);
  const [bookingTitle, setBookingTitle] = useState('');
  const [bookingDesc, setBookingDesc] = useState('');
  const [bookingSaving, setBookingSaving] = useState(false);
  const [bookingDone, setBookingDone] = useState(false);

  const q = useCallback(async <T,>(query: string, vars?: Record<string, unknown>) => graphqlRequest<T>(query, vars), []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, b] = await Promise.all([
        q<{ serviceProviders: ServiceProvider[] }>('query{serviceProviders(activeOnly:true){id name title category bio picture rateHourly skills yearsExperience}}'),
        q<{ myBookings: Booking[] }>('query{myBookings{id providerId providerName userName projectTitle description status adminNotes createdAt updatedAt}}'),
      ]);
      setProviders(p.serviceProviders);
      setBookings(b.myBookings);
    } catch { /* ignore */ }
    setLoading(false);
  }, [q]);

  useEffect(() => { load(); }, [load]);

  const createBooking = async () => {
    if (!bookingProvider || !bookingTitle) return;
    setBookingSaving(true);
    try {
      await q('mutation M($p:ID!,$t:String!,$d:String){createBooking(providerId:$p projectTitle:$t description:$d){id}}', {
        p: bookingProvider.id, t: bookingTitle, d: bookingDesc || '',
      });
      setBookingDone(true);
      load();
    } catch { /* ignore */ }
    setBookingSaving(false);
  };

  const filteredProviders = selectedCat ? providers.filter(p => p.category === selectedCat) : providers;

  const statusColor: Record<string, string> = {
    pending: '#f59e0b', approved: '#22c55e', in_progress: '#3b82f6',
    completed: '#10b981', cancelled: '#ef4444', rejected: '#ef4444',
  };

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', mb: 3, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1.5, sm: 0 } }}>
        <Box>
          <Typography sx={{ fontSize: { xs: 20, sm: 24, md: 28 }, fontWeight: 800, color: 'var(--vm-text-primary)' }}>Marketplace</Typography>
          <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)' }}>Find expert providers and manage bookings</Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', sm: 'repeat(4,1fr)' }, gap: { xs: 1.5, sm: 2 }, mb: 3 }}>
        {[
          { icon: Briefcase, label: 'Providers', value: providers.length, color: '#3b82f6' },
          { icon: Calendar, label: 'Total Bookings', value: bookings.length, color: '#22c55e' },
          { icon: CheckCircle, label: 'Completed', value: bookings.filter(b => b.status === 'completed').length, color: '#10b981' },
          { icon: Clock, label: 'Pending', value: bookings.filter(b => b.status === 'pending').length, color: '#f59e0b' },
        ].map(s => (
          <Card key={s.label} sx={{ p: { xs: 1.5, sm: 2.5 }, bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3 }}>
            <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
              <s.icon size={18} color={s.color} />
            </Box>
            <Typography sx={{ fontSize: { xs: 20, sm: 24 }, fontWeight: 800, color: 'var(--vm-text-primary)', lineHeight: 1.1 }}>{s.value}</Typography>
            <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)', mt: 0.25 }}>{s.label}</Typography>
          </Card>
        ))}
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ mb: 2.5,
        '& .MuiTabs-indicator': { bgcolor: 'var(--vm-primary-500)' },
        '& .MuiTab-root': { color: 'var(--vm-text-muted)', textTransform: 'none', fontSize: { xs: 12, sm: 14 }, minWidth: { xs: 'auto', sm: 90 }, '&.Mui-selected': { color: 'var(--vm-primary-400)' } },
      }}>
        <Tab label={`Providers (${providers.length})`} />
        <Tab label={`My Bookings (${bookings.length})`} />
      </Tabs>

      {/* Providers Tab */}
      {tab === 0 && (
        loading ? <Loading /> : providers.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Briefcase size={36} color="var(--vm-text-muted)" />
            <Typography sx={{ mt: 1, color: 'var(--vm-text-muted)', fontSize: 14 }}>No providers available yet</Typography>
          </Box>
        ) : (
          <>
            {/* Category filter */}
            <Box sx={{ display: 'flex', gap: 0.75, mb: 2, overflowX: 'auto', pb: 0.5 }}>
              <Chip label="All" onClick={() => setSelectedCat('')}
                sx={{ bgcolor: !selectedCat ? 'rgba(16,185,129,.15)' : 'rgba(255,255,255,.04)', color: !selectedCat ? '#10b981' : 'var(--vm-text-secondary)', fontWeight: !selectedCat ? 700 : 500, cursor: 'pointer' }} />
              {CATEGORIES.map(c => (
                <Chip key={c.value} label={c.label} onClick={() => setSelectedCat(c.value)}
                  sx={{ bgcolor: selectedCat === c.value ? `${c.color}20` : 'rgba(255,255,255,.04)', color: selectedCat === c.value ? c.color : 'var(--vm-text-secondary)', fontWeight: selectedCat === c.value ? 700 : 500, cursor: 'pointer' }} />
              ))}
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2,1fr)', lg: 'repeat(3,1fr)' }, gap: 2 }}>
              {filteredProviders.map(p => {
                const cat = CATEGORIES.find(c => c.value === p.category);
                return (
                  <Card key={p.id} sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, p: 2, display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
                      <Avatar src={p.picture || ''} sx={{ width: 44, height: 44, bgcolor: cat?.color || '#10b981', fontSize: 16, fontWeight: 700 }}>
                        {p.name.charAt(0)}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'var(--vm-text-primary)' }}>{p.name}</Typography>
                        <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>{p.title}</Typography>
                        <Chip label={p.category} size="small" sx={{ mt: 0.5, bgcolor: cat ? `${cat.color}15` : 'rgba(255,255,255,.05)', color: cat?.color || 'var(--vm-text-muted)', fontSize: 9, fontWeight: 600, height: 20 }} />
                      </Box>
                      <Typography sx={{ fontSize: 16, fontWeight: 800, color: 'var(--vm-primary-400)', flexShrink: 0 }}>{format(p.rateHourly)}<Typography component="span" sx={{ fontSize: 10, color: 'var(--vm-text-muted)' }}>/hr</Typography></Typography>
                    </Box>
                    {p.bio && <Typography sx={{ fontSize: 12, color: 'var(--vm-text-secondary)', mb: 1.5, lineHeight: 1.5, flex: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.bio}</Typography>}
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1.5 }}>
                      {p.skills && JSON.parse(p.skills).map((s: string) => (
                        <Chip key={s} label={s} size="small" sx={{ bgcolor: 'rgba(255,255,255,.04)', color: 'var(--vm-text-muted)', fontSize: 9, height: 20 }} />
                      ))}
                    </Box>
                    <GradientButton variant="primary" size="sm" fullWidth onClick={() => { setBookingProvider(p); setBookingTitle(''); setBookingDesc(''); setBookingDone(false); }}
                      sx={{ mt: 'auto' }}>
                      Book Now
                    </GradientButton>
                  </Card>
                );
              })}
            </Box>
          </>
        )
      )}

      {/* Bookings Tab */}
      {tab === 1 && (
        loading ? <Loading /> : bookings.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Calendar size={36} color="var(--vm-text-muted)" />
            <Typography sx={{ mt: 1, color: 'var(--vm-text-muted)', fontSize: 14 }}>No bookings yet. Browse providers to get started.</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {bookings.map(b => (
              <Card key={b.id} sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 2.5, p: { xs: 1.5, sm: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ width: 40, height: 40, borderRadius: 1.5, bgcolor: 'rgba(16,185,129,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Building2 size={18} color="#10b981" />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'var(--vm-text-primary)' }}>{b.projectTitle}</Typography>
                    <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>{b.providerName} · {formatDate(b.createdAt)}</Typography>
                    {b.description && <Typography sx={{ fontSize: 12, color: 'var(--vm-text-secondary)', mt: 0.25 }}>{b.description}</Typography>}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ px: 1, py: 0.3, borderRadius: 1, fontSize: 10.5, fontWeight: 700, textTransform: 'capitalize', bgcolor: `${statusColor[b.status] || '#94a3b8'}18`, color: statusColor[b.status] || '#94a3b8' }}>
                      {b.status.replace('_', ' ')}
                    </Box>
                  </Box>
                </Box>
              </Card>
            ))}
          </Box>
        )
      )}

      <Modal open={!!bookingProvider && !bookingDone} onClose={() => setBookingProvider(null)} title={`Book ${bookingProvider?.name || ''}`} icon={<Calendar size={20} />}
        actions={<><GradientButton variant="ghost" size="sm" onClick={() => setBookingProvider(null)}>Cancel</GradientButton>
          <GradientButton variant="primary" size="sm" disabled={bookingSaving || !bookingTitle} onClick={createBooking}>
            {bookingSaving ? <CircularProgress size={14} /> : 'Submit Booking'}
          </GradientButton></>}>
        {bookingProvider && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5, p: 1.5, borderRadius: 2, bgcolor: 'var(--vm-bg-tertiary)' }}>
            <Avatar src={bookingProvider.picture || ''} sx={{ width: 40, height: 40 }}>{bookingProvider.name.charAt(0)}</Avatar>
            <Box>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'var(--vm-text-primary)' }}>{bookingProvider.name}</Typography>
              <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>{bookingProvider.title} · {format(bookingProvider.rateHourly)}/hr</Typography>
            </Box>
          </Box>
        )}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField size="small" label="Project Title" value={bookingTitle} onChange={e => setBookingTitle(e.target.value)}
            sx={{ input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
          <TextField size="small" label="Description" multiline rows={3} value={bookingDesc} onChange={e => setBookingDesc(e.target.value)}
            sx={{ textarea: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
        </Box>
      </Modal>

      <Modal open={bookingDone} onClose={() => { setBookingDone(false); setBookingProvider(null); }} title="" maxWidth="sm">
        <Box sx={{ textAlign: 'center', py: 2 }}>
          <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: 'rgba(16,185,129,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
            <CheckCircle size={32} color="#10b981" />
          </Box>
          <Typography sx={{ fontSize: 20, fontWeight: 700, color: 'var(--vm-text-primary)', mb: 0.5 }}>Booking Submitted!</Typography>
          <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)', mb: 2.5, px: 2 }}>
            Your request has been sent to {bookingProvider?.name}. They will respond shortly.
          </Typography>
          <GradientButton variant="primary" size="sm" onClick={() => { setBookingDone(false); setBookingProvider(null); setTab(1); }}>
            View My Bookings
          </GradientButton>
        </Box>
      </Modal>
    </Box>
  );
}

function Loading() {
  return <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 6, justifyContent: 'center' }}><CircularProgress size={18} sx={{ color: 'var(--vm-primary-400)' }} /><Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 13 }}>Loading...</Typography></Box>;
}
