import { useCallback, useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Card, Chip, CircularProgress, TextField, Typography, Avatar } from '@mui/material';
import { BarChart3, Bell, BookOpen, Building2, Briefcase, ChevronRight, Globe, LogOut, Mail, Plus, Shield, ThumbsUp, Trash2, Users, UserPlus, XCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { GradientButton } from '../../components/shared/buttons';
import { graphqlRequest } from '../../lib/api';

type AdminView = 'dashboard' | 'users' | 'businesses' | 'plans' | 'investors' | 'providers' | 'bookings' | 'submissions' | 'broadcast';

const NAV_ITEMS: Array<{ key: AdminView; icon: typeof Shield; label: string }> = [
  { key: 'dashboard', icon: BarChart3, label: 'Dashboard' },
  { key: 'users', icon: Users, label: 'Users' },
  { key: 'businesses', icon: Building2, label: 'Businesses' },
  { key: 'plans', icon: BookOpen, label: 'Plans' },
  { key: 'investors', icon: Globe, label: 'Investors' },
  { key: 'providers', icon: Briefcase, label: 'Providers' },
  { key: 'bookings', icon: ThumbsUp, label: 'Bookings' },
  { key: 'submissions', icon: Mail, label: 'Leads' },
  { key: 'broadcast', icon: Bell, label: 'Broadcast' },
];

interface DashboardData {
  totalUsers: number; activeUsers: number; totalBusinesses: number;
  plansBreakdown: Array<{ planName: string; count: number }>;
  recentSignups: Array<{ id: string; firstName: string; surname: string; email: string; status: string; isAdmin: boolean; createdAt: string }>;
}

interface UserRow { id: string; firstName: string; surname: string; email: string; status: string; isAdmin: boolean; createdAt: string; }
interface BizRow { id: string; name: string; industry: string; status: string; ownerName: string; ownerEmail: string; }

export function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<AdminView>('dashboard');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [biz, setBiz] = useState<BizRow[]>([]);
  const [leads, setLeads] = useState<Array<{ id: string; name: string; email: string; message: string; createdAt: string }>>([]);
  const [investors, setInvestors] = useState<Array<{ id: string; name: string; type: string; location: string }>>([]);
  const [, setModal] = useState<{ type: string; data?: Record<string, unknown> } | null>(null);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user?.isAdmin) { navigate('/vm', { replace: true }); }
  }, [user, navigate]);

  const loadData = useCallback(async () => {
    const d = await graphqlRequest<{ adminDashboard: DashboardData }>('query { adminDashboard { totalUsers activeUsers totalBusinesses plansBreakdown { planName count } recentSignups { id firstName surname email status isAdmin createdAt } } }');
    setData(d.adminDashboard); setLoading(false);
  }, []);

  const loadUsers = useCallback(async () => {
    const d = await graphqlRequest<{ adminUsers: UserRow[] }>('query { adminUsers { id firstName surname email status isAdmin createdAt } }');
    setUsers(d.adminUsers);
  }, []);

  const loadBiz = useCallback(async () => {
    const d = await graphqlRequest<{ adminBusinesses: string }>('query { adminBusinesses }');
    try { setBiz(JSON.parse(d.adminBusinesses)); } catch { /* ignore */ }
  }, []);

  const loadLeads = useCallback(async () => {
    try { const d = await graphqlRequest<{ adminContactSubmissions: string }>('query { adminContactSubmissions }'); setLeads(JSON.parse(d.adminContactSubmissions)); } catch { /* ignore */ }
  }, []);

  const [providers, setProviders] = useState<Array<{ id: string; name: string; title: string; category: string; picture: string; rateHourly: number }>>([]);
  const [loadProv, setLoadProv] = useState(false);
  const [provForm, setProvForm] = useState({ id: '', name: '', title: '', category: 'engineering', bio: '', picture: '', rateHourly: 0, skills: '' });
  const provFileRef = useRef<HTMLInputElement>(null);
  const [bookings, setBookings] = useState<Array<{ id: string; providerName: string; userName: string; projectTitle: string; status: string; createdAt: string }>>([]);

  const loadProviders = useCallback(async () => {
    setLoadProv(true);
    try { const d = await graphqlRequest<{ serviceProviders: typeof providers }>('query { serviceProviders(activeOnly:false) { id name title category picture rateHourly } }'); setProviders(d.serviceProviders); } catch { /* ignore */ }
    finally { setLoadProv(false); }
  }, []);

  const loadBookings = useCallback(async () => {
    try { const d = await graphqlRequest<{ myBookings: typeof bookings }>('query { myBookings { id providerName userName projectTitle status createdAt } }'); setBookings(d.myBookings); } catch { /* ignore */ }
  }, []);

  const loadInvestors = useCallback(async () => {
    try { const d = await graphqlRequest<{ investors: Array<{ id: string; name: string; type: string; location: string }> }>('query { investors { id name type location } }'); setInvestors(d.investors); } catch { /* ignore */ }
  }, []);

  useEffect(() => { if (view === 'dashboard') loadData(); }, [view, loadData]);
  useEffect(() => { if (view === 'users') loadUsers(); }, [view, loadUsers]);
  useEffect(() => { if (view === 'businesses') loadBiz(); }, [view, loadBiz]);
  useEffect(() => { if (view === 'submissions') loadLeads(); }, [view, loadLeads]);
  useEffect(() => { if (view === 'investors') loadInvestors(); }, [view, loadInvestors]);
  useEffect(() => { if (view === 'providers') loadProviders(); }, [view, loadProviders]);
  useEffect(() => { if (view === 'bookings') loadBookings(); }, [view, loadBookings]);

  const exec = async (mutation: string, vars: Record<string, unknown>) => {
    setBusy(true); try { await graphqlRequest(mutation, vars); /* reload */ } catch (e) { alert(e instanceof Error ? e.message : 'Error'); } finally { setBusy(false); setModal(null); }
  };

  const AdminNav = () => (
    <Box sx={{ width: 220, flexShrink: 0, bgcolor: '#07130f', borderRight: '1px solid rgba(255,255,255,.06)', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Shield size={20} color="#f59e0b" />
        <Box><Typography sx={{ color: '#fff', fontSize: 14, fontWeight: 800 }}>Admin</Typography><Typography sx={{ color: 'rgba(255,255,255,.3)', fontSize: 9 }}>{user?.email}</Typography></Box>
      </Box>
      <Box sx={{ flex: 1, py: 0.5 }}>
        {NAV_ITEMS.map(item => {
          const Icon = item.icon; const active = view === item.key;
          return (
            <Box key={item.key} onClick={() => setView(item.key)}
              sx={{ px: 2, py: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1.5,
                bgcolor: active ? 'rgba(245,158,11,.1)' : 'transparent',
                borderRight: active ? '2px solid #f59e0b' : '2px solid transparent',
                '&:hover': { bgcolor: 'rgba(255,255,255,.03)' } }}>
              <Icon size={16} color={active ? '#f59e0b' : 'rgba(255,255,255,.4)'} />
              <Typography sx={{ fontSize: 12, fontWeight: active ? 700 : 500, color: active ? '#f59e0b' : 'rgba(255,255,255,.6)' }}>{item.label}</Typography>
              {active && <ChevronRight size={12} color="#f59e0b" style={{ marginLeft: 'auto' }} />}
            </Box>
          );
        })}
      </Box>
      <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,.06)', cursor: 'pointer' }} onClick={() => { logout(); navigate('/vm/auth/signin'); }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}><LogOut size={15} color="rgba(255,255,255,.4)" /><Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,.4)' }}>Log out</Typography></Box>
      </Box>
    </Box>
  );

  const PageTitle = ({ title }: { title: string }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
      <Typography sx={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{title}</Typography>
      <Chip label="Admin" size="small" color="warning" />
    </Box>
  );

  const renderDashboard = () => {
    if (loading) return <Box sx={{ color: 'rgba(255,255,255,.5)' }}><CircularProgress size={16} /> Loading...</Box>;
    if (!data) return <Typography sx={{ color: 'rgba(255,255,255,.5)' }}>No data</Typography>;
    return (
      <>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 2, mb: 2 }}>
          {[{ icon: Users, label: 'Total Users', value: data.totalUsers, color: 'var(--vm-primary-400)' },
            { icon: UserPlus, label: 'Active Users', value: data.activeUsers, color: '#34d399' },
            { icon: Building2, label: 'Businesses', value: data.totalBusinesses, color: '#f59e0b' },
          ].map(s => <Card key={s.label} sx={{ p: 2.5, bgcolor: '#0d1a15', border: '1px solid rgba(255,255,255,.08)', borderRadius: 3 }}>
            <s.icon size={22} color={s.color} />
            <Typography sx={{ fontSize: 30, fontWeight: 900, color: '#fff', mt: 0.5 }}>{s.value}</Typography>
            <Typography sx={{ color: 'rgba(255,255,255,.45)', fontSize: 12 }}>{s.label}</Typography>
          </Card>)}
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <Card sx={{ p: 2, bgcolor: '#0d1a15', border: '1px solid rgba(255,255,255,.08)', borderRadius: 3 }}>
            <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14, mb: 1 }}>Plans</Typography>
            {data.plansBreakdown.map(p => <Box key={p.planName} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: '1px solid rgba(255,255,255,.05)' }}>
              <Typography sx={{ color: 'rgba(255,255,255,.6)', fontSize: 12, textTransform: 'capitalize' }}>{p.planName}</Typography>
              <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 12 }}>{p.count}</Typography>
            </Box>)}
          </Card>
          <Card sx={{ p: 2, bgcolor: '#0d1a15', border: '1px solid rgba(255,255,255,.08)', borderRadius: 3 }}>
            <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14, mb: 1 }}>Recent Signups</Typography>
            {data.recentSignups.slice(0, 5).map(u => <Box key={u.id} sx={{ py: 0.4, borderBottom: '1px solid rgba(255,255,255,.05)' }}>
              <Typography sx={{ color: '#fff', fontSize: 12 }}>{u.firstName} {u.surname}</Typography>
              <Typography sx={{ color: 'rgba(255,255,255,.35)', fontSize: 10 }}>{u.email}</Typography>
            </Box>)}
          </Card>
        </Box>
      </>
    );
  };

  const renderUsers = () => (
    <Card sx={{ bgcolor: '#0d1a15', border: '1px solid rgba(255,255,255,.08)', borderRadius: 3, overflow: 'hidden' }}>
      <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', gap: 1 }}>
        <Users size={16} color="#f59e0b" /><Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14, flex: 1 }}>Users ({users.length})</Typography>
      </Box>
      {users.map(u => <Box key={u.id} sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1, borderBottom: '1px solid rgba(255,255,255,.04)' }}>
        <Box sx={{ flex: 1 }}><Typography sx={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{u.firstName} {u.surname}</Typography><Typography sx={{ color: 'rgba(255,255,255,.35)', fontSize: 11 }}>{u.email}</Typography></Box>
        {u.isAdmin && <Chip label="Admin" size="small" color="warning" sx={{ fontSize: 9, mr: 0.5 }} />}
        <Chip label={u.status} size="small" sx={{ fontSize: 9, mr: 1, color: u.status === 'active' ? '#34d399' : '#f59e0b' }} />
        {!u.isAdmin && <><Button size="small" variant="text" sx={{ minWidth: 0, px: 1, color: '#f59e0b', fontSize: 11 }} onClick={() => exec(`mutation { adminSetAdmin(userId:"${u.id}",isAdmin:true) { id } }`, {})}>Make Admin</Button>
        <Button size="small" variant="text" sx={{ minWidth: 0, px: 1, color: u.status === 'active' ? '#f59e0b' : '#34d399', fontSize: 11 }}
          onClick={() => exec(`mutation { adminUpdateUserStatus(userId:"${u.id}",status:"${u.status === 'active' ? 'suspended' : 'active'}") { id } }`, {})}>{u.status === 'active' ? 'Suspend' : 'Activate'}</Button>
        <Button size="small" variant="text" sx={{ minWidth: 0, px: 1, color: '#ef4444', fontSize: 11 }} onClick={() => { if (confirm('Delete this user?')) exec(`mutation { adminDeleteUser(userId:"${u.id}") }`, {}); }}><Trash2 size={12} /></Button></>}
      </Box>)}
    </Card>
  );

  const renderBiz = () => (
    <Card sx={{ bgcolor: '#0d1a15', border: '1px solid rgba(255,255,255,.08)', borderRadius: 3, overflow: 'hidden' }}>
      <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(255,255,255,.08)' }}><Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Businesses ({biz.length})</Typography></Box>
      {biz.map(b => <Box key={b.id} sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1, borderBottom: '1px solid rgba(255,255,255,.04)' }}>
        <Box sx={{ flex: 1 }}><Typography sx={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{b.name}</Typography><Typography sx={{ color: 'rgba(255,255,255,.35)', fontSize: 11 }}>{b.ownerEmail} · {b.industry || 'N/A'}</Typography></Box>
        <Chip label={b.status} size="small" sx={{ fontSize: 9, color: b.status === 'active' ? '#34d399' : '#f59e0b', mr: 1 }} />
        <Button size="small" variant="text" sx={{ minWidth: 0, px: 1, color: '#ef4444', fontSize: 11 }}
          onClick={() => { if (confirm('Delete this business?')) exec(`mutation { adminDeleteBusiness(businessId:"${b.id}") }`, {}); }}><Trash2 size={12} /></Button>
      </Box>)}
    </Card>
  );

  const renderPlans = () => (
    <Card sx={{ bgcolor: '#0d1a15', border: '1px solid rgba(255,255,255,.08)', borderRadius: 3 }}>
      <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', gap: 1 }}>
        <BookOpen size={16} color="#f59e0b" /><Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14, flex: 1 }}>Plans</Typography>
        <GradientButton size="sm" startIcon={<Plus size={12} />} sx={{ color: '#f59e0b', fontSize: 11, textTransform: 'none' }} onClick={() => setModal({ type: 'createPlan' })}>Add Plan</GradientButton>
      </Box>
      {data?.plansBreakdown.map(p => <Box key={p.planName} sx={{ display: 'flex', justifyContent: 'space-between', px: 2, py: 1, borderBottom: '1px solid rgba(255,255,255,.04)' }}>
        <Typography sx={{ color: '#fff', fontSize: 13, fontWeight: 600, textTransform: 'capitalize' }}>{p.planName}</Typography>
        <Typography sx={{ color: 'rgba(255,255,255,.5)', fontSize: 12 }}>{p.count} users</Typography>
      </Box>)}
    </Card>
  );

  const [invForm, setInvForm] = useState({ id: '', name: '', type: 'vc', location: '', industries: '', thesis: '' });

  const renderInvestors = () => (
    <>
      <Card sx={{ bgcolor: '#0d1a15', border: '1px solid rgba(255,255,255,.08)', borderRadius: 3, overflow: 'hidden', mb: 2 }}>
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Globe size={16} color="#f59e0b" /><Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14, flex: 1 }}>Investors ({investors.length})</Typography>
          <GradientButton size="sm" startIcon={<Plus size={12} />} sx={{ color: '#f59e0b', fontSize: 11, textTransform: 'none' }}
            onClick={() => setInvForm({ id: '', name: '', type: 'vc', location: '', industries: '', thesis: 'Invests in...' })}>Add Investor</GradientButton>
        </Box>
        {investors.length === 0 && <Typography sx={{ color: 'rgba(255,255,255,.35)', fontSize: 12, p: 2 }}>No investors yet. Add the first one.</Typography>}
        {investors.map(inv => <Box key={inv.id} sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1, borderBottom: '1px solid rgba(255,255,255,.04)' }}>
          <Box sx={{ flex: 1 }}><Typography sx={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{inv.name}</Typography><Typography sx={{ color: 'rgba(255,255,255,.35)', fontSize: 11 }}>{inv.type} · {inv.location}</Typography></Box>
          <Button size="small" variant="text" sx={{ minWidth: 0, px: 1, color: '#ef4444', fontSize: 11 }}
            onClick={() => { if (confirm('Delete this investor?')) exec(`mutation { adminDeleteInvestor(id:"${inv.id}") }`, {}); }}><Trash2 size={12} /></Button>
        </Box>)}
      </Card>
      {invForm.name && (
        <Card sx={{ p: 2.5, bgcolor: '#0d1a15', border: '1px solid rgba(255,255,255,.08)', borderRadius: 3 }}>
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14, mb: 1.5 }}>{invForm.id ? 'Edit' : 'New'} Investor</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
            {['name','location','industries','thesis'].map(f => (
              <TextField key={f} size="small" label={f} value={(invForm as Record<string, string>)[f]} onChange={e => setInvForm({...invForm, [f]: e.target.value })}
                sx={{ input: { color: '#fff', fontSize: 12 }, label: { color: 'rgba(255,255,255,.4)', fontSize: 12 }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,.12)' } }} />
            ))}
            <TextField select size="small" label="type" value={invForm.type} onChange={e => setInvForm({...invForm, type: e.target.value })}
              sx={{ input: { color: '#fff' }, label: { color: 'rgba(255,255,255,.4)', fontSize: 12 }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,.12)' } }}
              SelectProps={{ native: true }}>
              {['vc','angel','accelerator','pe'].map(t => <option key={t} value={t}>{t}</option>)}
            </TextField>
          </Box>
          <Box sx={{ mt: 1.5, display: 'flex', gap: 1 }}>
            <GradientButton size="sm" disabled={busy} onClick={async () => {
              await exec(`mutation { adminUpsertInvestor(id:"${invForm.id || crypto.randomUUID()}",name:"${invForm.name.replace(/"/g,'\\"')}",type:"${invForm.type}",location:"${invForm.location.replace(/"/g,'\\"')}",focusIndustries:"${JSON.stringify(invForm.industries.split(',').map(s=>s.trim()))}",thesis:"${invForm.thesis.replace(/"/g,'\\"')}") }`, {});
              setInvForm({ id: '', name: '', type: 'vc', location: '', industries: '', thesis: '' });
            }} sx={{ textTransform: 'none' }}>Save</GradientButton>
            <GradientButton size="sm" onClick={() => setInvForm({ id: '', name: '', type: 'vc', location: '', industries: '', thesis: '' })} sx={{ color: 'rgba(255,255,255,.5)', textTransform: 'none' }}>Cancel</GradientButton>
          </Box>
        </Card>
      )}
    </>
  );

  const renderLeads = () => (
    <Card sx={{ bgcolor: '#0d1a15', border: '1px solid rgba(255,255,255,.08)', borderRadius: 3, overflow: 'hidden' }}>
      <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(255,255,255,.08)' }}><Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Leads ({leads.length})</Typography></Box>
      {leads.map(l => <Box key={l.id} sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1, borderBottom: '1px solid rgba(255,255,255,.04)' }}>
        <Box sx={{ flex: 1 }}><Typography sx={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{l.name || l.email}</Typography><Typography sx={{ color: 'rgba(255,255,255,.35)', fontSize: 11 }}>{l.email} · {l.message?.slice(0, 80)}</Typography></Box>
        <Button size="small" variant="text" sx={{ minWidth: 0, px: 1, color: '#ef4444', fontSize: 11 }}
          onClick={() => { if (confirm('Delete this lead?')) exec(`mutation { adminDeleteContactSubmission(id:"${l.id}") }`, {}); }}><Trash2 size={12} /></Button>
      </Box>)}
    </Card>
  );

  const renderBroadcast = () => (
    <Card sx={{ p: 2.5, bgcolor: '#0d1a15', border: '1px solid rgba(255,255,255,.08)', borderRadius: 3 }}>
      <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14, mb: 1.5 }}>Broadcast Notification</Typography>
      <TextField fullWidth size="small" placeholder="Title" value={broadcastTitle} onChange={e => setBroadcastTitle(e.target.value)}
        sx={{ mb: 1.5, input: { color: '#fff', fontSize: 13 }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,.15)' } }} />
      <TextField fullWidth multiline minRows={3} placeholder="Message to all users..." value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)}
        sx={{ mb: 1.5, textarea: { color: '#fff', fontSize: 13 }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,.15)' } }} />
      <GradientButton variant="contained" disabled={busy || !broadcastMsg} onClick={async () => {
        if (!broadcastTitle || !broadcastMsg) return;
        await exec(`mutation { adminBroadcastNotification(title:"${broadcastTitle.replace(/"/g, '\\"')}",description:"${broadcastMsg.replace(/"/g, '\\"')}") }`, {});
        setBroadcastTitle(''); setBroadcastMsg('');
      }} sx={{ textTransform: 'none' }}>Send to All Users</GradientButton>
    </Card>
  );

  const renderProviders = () => (
    <>
      <Card sx={{ bgcolor: '#0d1a15', border: '1px solid rgba(255,255,255,.08)', borderRadius: 3, overflow: 'hidden', mb: 2 }}>
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Briefcase size={16} color="#f59e0b" /><Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14, flex: 1 }}>Providers ({providers.length})</Typography>
          <GradientButton size="sm" startIcon={<Plus size={12} />} sx={{ color: '#f59e0b', fontSize: 11, textTransform: 'none' }}
            onClick={() => setProvForm({ id: '', name: '', title: '', category: 'engineering', bio: '', picture: '', rateHourly: 50, skills: '' })}>Add Provider</GradientButton>
        </Box>
        {loadProv && <Box sx={{ p: 2, color: 'rgba(255,255,255,.5)' }}><CircularProgress size={14} /> Loading...</Box>}
        {!loadProv && providers.length === 0 && <Typography sx={{ color: 'rgba(255,255,255,.35)', fontSize: 12, p: 2 }}>No providers yet.</Typography>}
        {providers.map(p => <Box key={p.id} sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1, borderBottom: '1px solid rgba(255,255,255,.04)' }}>
          <Avatar src={p.picture || ''} sx={{ width: 32, height: 32, mr: 1.5, bgcolor: '#f59e0b' }}>{p.name[0]}</Avatar>
          <Box sx={{ flex: 1 }}><Typography sx={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{p.name}</Typography><Typography sx={{ color: 'rgba(255,255,255,.35)', fontSize: 11 }}>{p.title} · {p.category} · ${p.rateHourly}/hr</Typography></Box>
          <Button size="small" variant="text" sx={{ minWidth: 0, px: 1, color: '#ef4444', fontSize: 11 }}
            onClick={() => { if (confirm('Delete provider?')) exec(`mutation { adminDeleteProvider(id:"${p.id}") }`, {}); }}><Trash2 size={12} /></Button>
        </Box>)}
      </Card>
      {provForm.name && (
        <Card sx={{ p: 2.5, bgcolor: '#0d1a15', border: '1px solid rgba(255,255,255,.08)', borderRadius: 3 }}>
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14, mb: 1.5 }}>New Provider</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1.5 }}>
            <TextField size="small" label="Name" value={provForm.name} onChange={e => setProvForm({...provForm, name: e.target.value})}
              sx={{ input: { color: '#fff', fontSize: 12 }, label: { color: 'rgba(255,255,255,.4)' }, '& fieldset': { borderColor: 'rgba(255,255,255,.12)' } }} />
            <TextField size="small" label="Title" value={provForm.title} onChange={e => setProvForm({...provForm, title: e.target.value})}
              sx={{ input: { color: '#fff', fontSize: 12 }, label: { color: 'rgba(255,255,255,.4)' }, '& fieldset': { borderColor: 'rgba(255,255,255,.12)' } }} />
            <TextField size="small" label="Rate $/hr" type="number" value={provForm.rateHourly} onChange={e => setProvForm({...provForm, rateHourly: +e.target.value})}
              sx={{ input: { color: '#fff' }, label: { color: 'rgba(255,255,255,.4)' }, '& fieldset': { borderColor: 'rgba(255,255,255,.12)' } }} />
            <Box>
              <input ref={provFileRef} type="file" accept="image/*" hidden onChange={async e => {
                const f = e.target.files?.[0]; if (!f) return;
                try {
                  const r = await (await import('../../lib/api')).uploadFile(f, 'admin', 'provider');
                  setProvForm({...provForm, picture: r.document.url});
                } catch { alert('Upload failed'); }
              }} />
              <GradientButton size="sm" component="span" onClick={() => provFileRef.current?.click()}
                sx={{ height: 40, borderColor: 'rgba(255,255,255,.12)', color: provForm.picture ? '#22c55e' : 'rgba(255,255,255,.5)', fontSize: 11, textTransform: 'none' }}>
                {provForm.picture ? 'Uploaded ✓' : 'Upload Picture'}
              </GradientButton>
              {provForm.picture && <Avatar src={provForm.picture} sx={{ width: 28, height: 28, mt: 0.5, mx: 'auto' }} />}
            </Box>
            <TextField select size="small" label="Category" value={provForm.category} onChange={e => setProvForm({...provForm, category: e.target.value})}
              sx={{ input: { color: '#fff' }, label: { color: 'rgba(255,255,255,.4)' }, '& fieldset': { borderColor: 'rgba(255,255,255,.12)' } }}
              SelectProps={{ native: true }}>
              {['engineering','design','marketing','legal','accounting','consulting','hr','media'].map(c => <option key={c} value={c}>{c}</option>)}
            </TextField>
            <TextField size="small" label="Skills (comma)" value={provForm.skills} onChange={e => setProvForm({...provForm, skills: e.target.value})}
              sx={{ input: { color: '#fff' }, label: { color: 'rgba(255,255,255,.4)' }, '& fieldset': { borderColor: 'rgba(255,255,255,.12)' } }} />
          </Box>
          <TextField fullWidth size="small" label="Bio" multiline minRows={2} value={provForm.bio} onChange={e => setProvForm({...provForm, bio: e.target.value})}
            sx={{ mt: 1.5, textarea: { color: '#fff' }, label: { color: 'rgba(255,255,255,.4)' }, '& fieldset': { borderColor: 'rgba(255,255,255,.12)' } }} />
          <Box sx={{ mt: 1.5, display: 'flex', gap: 1 }}>
            <GradientButton size="sm" disabled={busy || !provForm.name} onClick={async () => {
              await exec(`mutation { adminUpsertProvider(name:"${provForm.name.replace(/"/g,'\\"')}",title:"${provForm.title.replace(/"/g,'\\"')}",category:"${provForm.category}",bio:"${provForm.bio.replace(/"/g,'\\"')}",picture:"${provForm.picture}",rateHourly:${provForm.rateHourly},skills:"${JSON.stringify(provForm.skills.split(',').map(s=>s.trim()))}") { id } }`, {});
              setProvForm({ id: '', name: '', title: '', category: 'engineering', bio: '', picture: '', rateHourly: 0, skills: '' });
            }} sx={{ textTransform: 'none' }}>Save</GradientButton>
            <GradientButton size="sm" onClick={() => setProvForm({ id: '', name: '', title: '', category: 'engineering', bio: '', picture: '', rateHourly: 0, skills: '' })} sx={{ color: 'rgba(255,255,255,.5)', textTransform: 'none' }}>Cancel</GradientButton>
          </Box>
        </Card>
      )}
    </>
  );

  const renderBookings = () => (
    <Card sx={{ bgcolor: '#0d1a15', border: '1px solid rgba(255,255,255,.08)', borderRadius: 3, overflow: 'hidden' }}>
      <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(255,255,255,.08)' }}><Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Bookings ({bookings.length})</Typography></Box>
      {bookings.length === 0 && <Typography sx={{ color: 'rgba(255,255,255,.35)', fontSize: 12, p: 2 }}>No bookings yet.</Typography>}
      {bookings.map(b => {
        const isPending = b.status === 'pending';
        return <Box key={b.id} sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1, borderBottom: '1px solid rgba(255,255,255,.04)' }}>
          <Box sx={{ flex: 1 }}><Typography sx={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{b.projectTitle}</Typography><Typography sx={{ color: 'rgba(255,255,255,.35)', fontSize: 11 }}>{b.providerName} → {b.userName} · {b.status}</Typography></Box>
          {isPending && <>
            <Button size="small" variant="text" sx={{ minWidth: 0, px: 1, color: '#34d399', fontSize: 11 }}
              onClick={() => exec(`mutation { adminUpdateBooking(bookingId:"${b.id}",status:"approved") { id } }`, {})}><CheckCircle size={14} /></Button>
            <Button size="small" variant="text" sx={{ minWidth: 0, px: 1, color: '#ef4444', fontSize: 11 }}
              onClick={() => exec(`mutation { adminUpdateBooking(bookingId:"${b.id}",status:"rejected") { id } }`, {})}><XCircle size={14} /></Button>
          </>}
          {!isPending && <Chip label={b.status} size="small" sx={{ fontSize: 10, color: b.status === 'approved' ? '#34d399' : '#ef4444' }} />}
        </Box>;
      })}
    </Card>
  );

  const renderContent = () => {
    switch (view) {
      case 'dashboard': return renderDashboard();
      case 'users': return renderUsers();
      case 'businesses': return renderBiz();
      case 'plans': return renderPlans();
      case 'investors': return renderInvestors();
      case 'providers': return renderProviders();
      case 'bookings': return renderBookings();
      case 'submissions': return renderLeads();
      case 'broadcast': return renderBroadcast();
      default: return null;
    }
  };

  if (!user?.isAdmin) return null;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#0a0f0d' }}>
      <AdminNav />
      <Box sx={{ flex: 1, p: { xs: 2, sm: 3 }, overflow: 'auto', maxHeight: '100vh' }}>
        <PageTitle title={{ dashboard: 'Overview', users: 'Users', businesses: 'Businesses', plans: 'Plans', investors: 'Investors', providers: 'Providers', bookings: 'Bookings', submissions: 'Leads', broadcast: 'Broadcast' }[view]} />
        {busy && <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, color: '#f59e0b' }}><CircularProgress size={14} /><Typography sx={{ fontSize: 12 }}>Processing...</Typography></Box>}
        {renderContent()}
      </Box>
    </Box>
  );
}
