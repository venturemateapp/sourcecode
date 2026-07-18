import { useCallback, useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography, Avatar, IconButton, Drawer, useMediaQuery, useTheme, Tooltip } from '@mui/material';
import { BarChart3, Bell, BookOpen, Building2, Briefcase, ChevronRight, DollarSign, Globe, Landmark, LogOut, Mail, MessageCircle, Menu, Plus, Shield, ThumbsUp, Trash2, Users, UserPlus, X, XCircle, CheckCircle, FileText, Receipt, Send, Brain } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { GradientButton } from '../../components/shared/buttons';
import { CardSkeleton } from '../../components/shared/Skeleton';
import { graphqlRequest } from '../../lib/api';
import { AdminAiUsage } from './AdminAiUsage';

type AdminView = 'dashboard' | 'users' | 'businesses' | 'plans' | 'investors' | 'providers' | 'bookings' | 'submissions' | 'broadcast' | 'support' | 'banking' | 'registrations' | 'invoices' | 'financing' | 'ai-usage';

const NAV_ITEMS: Array<{ key: AdminView; icon: typeof Shield; label: string; desc: string }> = [
  { key: 'dashboard', icon: BarChart3, label: 'Dashboard', desc: 'Platform overview' },
  { key: 'users', icon: Users, label: 'Users', desc: 'Manage accounts' },
  { key: 'businesses', icon: Building2, label: 'Businesses', desc: 'Startup profiles' },
  { key: 'plans', icon: BookOpen, label: 'Plans', desc: 'Subscription tiers' },
  { key: 'investors', icon: Globe, label: 'Investors', desc: 'Network partners' },
  { key: 'providers', icon: Briefcase, label: 'Providers', desc: 'Service providers' },
  { key: 'bookings', icon: ThumbsUp, label: 'Bookings', desc: 'Appointments' },
  { key: 'submissions', icon: Mail, label: 'Leads', desc: 'Contact inquiries' },
  { key: 'broadcast', icon: Bell, label: 'Broadcast', desc: 'Push notifications' },
  { key: 'support', icon: MessageCircle, label: 'Support', desc: 'Chat sessions' },
  { key: 'banking', icon: Landmark, label: 'Banking', desc: 'Bank accounts' },
  { key: 'registrations', icon: FileText, label: 'Registrations', desc: 'Business registrations' },
  { key: 'invoices', icon: Receipt, label: 'Invoices', desc: 'All invoices' },
  { key: 'financing', icon: DollarSign, label: 'Financing', desc: 'Lender offers' },
  { key: 'ai-usage', icon: Brain, label: 'AI Usage', desc: 'Token usage & interactions' },
];

interface DashboardData {
  totalUsers: number; activeUsers: number; totalBusinesses: number;
  plansBreakdown: Array<{ planName: string; count: number }>;
  recentSignups: Array<{ id: string; firstName: string; surname: string; email: string; status: string; isAdmin: boolean; createdAt: string }>;
}

interface UserRow { id: string; firstName: string; surname: string; email: string; status: string; isAdmin: boolean; createdAt: string; }
interface BizRow { id: string; name: string; industry: string; status: string; ownerName: string; ownerEmail: string; }

function StatCard({ icon: Icon, label, value, color, subtitle }: { icon: typeof Users; label: string; value: string | number; color: string; subtitle?: string }) {
  return (
    <Card sx={{
      p: { xs: 2, sm: 2.5 },
      background: `linear-gradient(135deg, ${color}15 0%, transparent 80%)`,
      border: `1px solid ${color}25`,
      borderRadius: 3,
      position: 'relative',
      overflow: 'hidden',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        right: 0,
        width: 120,
        height: 120,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color}10 0%, transparent 70%)`,
        transform: 'translate(30px, -30px)',
      },
    }}>
      <Icon size={20} color={color} />
      <Typography sx={{ fontSize: { xs: 26, sm: 32 }, fontWeight: 900, color: '#fff', mt: 0.5, lineHeight: 1.1 }}>{value}</Typography>
      <Typography sx={{ color: `${color}cc`, fontSize: 12, fontWeight: 600, mt: 0.25 }}>{label}</Typography>
      {subtitle && <Typography sx={{ color: 'rgba(255,255,255,.25)', fontSize: 10, mt: 0.5 }}>{subtitle}</Typography>}
    </Card>
  );
}

function StatusBadge({ status, escalated, active }: { status: string; escalated?: string; active?: string }) {
  const map: Record<string, { color: string; bg: string }> = {
    active: { color: '#34d399', bg: 'rgba(52,211,153,.15)' },
    inactive: { color: '#94a3b8', bg: 'rgba(148,163,184,.12)' },
    suspended: { color: '#f59e0b', bg: 'rgba(245,158,11,.15)' },
    escalated: { color: '#f59e0b', bg: 'rgba(245,158,11,.15)' },
    closed: { color: '#94a3b8', bg: 'rgba(148,163,184,.12)' },
    open: { color: '#34d399', bg: 'rgba(52,211,153,.15)' },
    pending: { color: '#f59e0b', bg: 'rgba(245,158,11,.15)' },
    approved: { color: '#34d399', bg: 'rgba(52,211,153,.15)' },
    rejected: { color: '#ef4444', bg: 'rgba(239,68,68,.15)' },
  };
  const s = map[escalated || active || status] || map.active;
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.3, borderRadius: 6, bgcolor: s.bg }}>
      <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: s.color }} />
      <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: s.color, textTransform: 'capitalize' }}>{status}</Typography>
    </Box>
  );
}

export function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
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
  const [providers, setProviders] = useState<Array<{ id: string; name: string; title: string; category: string; picture: string; rateHourly: number }>>([]);
  const [loadProv, setLoadProv] = useState(false);
  const [provForm, setProvForm] = useState({ id: '', name: '', title: '', category: 'engineering', bio: '', picture: '', rateHourly: 0, skills: '' });
  const provFileRef = useRef<HTMLInputElement>(null);
  const [bookings, setBookings] = useState<Array<{ id: string; providerName: string; userName: string; projectTitle: string; status: string; createdAt: string }>>([]);
  const [supportSessions, setSupportSessions] = useState<Array<{ id: string; userId: string; subject: string; status: string; createdByName: string; createdByEmail: string; summary: string; createdAt: string; updatedAt: string }>>([]);
  const [supportMessages, setSupportMessages] = useState<Array<{ id: string; sessionId: string; role: string; content: string; createdAt: string }>>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [bankAccounts, setBankAccounts] = useState<Array<{ id: string; userId: string; businessId: string; bankName: string; accountType: string; accountNumber: string; accountName: string; currency: string; status: string; createdAt: string }>>([]);
  const [registrations, setRegistrations] = useState<Array<{ id: string; businessId: string; userId: string; registrationType: string; status: string; legalName: string; ownerName: string; ownerEmail: string; ownerPhone: string; addressCity: string; addressCountry: string; adminNotes: string; createdAt: string }>>([]);
  const [adminInvoices, setAdminInvoices] = useState<Array<{ id: string; userId: string; businessId: string; invoiceNumber: string; customerName: string; amount: number; currency: string; status: string; dueDate: string; createdAt: string }>>([]);

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

  const loadProviders = useCallback(async () => {
    setLoadProv(true);
    try { const d = await graphqlRequest<{ serviceProviders: typeof providers }>('query { serviceProviders(activeOnly:false) { id name title category picture rateHourly } }'); setProviders(d.serviceProviders); } catch { /* ignore */ }
    finally { setLoadProv(false); }
  }, []);

  const loadSupport = useCallback(async () => {
    try { const d = await graphqlRequest<{ supportSessions: typeof supportSessions }>('query { supportSessions { id userId subject status createdByName createdByEmail summary createdAt updatedAt } }'); setSupportSessions(d.supportSessions); } catch { /* ignore */ }
  }, []);

  const loadSupportMessages = useCallback(async (sessionId: string) => {
    try { const d = await graphqlRequest<{ supportSessionMessages: typeof supportMessages }>(`query { supportSessionMessages(sessionId:"${sessionId}") { id sessionId role content createdAt } }`); setSupportMessages(d.supportSessionMessages); } catch { /* ignore */ }
  }, []);

  const loadBookings = useCallback(async () => {
    try { const d = await graphqlRequest<{ myBookings: typeof bookings }>('query { myBookings { id providerName userName projectTitle status createdAt } }'); setBookings(d.myBookings); } catch { /* ignore */ }
  }, []);

  const loadInvestors = useCallback(async () => {
    try { const d = await graphqlRequest<{ investors: Array<{ id: string; name: string; type: string; location: string }> }>('query { investors { id name type location } }'); setInvestors(d.investors); } catch { /* ignore */ }
  }, []);

  const loadBankAccounts = useCallback(async () => {
    try { const d = await graphqlRequest<{ allBankAccounts: typeof bankAccounts }>('query { allBankAccounts { id userId businessId bankName accountType accountNumber accountName currency status createdAt } }'); setBankAccounts(d.allBankAccounts); } catch { /* ignore */ }
  }, []);

  const loadRegistrations = useCallback(async () => {
    try { const d = await graphqlRequest<{ adminRegistrations: typeof registrations }>('query { adminRegistrations { id businessId userId registrationType status legalName ownerName ownerEmail ownerPhone addressCity addressCountry adminNotes createdAt } }'); setRegistrations(d.adminRegistrations); } catch { /* ignore */ }
  }, []);

  const loadAdminInvoices = useCallback(async () => {
    try { const d = await graphqlRequest<{ adminInvoices: string }>('query { adminInvoices }'); setAdminInvoices(JSON.parse(d.adminInvoices)); } catch { /* ignore */ }
  }, []);

  const [financingOffers, setFinancingOffers] = useState<Array<{ id: string; lenderName: string; productType: string; minAmount: number; maxAmount: number; minRate: number; maxRate: number; termMonths: number; requirements: string; isActive: boolean }>>([]);
  const [financingForm, setFinancingForm] = useState<{ id?: string; lenderName: string; productType: string; minAmount: number; maxAmount: number; minRate: number; maxRate: number; termMonths: number; requirements: string }>({ lenderName: '', productType: 'loan', minAmount: 0, maxAmount: 0, minRate: 0, maxRate: 0, termMonths: 12, requirements: '[]' });

  const loadFinancingOffers = useCallback(async () => {
    try { const d = await graphqlRequest<{ adminFinancingOffers: typeof financingOffers }>('query { adminFinancingOffers { id lenderName productType minAmount maxAmount minRate maxRate termMonths requirements isActive } }'); setFinancingOffers(d.adminFinancingOffers); } catch { /* ignore */ }
  }, []);

  useEffect(() => { if (view === 'dashboard') loadData(); }, [view, loadData]);
  useEffect(() => { if (view === 'users') loadUsers(); }, [view, loadUsers]);
  useEffect(() => { if (view === 'businesses') loadBiz(); }, [view, loadBiz]);
  useEffect(() => { if (view === 'submissions') loadLeads(); }, [view, loadLeads]);
  useEffect(() => { if (view === 'investors') loadInvestors(); }, [view, loadInvestors]);
  useEffect(() => { if (view === 'providers') loadProviders(); }, [view, loadProviders]);
  useEffect(() => { if (view === 'bookings') loadBookings(); }, [view, loadBookings]);
  useEffect(() => { if (view === 'support') { loadSupport(); setSelectedSession(null); setSupportMessages([]); } }, [view, loadSupport]);
  useEffect(() => { if (view === 'banking') loadBankAccounts(); }, [view, loadBankAccounts]);
  useEffect(() => { if (view === 'registrations') loadRegistrations(); }, [view, loadRegistrations]);
  useEffect(() => { if (view === 'invoices') loadAdminInvoices(); }, [view, loadAdminInvoices]);
  useEffect(() => { if (view === 'financing') loadFinancingOffers(); }, [view, loadFinancingOffers]);

  const exec = async (mutation: string, vars: Record<string, unknown>) => {
    setBusy(true); try { await graphqlRequest(mutation, vars); } catch (e) { alert(e instanceof Error ? e.message : 'Error'); } finally { setBusy(false); setModal(null); }
  };

  const handleNav = (key: AdminView) => {
    setView(key);
    if (isMobile) setMobileNavOpen(false);
  };

  const NavSidebar = () => (
    <Box sx={{
      width: { xs: 260, md: 240 },
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      bgcolor: 'rgba(7, 19, 15, 0.95)',
      borderRight: '1px solid rgba(255,255,255,.06)',
      backdropFilter: 'blur(20px)',
      zIndex: 120,
      position: 'relative',
    }}>
      <Box sx={{ p: { xs: 2, md: 2.5 }, borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: 'rgba(245,158,11,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Shield size={18} color="#f59e0b" />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ color: '#fff', fontSize: 15, fontWeight: 800, lineHeight: 1.2 }}>Admin Panel</Typography>
          <Typography sx={{ color: 'rgba(255,255,255,.3)', fontSize: 10, lineHeight: 1.2 }}>{user?.email}</Typography>
        </Box>
        {isMobile && (
          <IconButton size="small" onClick={() => setMobileNavOpen(false)} sx={{ ml: 'auto', color: 'rgba(255,255,255,.4)' }}>
            <X size={18} />
          </IconButton>
        )}
      </Box>

      <Box sx={{ flex: 1, py: 1, overflow: 'auto', px: 1 }}>
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const active = view === item.key;
          return (
            <Box
              key={item.key}
              onClick={() => handleNav(item.key)}
              sx={{
                px: 1.5, py: 1.2, mb: 0.25, cursor: 'pointer', borderRadius: 2,
                display: 'flex', alignItems: 'center', gap: 1.5,
                bgcolor: active ? 'rgba(245,158,11,.1)' : 'transparent',
                border: active ? '1px solid rgba(245,158,11,.2)' : '1px solid transparent',
                transition: 'all .15s ease',
                '&:hover': { bgcolor: active ? 'rgba(245,158,11,.12)' : 'rgba(255,255,255,.03)' },
              }}
            >
              <Box sx={{ width: 28, height: 28, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: active ? 'rgba(245,158,11,.15)' : 'transparent' }}>
                <Icon size={15} color={active ? '#f59e0b' : 'rgba(255,255,255,.35)'} />
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography sx={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? '#f59e0b' : 'rgba(255,255,255,.55)' }}>{item.label}</Typography>
                <Typography sx={{ fontSize: 9.5, color: active ? 'rgba(245,158,11,.4)' : 'rgba(255,255,255,.2)', display: { xs: 'none', md: 'block' } }}>{item.desc}</Typography>
              </Box>
              {active && <ChevronRight size={12} color="#f59e0b" style={{ marginLeft: 'auto' }} />}
            </Box>
          );
        })}
      </Box>

      <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,.06)' }}>
        <Box
          onClick={() => { logout(); navigate('/vm/auth/signin'); }}
          sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer', px: 1.5, py: 1, borderRadius: 2, '&:hover': { bgcolor: 'rgba(255,255,255,.03)' } }}
        >
          <LogOut size={14} color="rgba(255,255,255,.3)" />
          <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,.35)', fontWeight: 500 }}>Sign out</Typography>
        </Box>
      </Box>
    </Box>
  );

  const PageHeader = ({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) => (
    <Box sx={{ display: 'flex', alignItems: { xs: 'stretch', sm: 'center' }, gap: 1.5, mb: 2.5, flexDirection: { xs: 'column', sm: 'row' }, minWidth: 0 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          {isMobile && (
            <IconButton size="small" onClick={() => setMobileNavOpen(true)} sx={{ color: 'rgba(255,255,255,.5)' }}>
              <Menu size={20} />
            </IconButton>
          )}
          <Typography sx={{ fontSize: { xs: 18, sm: 22 }, fontWeight: 800, color: '#fff', lineHeight: 1.2, whiteSpace: 'nowrap' }}>{title}</Typography>
          <Chip label="Admin" size="small" sx={{ bgcolor: 'rgba(245,158,11,.15)', color: '#f59e0b', fontWeight: 700, fontSize: 9, height: 20 }} />
        </Box>
        {subtitle && <Typography sx={{ color: 'rgba(255,255,255,.3)', fontSize: 12, mt: 0.25 }}>{subtitle}</Typography>}
      </Box>
      {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
    </Box>
  );

  const renderDashboard = () => {
    if (loading) return <CardSkeleton count={4} type="stat" />;
    if (!data) return <Typography sx={{ color: 'rgba(255,255,255,.3)', textAlign: 'center', py: 8 }}>No data available</Typography>;
    const activePercent = data.totalUsers ? Math.round((data.activeUsers / data.totalUsers) * 100) : 0;
    return (
      <>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)', lg: 'repeat(4,1fr)' }, gap: { xs: 1.5, sm: 2 }, mb: 3 }}>
          <StatCard icon={Users} label="Total Users" value={data.totalUsers} color="#10b981" subtitle="Registered accounts" />
          <StatCard icon={UserPlus} label="Active Users" value={data.activeUsers} color="#34d399" subtitle={`${activePercent}% of total`} />
          <StatCard icon={Building2} label="Businesses" value={data.totalBusinesses} color="#f59e0b" subtitle="Startup profiles" />
          <StatCard icon={BookOpen} label="Plans" value={data.plansBreakdown.length} color="#8b5cf6" subtitle="Subscription tiers" />
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2 }}>
          <Card sx={{ p: { xs: 2, sm: 2.5 }, bgcolor: 'rgba(13, 26, 21, .8)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 3, backdropFilter: 'blur(12px)' }}>
            <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <BookOpen size={15} color="#8b5cf6" /> Plan Distribution
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {data.plansBreakdown.map(p => {
                const total = data.plansBreakdown.reduce((a, b) => a + b.count, 0);
                const pct = total ? Math.round((p.count / total) * 100) : 0;
                return (
                  <Box key={p.planName}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                      <Typography sx={{ color: 'rgba(255,255,255,.6)', fontSize: 12, textTransform: 'capitalize' }}>{p.planName}</Typography>
                      <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 12 }}>{p.count}</Typography>
                    </Box>
                    <Box sx={{ height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,.05)', overflow: 'hidden' }}>
                      <Box sx={{ height: '100%', borderRadius: 2, width: `${pct}%`, bgcolor: '#8b5cf6', transition: 'width .6s ease' }} />
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Card>

          <Card sx={{ p: { xs: 2, sm: 2.5 }, bgcolor: 'rgba(13, 26, 21, .8)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 3, backdropFilter: 'blur(12px)' }}>
            <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <UserPlus size={15} color="#34d399" /> Recent Signups
            </Typography>
            {data.recentSignups.slice(0, 6).map((u, i) => (
              <Box key={u.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.75, borderBottom: i < 5 ? '1px solid rgba(255,255,255,.04)' : 'none' }}>
                <Avatar sx={{ width: 28, height: 28, bgcolor: u.isAdmin ? '#f59e0b' : '#10b981', fontSize: 11, fontWeight: 700 }}>
                  {u.firstName[0]}{u.surname[0]}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ color: '#fff', fontSize: 12.5, fontWeight: 600 }}>{u.firstName} {u.surname}</Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,.3)', fontSize: 10.5 }}>{u.email}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <StatusBadge status={u.status} />
                  {u.isAdmin && <Chip label="Admin" size="small" sx={{ bgcolor: 'rgba(245,158,11,.15)', color: '#f59e0b', fontSize: 8, height: 18, '& .MuiChip-label': { px: 0.5 } }} />}
                </Box>
              </Box>
            ))}
          </Card>
        </Box>
      </>
    );
  };

  const renderUsers = () => (
    <Card sx={{ bgcolor: 'rgba(13, 26, 21, .8)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 3, overflow: 'hidden', backdropFilter: 'blur(12px)' }}>
      <Box sx={{ px: { xs: 2, sm: 2.5 }, py: 1.5, borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', gap: 1 }}>
        <Users size={16} color="#f59e0b" />
        <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14, flex: 1 }}>Users <Typography component="span" sx={{ color: 'rgba(255,255,255,.3)', fontWeight: 400 }}>({users.length})</Typography></Typography>
      </Box>
      {users.length === 0 && <Typography sx={{ color: 'rgba(255,255,255,.3)', textAlign: 'center', py: 4, fontSize: 13 }}>No users found.</Typography>}
      <Box sx={{ overflow: 'auto' }}>
        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
          <Box component="thead">
            <Box component="tr" sx={{ borderBottom: '1px solid rgba(255,255,255,.04)' }}>
              {['Name', 'Email', 'Status', 'Role', 'Joined', 'Actions'].map(h => (
                <Box key={h} component="th" sx={{ textAlign: 'left', px: { xs: 1.5, sm: 2.5 }, py: 1.5, color: 'rgba(255,255,255,.3)', fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</Box>
              ))}
            </Box>
          </Box>
          <Box component="tbody">
            {users.map(u => (
              <Box key={u.id} component="tr" sx={{ borderBottom: '1px solid rgba(255,255,255,.03)', '&:hover': { bgcolor: 'rgba(255,255,255,.02)' } }}>
                <Box component="td" sx={{ px: { xs: 1.5, sm: 2.5 }, py: 1.25 }}>
                  <Typography sx={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{u.firstName} {u.surname}</Typography>
                </Box>
                <Box component="td" sx={{ px: 2.5, py: 1.25 }}>
                  <Typography sx={{ color: 'rgba(255,255,255,.5)', fontSize: 12 }}>{u.email}</Typography>
                </Box>
                <Box component="td" sx={{ px: 2.5, py: 1.25 }}>
                  <StatusBadge status={u.status} />
                </Box>
                <Box component="td" sx={{ px: 2.5, py: 1.25 }}>
                  {u.isAdmin ? <Chip label="Admin" size="small" sx={{ bgcolor: 'rgba(245,158,11,.15)', color: '#f59e0b', fontSize: 10, fontWeight: 700, height: 22 }} /> : <Typography sx={{ color: 'rgba(255,255,255,.3)', fontSize: 12 }}>User</Typography>}
                </Box>
                <Box component="td" sx={{ px: 2.5, py: 1.25 }}>
                  <Typography sx={{ color: 'rgba(255,255,255,.35)', fontSize: 11 }}>{new Date(u.createdAt).toLocaleDateString()}</Typography>
                </Box>
                <Box component="td" sx={{ px: { xs: 1.5, sm: 2.5 }, py: 1.25 }}>
                  {!u.isAdmin ? (
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="Make Admin">
                        <IconButton size="small" sx={{ color: '#f59e0b' }} onClick={() => exec(`mutation { adminSetAdmin(userId:"${u.id}",isAdmin:true) { id } }`, {})}>
                          <Shield size={14} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={u.status === 'active' ? 'Suspend' : 'Activate'}>
                        <IconButton size="small" sx={{ color: u.status === 'active' ? '#f59e0b' : '#34d399' }}
                          onClick={() => exec(`mutation { adminUpdateUserStatus(userId:"${u.id}",status:"${u.status === 'active' ? 'suspended' : 'active'}") { id } }`, {})}>
                          {u.status === 'active' ? <XCircle size={14} /> : <CheckCircle size={14} />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" sx={{ color: '#ef4444' }} onClick={() => { if (confirm('Delete this user?')) exec(`mutation { adminDeleteUser(userId:"${u.id}") }`, {}); }}>
                          <Trash2 size={14} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  ) : (
                    <Typography sx={{ color: 'rgba(255,255,255,.2)', fontSize: 11 }}>—</Typography>
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Card>
  );

  const renderBiz = () => (
    <Card sx={{ bgcolor: 'rgba(13, 26, 21, .8)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 3, overflow: 'hidden', backdropFilter: 'blur(12px)' }}>
      <Box sx={{ px: { xs: 2, sm: 2.5 }, py: 1.5, borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', gap: 1 }}>
        <Building2 size={16} color="#f59e0b" />
        <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14, flex: 1 }}>Businesses <Typography component="span" sx={{ color: 'rgba(255,255,255,.3)', fontWeight: 400 }}>({biz.length})</Typography></Typography>
      </Box>
      {biz.length === 0 && <Typography sx={{ color: 'rgba(255,255,255,.3)', textAlign: 'center', py: 4, fontSize: 13 }}>No businesses found.</Typography>}
      <Box sx={{ overflow: 'auto' }}>
        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
          <Box component="thead">
            <Box component="tr" sx={{ borderBottom: '1px solid rgba(255,255,255,.04)' }}>
              {['Name', 'Owner', 'Industry', 'Status', 'Actions'].map(h => (
                <Box key={h} component="th" sx={{ textAlign: 'left', px: { xs: 1.5, sm: 2.5 }, py: 1.5, color: 'rgba(255,255,255,.3)', fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</Box>
              ))}
            </Box>
          </Box>
          <Box component="tbody">
            {biz.map(b => (
              <Box key={b.id} component="tr" sx={{ borderBottom: '1px solid rgba(255,255,255,.03)', '&:hover': { bgcolor: 'rgba(255,255,255,.02)' } }}>
                <Box component="td" sx={{ px: { xs: 1.5, sm: 2.5 }, py: 1.25 }}>
                  <Typography sx={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{b.name}</Typography>
                </Box>
                <Box component="td" sx={{ px: 2.5, py: 1.25 }}>
                  <Typography sx={{ color: 'rgba(255,255,255,.5)', fontSize: 12 }}>{b.ownerEmail}</Typography>
                </Box>
                <Box component="td" sx={{ px: 2.5, py: 1.25 }}>
                  {b.industry ? <Chip label={b.industry} size="small" sx={{ bgcolor: 'rgba(139,92,246,.12)', color: '#a78bfa', fontSize: 10, fontWeight: 600 }} /> : <Typography sx={{ color: 'rgba(255,255,255,.2)', fontSize: 11 }}>—</Typography>}
                </Box>
                <Box component="td" sx={{ px: 2.5, py: 1.25 }}>
                  <StatusBadge status={b.status} />
                </Box>
                <Box component="td" sx={{ px: { xs: 1.5, sm: 2.5 }, py: 1.25 }}>
                  <Tooltip title="Delete">
                    <IconButton size="small" sx={{ color: '#ef4444' }} onClick={() => { if (confirm('Delete this business?')) exec(`mutation { adminDeleteBusiness(businessId:"${b.id}") }`, {}); }}>
                      <Trash2 size={14} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Card>
  );

  const renderPlans = () => (
    <Card sx={{ bgcolor: 'rgba(13, 26, 21, .8)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 3, backdropFilter: 'blur(12px)' }}>
      <Box sx={{ px: { xs: 2, sm: 2.5 }, py: 1.5, borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', gap: 1 }}>
        <BookOpen size={16} color="#f59e0b" />
        <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14, flex: 1 }}>Subscription Plans</Typography>
      </Box>
      {data?.plansBreakdown.map((p, i) => {
        const total = data.plansBreakdown.reduce((a, b) => a + b.count, 0);
        const pct = total ? Math.round((p.count / total) * 100) : 0;
        return (
          <Box key={p.planName} sx={{ display: 'flex', alignItems: 'center', px: { xs: 2, sm: 2.5 }, py: 1.25, borderBottom: i < data.plansBreakdown.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none' }}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ color: '#fff', fontSize: 13, fontWeight: 600, textTransform: 'capitalize' }}>{p.planName}</Typography>
              <Box sx={{ mt: 0.5, height: 6, borderRadius: 3, bgcolor: 'rgba(255,255,255,.04)', overflow: 'hidden', maxWidth: 300 }}>
                <Box sx={{ height: '100%', borderRadius: 3, width: `${pct}%`, bgcolor: ['#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'][i % 5] }} />
              </Box>
            </Box>
            <Typography sx={{ color: 'rgba(255,255,255,.5)', fontSize: 12, fontWeight: 600, ml: 2 }}>{p.count} users</Typography>
            <Typography sx={{ color: 'rgba(255,255,255,.25)', fontSize: 11, ml: 1.5, minWidth: 42, textAlign: 'right' }}>{pct}%</Typography>
          </Box>
        );
      })}
    </Card>
  );

  const [invForm, setInvForm] = useState({ id: '', name: '', type: 'vc', location: '', industries: '', thesis: '' });

  const renderInvestors = () => (
    <>
      <Card sx={{ bgcolor: 'rgba(13, 26, 21, .8)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 3, overflow: 'hidden', mb: 2, backdropFilter: 'blur(12px)' }}>
        <Box sx={{ px: { xs: 2, sm: 2.5 }, py: 1.5, borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Globe size={16} color="#f59e0b" />
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14, flex: 1 }}>Investors <Typography component="span" sx={{ color: 'rgba(255,255,255,.3)', fontWeight: 400 }}>({investors.length})</Typography></Typography>
          <GradientButton variant="outline" size="sm" startIcon={<Plus size={12} />} onClick={() => setInvForm({ id: '', name: '', type: 'vc', location: '', industries: '', thesis: 'Invests in...' })}>
            Add Investor
          </GradientButton>
        </Box>
        {investors.length === 0 && <Typography sx={{ color: 'rgba(255,255,255,.3)', textAlign: 'center', py: 4, fontSize: 13 }}>No investors yet.</Typography>}
        {investors.map(inv => (
          <Box key={inv.id} sx={{ display: 'flex', alignItems: 'center', px: { xs: 2, sm: 2.5 }, py: 1.25, borderBottom: '1px solid rgba(255,255,255,.04)', '&:hover': { bgcolor: 'rgba(255,255,255,.02)' } }}>
            <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: 'rgba(245,158,11,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 1.5, flexShrink: 0 }}>
              <Globe size={16} color="#f59e0b" />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{inv.name}</Typography>
              <Typography sx={{ color: 'rgba(255,255,255,.35)', fontSize: 11 }}>{inv.type} · {inv.location}</Typography>
            </Box>
            <Tooltip title="Delete">
              <IconButton size="small" sx={{ color: '#ef4444' }} onClick={() => { if (confirm('Delete this investor?')) exec(`mutation { adminDeleteInvestor(id:"${inv.id}") }`, {}); }}>
                <Trash2 size={14} />
              </IconButton>
            </Tooltip>
          </Box>
        ))}
      </Card>
      <Dialog open={!!invForm.name} onClose={() => setInvForm({...invForm, name: ''})} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: '#0d1a15', border: '1px solid rgba(255,255,255,.1)', borderRadius: 3, backgroundImage: 'linear-gradient(135deg, rgba(245,158,11,.05), transparent)' } }}>
        <DialogTitle sx={{ color: '#fff', fontSize: 18, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,.08)' }}>{invForm.id ? 'Edit' : 'New'} Investor</DialogTitle>
        <DialogContent sx={{ pt: 3.5 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            {['name','location','industries','thesis'].map(f => (
              <TextField key={f} size="small" label={f} value={(invForm as Record<string, string>)[f]} onChange={e => setInvForm({...invForm, [f]: e.target.value })}
                sx={{ input: { color: '#fff', fontSize: 13 }, label: { color: 'rgba(255,255,255,.4)', fontSize: 13 }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,.12)' }, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,.25)' } }} />
            ))}
            <TextField select size="small" label="type" value={invForm.type} onChange={e => setInvForm({...invForm, type: e.target.value })}
              sx={{ input: { color: '#fff' }, label: { color: 'rgba(255,255,255,.4)' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,.12)' } }} SelectProps={{ native: true }}>
              {['vc','angel','accelerator','pe'].map(t => <option key={t} value={t}>{t}</option>)}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 0 }}>
          <GradientButton variant="ghost" size="sm" onClick={() => setInvForm({ id: '', name: '', type: 'vc', location: '', industries: '', thesis: '' })}>Cancel</GradientButton>
          <GradientButton variant="primary" size="sm" disabled={busy} onClick={async () => {
            await exec(`mutation { adminUpsertInvestor(id:"${invForm.id || crypto.randomUUID()}",name:"${invForm.name.replace(/"/g,'\\"')}",type:"${invForm.type}",location:"${invForm.location.replace(/"/g,'\\"')}",focusIndustries:"${JSON.stringify(invForm.industries.split(',').map(s=>s.trim()))}",thesis:"${invForm.thesis.replace(/"/g,'\\"')}") }`, {});
            setInvForm({ id: '', name: '', type: 'vc', location: '', industries: '', thesis: '' });
          }}>Save</GradientButton>
        </DialogActions>
      </Dialog>
    </>
  );

  const renderLeads = () => (
    <Card sx={{ bgcolor: 'rgba(13, 26, 21, .8)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 3, overflow: 'hidden', backdropFilter: 'blur(12px)' }}>
      <Box sx={{ px: { xs: 2, sm: 2.5 }, py: 1.5, borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', gap: 1 }}>
        <Mail size={16} color="#f59e0b" />
        <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14, flex: 1 }}>Leads <Typography component="span" sx={{ color: 'rgba(255,255,255,.3)', fontWeight: 400 }}>({leads.length})</Typography></Typography>
      </Box>
      {leads.length === 0 && <Typography sx={{ color: 'rgba(255,255,255,.3)', textAlign: 'center', py: 4, fontSize: 13 }}>No leads yet.</Typography>}
      {leads.map(l => (
        <Box key={l.id} sx={{ display: 'flex', alignItems: 'center', px: { xs: 2, sm: 2.5 }, py: 1.25, borderBottom: '1px solid rgba(255,255,255,.04)', '&:hover': { bgcolor: 'rgba(255,255,255,.02)' } }}>
          <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: 'rgba(16,185,129,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 1.5, flexShrink: 0 }}>
            <Mail size={16} color="#10b981" />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{l.name || l.email}</Typography>
            <Typography sx={{ color: 'rgba(255,255,255,.35)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.email} · {l.message?.slice(0, 100)}</Typography>
          </Box>
          <Tooltip title="Delete">
            <IconButton size="small" sx={{ color: '#ef4444' }} onClick={() => { if (confirm('Delete this lead?')) exec(`mutation { adminDeleteContactSubmission(id:"${l.id}") }`, {}); }}>
              <Trash2 size={14} />
            </IconButton>
          </Tooltip>
        </Box>
      ))}
    </Card>
  );

  const renderBroadcast = () => (
    <Card sx={{ p: { xs: 2, sm: 3 }, bgcolor: 'rgba(13, 26, 21, .8)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 3, backdropFilter: 'blur(12px)', maxWidth: 560 }}>
      <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 15, mb: 0.25, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Bell size={16} color="#f59e0b" /> Broadcast Notification
      </Typography>
      <Typography sx={{ color: 'rgba(255,255,255,.3)', fontSize: 11, mb: 2 }}>Send a push notification to all users</Typography>
      <TextField fullWidth size="small" placeholder="Notification title" value={broadcastTitle} onChange={e => setBroadcastTitle(e.target.value)}
        sx={{ mb: 1.5, input: { color: '#fff', fontSize: 13 }, label: { color: 'rgba(255,255,255,.4)' },
          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,.12)' }, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,.25)' } }} />
      <TextField fullWidth multiline minRows={3} placeholder="Write your message..." value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)}
        sx={{ mb: 2, textarea: { color: '#fff', fontSize: 13 }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,.12)' }, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,.25)' } }} />
      <GradientButton disabled={busy || !broadcastMsg} onClick={async () => {
        if (!broadcastTitle || !broadcastMsg) return;
        await exec(`mutation { adminBroadcastNotification(title:"${broadcastTitle.replace(/"/g, '\\"')}",description:"${broadcastMsg.replace(/"/g, '\\"')}") }`, {});
        setBroadcastTitle(''); setBroadcastMsg('');
      }} startIcon={busy ? <CircularProgress size={14} /> : <Send size={14} />}>Send to All Users</GradientButton>
    </Card>
  );

  const renderProviders = () => (
    <>
      <Card sx={{ bgcolor: 'rgba(13, 26, 21, .8)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 3, overflow: 'hidden', mb: 2, backdropFilter: 'blur(12px)' }}>
        <Box sx={{ px: { xs: 2, sm: 2.5 }, py: 1.5, borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Briefcase size={16} color="#f59e0b" />
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14, flex: 1 }}>Providers <Typography component="span" sx={{ color: 'rgba(255,255,255,.3)', fontWeight: 400 }}>({providers.length})</Typography></Typography>
          <GradientButton variant="outline" size="sm" startIcon={<Plus size={12} />}
            onClick={() => setProvForm({ id: '', name: '', title: '', category: 'engineering', bio: '', picture: '', rateHourly: 50, skills: '' })}>Add Provider</GradientButton>
        </Box>
        {loadProv && <CardSkeleton count={4} type="table-row" />}
        {!loadProv && providers.length === 0 && <Typography sx={{ color: 'rgba(255,255,255,.3)', textAlign: 'center', py: 4, fontSize: 13 }}>No providers yet.</Typography>}
        {providers.map(p => (
          <Box key={p.id} sx={{ display: 'flex', alignItems: 'center', px: { xs: 2, sm: 2.5 }, py: 1.25, borderBottom: '1px solid rgba(255,255,255,.04)', '&:hover': { bgcolor: 'rgba(255,255,255,.02)' } }}>
            <Avatar src={p.picture || ''} sx={{ width: 36, height: 36, mr: 1.5, bgcolor: '#f59e0b', fontSize: 13, fontWeight: 700 }}>{p.name[0]}</Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{p.name}</Typography>
              <Typography sx={{ color: 'rgba(255,255,255,.35)', fontSize: 11 }}>{p.title} · {p.category} · ${p.rateHourly}/hr</Typography>
            </Box>
            <Tooltip title="Delete">
              <IconButton size="small" sx={{ color: '#ef4444' }} onClick={() => { if (confirm('Delete provider?')) exec(`mutation { adminDeleteProvider(id:"${p.id}") }`, {}); }}>
                <Trash2 size={14} />
              </IconButton>
            </Tooltip>
          </Box>
        ))}
      </Card>
      <Dialog open={!!provForm.name} onClose={() => setProvForm({...provForm, name: ''})} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: '#0d1a15', border: '1px solid rgba(255,255,255,.1)', borderRadius: 3, backgroundImage: 'linear-gradient(135deg, rgba(245,158,11,.05), transparent)' } }}>
        <DialogTitle sx={{ color: '#fff', fontSize: 18, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,.08)' }}>New Provider</DialogTitle>
        <DialogContent sx={{ pt: 3.5 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <TextField size="small" label="Name" value={provForm.name} onChange={e => setProvForm({...provForm, name: e.target.value})}
              sx={{ input: { color: '#fff' }, label: { color: 'rgba(255,255,255,.4)' }, '& fieldset': { borderColor: 'rgba(255,255,255,.12)' }, '&:hover fieldset': { borderColor: 'rgba(255,255,255,.25)' } }} />
            <TextField size="small" label="Title" value={provForm.title} onChange={e => setProvForm({...provForm, title: e.target.value})}
              sx={{ input: { color: '#fff' }, label: { color: 'rgba(255,255,255,.4)' }, '& fieldset': { borderColor: 'rgba(255,255,255,.12)' } }} />
            <TextField size="small" label="Rate $/hr" type="number" value={provForm.rateHourly} onChange={e => setProvForm({...provForm, rateHourly: +e.target.value})}
              sx={{ input: { color: '#fff' }, label: { color: 'rgba(255,255,255,.4)' }, '& fieldset': { borderColor: 'rgba(255,255,255,.12)' } }} />
            <Box>
              <input ref={provFileRef} type="file" accept="image/*" hidden onChange={async e => {
                const f = e.target.files?.[0]; if (!f) return;
                try { const r = await (await import('../../lib/api')).uploadFile(f, 'admin', 'provider'); setProvForm({...provForm, picture: r.document.url}); } catch { alert('Upload failed'); }
              }} />
              <GradientButton fullWidth variant="outline" size="sm" onClick={() => provFileRef.current?.click()}
                sx={{ fontSize: 11, color: provForm.picture ? '#22c55e' : 'rgba(255,255,255,.5)' }}>
                {provForm.picture ? 'Uploaded ✓' : 'Upload Picture'}
              </GradientButton>
              {provForm.picture && <Avatar src={provForm.picture} sx={{ width: 28, height: 28, mt: 0.5, mx: 'auto' }} />}
            </Box>
            <TextField select size="small" label="Category" value={provForm.category} onChange={e => setProvForm({...provForm, category: e.target.value})}
              sx={{ input: { color: '#fff' }, label: { color: 'rgba(255,255,255,.4)' }, '& fieldset': { borderColor: 'rgba(255,255,255,.12)' } }} SelectProps={{ native: true }}>
              {['engineering','design','marketing','legal','accounting','consulting','hr','media'].map(c => <option key={c} value={c}>{c}</option>)}
            </TextField>
            <TextField size="small" label="Skills (comma)" value={provForm.skills} onChange={e => setProvForm({...provForm, skills: e.target.value})}
              sx={{ input: { color: '#fff' }, label: { color: 'rgba(255,255,255,.4)' }, '& fieldset': { borderColor: 'rgba(255,255,255,.12)' } }} />
          </Box>
          <TextField fullWidth size="small" label="Bio" multiline minRows={2} value={provForm.bio} onChange={e => setProvForm({...provForm, bio: e.target.value})}
            sx={{ mt: 2, textarea: { color: '#fff' }, label: { color: 'rgba(255,255,255,.4)' }, '& fieldset': { borderColor: 'rgba(255,255,255,.12)' }, '&:hover fieldset': { borderColor: 'rgba(255,255,255,.25)' } }} />
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 0 }}>
          <GradientButton variant="ghost" size="sm" onClick={() => setProvForm({ id: '', name: '', title: '', category: 'engineering', bio: '', picture: '', rateHourly: 0, skills: '' })}>Cancel</GradientButton>
          <GradientButton variant="primary" size="sm" disabled={busy || !provForm.name} onClick={async () => {
            await exec(`mutation { adminUpsertProvider(name:"${provForm.name.replace(/"/g,'\\"')}",title:"${provForm.title.replace(/"/g,'\\"')}",category:"${provForm.category}",bio:"${provForm.bio.replace(/"/g,'\\"')}",picture:"${provForm.picture}",rateHourly:${provForm.rateHourly},skills:"${JSON.stringify(provForm.skills.split(',').map(s=>s.trim()))}") { id } }`, {});
            setProvForm({ id: '', name: '', title: '', category: 'engineering', bio: '', picture: '', rateHourly: 0, skills: '' });
          }}>Save</GradientButton>
        </DialogActions>
      </Dialog>
    </>
  );

  const renderBookings = () => (
    <Card sx={{ bgcolor: 'rgba(13, 26, 21, .8)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 3, overflow: 'hidden', backdropFilter: 'blur(12px)' }}>
      <Box sx={{ px: { xs: 2, sm: 2.5 }, py: 1.5, borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', gap: 1 }}>
        <ThumbsUp size={16} color="#f59e0b" />
        <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14, flex: 1 }}>Bookings <Typography component="span" sx={{ color: 'rgba(255,255,255,.3)', fontWeight: 400 }}>({bookings.length})</Typography></Typography>
      </Box>
      {bookings.length === 0 && <Typography sx={{ color: 'rgba(255,255,255,.3)', textAlign: 'center', py: 4, fontSize: 13 }}>No bookings yet.</Typography>}
      {bookings.map(b => {
        const isPending = b.status === 'pending';
        return (
          <Box key={b.id} sx={{ display: 'flex', alignItems: 'center', px: { xs: 2, sm: 2.5 }, py: 1.25, borderBottom: '1px solid rgba(255,255,255,.04)', '&:hover': { bgcolor: 'rgba(255,255,255,.02)' } }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{b.projectTitle}</Typography>
              <Typography sx={{ color: 'rgba(255,255,255,.35)', fontSize: 11 }}>{b.providerName} → {b.userName}</Typography>
            </Box>
            <StatusBadge status={b.status} />
            {isPending && (
              <Box sx={{ display: 'flex', gap: 0.25, ml: 1 }}>
                <Tooltip title="Approve">
                  <IconButton size="small" sx={{ color: '#34d399' }} onClick={() => exec(`mutation { adminUpdateBooking(bookingId:"${b.id}",status:"approved") { id } }`, {})}>
                    <CheckCircle size={16} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Reject">
                  <IconButton size="small" sx={{ color: '#ef4444' }} onClick={() => exec(`mutation { adminUpdateBooking(bookingId:"${b.id}",status:"rejected") { id } }`, {})}>
                    <XCircle size={16} />
                  </IconButton>
                </Tooltip>
              </Box>
            )}
          </Box>
        );
      })}
    </Card>
  );

  const renderBanking = () => (
    <Card sx={{ bgcolor: 'rgba(13, 26, 21, .8)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 3, overflow: 'hidden', backdropFilter: 'blur(12px)' }}>
      <Box sx={{ px: { xs: 2, sm: 2.5 }, py: 1.5, borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', gap: 1 }}>
        <Landmark size={16} color="#f59e0b" />
        <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14, flex: 1 }}>Bank Accounts <Typography component="span" sx={{ color: 'rgba(255,255,255,.3)', fontWeight: 400 }}>({bankAccounts.length})</Typography></Typography>
      </Box>
      {bankAccounts.length === 0 && <Typography sx={{ color: 'rgba(255,255,255,.3)', textAlign: 'center', py: 4, fontSize: 13 }}>No bank accounts submitted yet.</Typography>}
      <Box sx={{ overflow: 'auto' }}>
        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
          <Box component="thead">
            <Box component="tr" sx={{ borderBottom: '1px solid rgba(255,255,255,.04)' }}>
              {['Account Name', 'Bank', 'Type', 'Number', 'Currency', 'Status', 'Actions'].map(h => (
                <Box key={h} component="th" sx={{ textAlign: 'left', px: { xs: 1.5, sm: 2.5 }, py: 1.5, color: 'rgba(255,255,255,.3)', fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</Box>
              ))}
            </Box>
          </Box>
          <Box component="tbody">
            {bankAccounts.map(a => (
              <Box key={a.id} component="tr" sx={{ borderBottom: '1px solid rgba(255,255,255,.03)', '&:hover': { bgcolor: 'rgba(255,255,255,.02)' } }}>
                <Box component="td" sx={{ px: { xs: 1.5, sm: 2.5 }, py: 1.25 }}>
                  <Typography sx={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{a.accountName}</Typography>
                </Box>
                <Box component="td" sx={{ px: 2.5, py: 1.25 }}>
                  <Typography sx={{ color: 'rgba(255,255,255,.5)', fontSize: 12 }}>{a.bankName}</Typography>
                </Box>
                <Box component="td" sx={{ px: 2.5, py: 1.25 }}>
                  <Typography sx={{ color: 'rgba(255,255,255,.5)', fontSize: 12, textTransform: 'capitalize' }}>{a.accountType}</Typography>
                </Box>
                <Box component="td" sx={{ px: 2.5, py: 1.25 }}>
                  <Typography sx={{ color: 'rgba(255,255,255,.5)', fontSize: 12 }}>••••{a.accountNumber.slice(-4)}</Typography>
                </Box>
                <Box component="td" sx={{ px: 2.5, py: 1.25 }}>
                  <Typography sx={{ color: 'rgba(255,255,255,.5)', fontSize: 12 }}>{a.currency}</Typography>
                </Box>
                <Box component="td" sx={{ px: 2.5, py: 1.25 }}>
                  <StatusBadge status={a.status} />
                </Box>
                <Box component="td" sx={{ px: { xs: 1.5, sm: 2.5 }, py: 1.25 }}>
                  {a.status === 'pending' ? (
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="Approve">
                        <IconButton size="small" sx={{ color: '#34d399' }} onClick={() => exec(`mutation { approveBankAccount(id:"${a.id}") { id status } }`, {}).then(loadBankAccounts)}>
                          <CheckCircle size={16} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Reject">
                        <IconButton size="small" sx={{ color: '#ef4444' }} onClick={() => exec(`mutation { rejectBankAccount(id:"${a.id}") { id status } }`, {}).then(loadBankAccounts)}>
                          <XCircle size={16} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  ) : (
                    <Typography sx={{ color: 'rgba(255,255,255,.2)', fontSize: 11 }}>—</Typography>
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Card>
  );

  const renderRegistrations = () => (
    <Card sx={{ bgcolor: 'rgba(13, 26, 21, .8)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 3, overflow: 'hidden', backdropFilter: 'blur(12px)' }}>
      <Box sx={{ px: { xs: 2, sm: 2.5 }, py: 1.5, borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', gap: 1 }}>
        <FileText size={16} color="#f59e0b" />
        <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14, flex: 1 }}>Business Registrations <Typography component="span" sx={{ color: 'rgba(255,255,255,.3)', fontWeight: 400 }}>({registrations.length})</Typography></Typography>
      </Box>
      {registrations.length === 0 && <Typography sx={{ color: 'rgba(255,255,255,.3)', textAlign: 'center', py: 4, fontSize: 13 }}>No registrations submitted yet.</Typography>}
      <Box sx={{ overflow: 'auto' }}>
        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
          <Box component="thead">
            <Box component="tr" sx={{ borderBottom: '1px solid rgba(255,255,255,.04)' }}>
              {['Legal Name', 'Type', 'Owner', 'Email', 'Location', 'Status', 'Actions'].map(h => (
                <Box key={h} component="th" sx={{ textAlign: 'left', px: { xs: 1.5, sm: 2.5 }, py: 1.5, color: 'rgba(255,255,255,.3)', fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</Box>
              ))}
            </Box>
          </Box>
          <Box component="tbody">
            {registrations.map(r => (
              <Box key={r.id} component="tr" sx={{ borderBottom: '1px solid rgba(255,255,255,.03)', '&:hover': { bgcolor: 'rgba(255,255,255,.02)' } }}>
                <Box component="td" sx={{ px: { xs: 1.5, sm: 2.5 }, py: 1.25 }}>
                  <Typography sx={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{r.legalName}</Typography>
                </Box>
                <Box component="td" sx={{ px: 2.5, py: 1.25 }}>
                  <Chip label={r.registrationType} size="small" sx={{ bgcolor: 'rgba(139,92,246,.12)', color: '#a78bfa', fontSize: 10, fontWeight: 600 }} />
                </Box>
                <Box component="td" sx={{ px: 2.5, py: 1.25 }}>
                  <Typography sx={{ color: 'rgba(255,255,255,.6)', fontSize: 12 }}>{r.ownerName}</Typography>
                </Box>
                <Box component="td" sx={{ px: 2.5, py: 1.25 }}>
                  <Typography sx={{ color: 'rgba(255,255,255,.4)', fontSize: 12 }}>{r.ownerEmail}</Typography>
                </Box>
                <Box component="td" sx={{ px: 2.5, py: 1.25 }}>
                  <Typography sx={{ color: 'rgba(255,255,255,.4)', fontSize: 12 }}>{r.addressCity}, {r.addressCountry}</Typography>
                </Box>
                <Box component="td" sx={{ px: 2.5, py: 1.25 }}>
                  <StatusBadge status={r.status} />
                </Box>
                <Box component="td" sx={{ px: { xs: 1.5, sm: 2.5 }, py: 1.25 }}>
                  {r.status === 'pending' ? (
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="Approve">
                        <IconButton size="small" sx={{ color: '#34d399' }} onClick={async () => { await exec(`mutation { adminApproveRegistration(id:"${r.id}") { id status } }`, {}); loadRegistrations(); }}>
                          <CheckCircle size={16} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Reject">
                        <IconButton size="small" sx={{ color: '#ef4444' }} onClick={async () => { await exec(`mutation { adminRejectRegistration(id:"${r.id}") { id status } }`, {}); loadRegistrations(); }}>
                          <XCircle size={16} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  ) : (
                    <Typography sx={{ color: 'rgba(255,255,255,.2)', fontSize: 11 }}>—</Typography>
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Card>
  );

  const renderAdminInvoices = () => (
    <Card sx={{ bgcolor: 'rgba(13, 26, 21, .8)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 3, overflow: 'hidden', backdropFilter: 'blur(12px)' }}>
      <Box sx={{ px: { xs: 2, sm: 2.5 }, py: 1.5, borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', gap: 1 }}>
        <Receipt size={16} color="#f59e0b" />
        <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14, flex: 1 }}>Invoices <Typography component="span" sx={{ color: 'rgba(255,255,255,.3)', fontWeight: 400 }}>({adminInvoices.length})</Typography></Typography>
      </Box>
      {adminInvoices.length === 0 && <Typography sx={{ color: 'rgba(255,255,255,.3)', textAlign: 'center', py: 4, fontSize: 13 }}>No invoices yet.</Typography>}
      <Box sx={{ overflow: 'auto' }}>
        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
          <Box component="thead">
            <Box component="tr" sx={{ borderBottom: '1px solid rgba(255,255,255,.04)' }}>
              {['Invoice #', 'Customer', 'Amount', 'Due Date', 'Status', 'Actions'].map(h => (
                <Box key={h} component="th" sx={{ textAlign: 'left', px: { xs: 1.5, sm: 2.5 }, py: 1.5, color: 'rgba(255,255,255,.3)', fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</Box>
              ))}
            </Box>
          </Box>
          <Box component="tbody">
            {adminInvoices.map(inv => (
              <Box key={inv.id} component="tr" sx={{ borderBottom: '1px solid rgba(255,255,255,.03)', '&:hover': { bgcolor: 'rgba(255,255,255,.02)' } }}>
                <Box component="td" sx={{ px: { xs: 1.5, sm: 2.5 }, py: 1.25 }}>
                  <Typography sx={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{inv.invoiceNumber}</Typography>
                </Box>
                <Box component="td" sx={{ px: 2.5, py: 1.25 }}>
                  <Typography sx={{ color: 'rgba(255,255,255,.6)', fontSize: 12 }}>{inv.customerName}</Typography>
                </Box>
                <Box component="td" sx={{ px: 2.5, py: 1.25 }}>
                  <Typography sx={{ color: 'var(--vm-primary-400)', fontSize: 13, fontWeight: 700 }}>{inv.currency} {inv.amount?.toLocaleString()}</Typography>
                </Box>
                <Box component="td" sx={{ px: 2.5, py: 1.25 }}>
                  <Typography sx={{ color: 'rgba(255,255,255,.4)', fontSize: 12 }}>{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-GB') : '—'}</Typography>
                </Box>
                <Box component="td" sx={{ px: 2.5, py: 1.25 }}>
                  <StatusBadge status={inv.status} />
                </Box>
                <Box component="td" sx={{ px: { xs: 1.5, sm: 2.5 }, py: 1.25 }}>
                  <Box sx={{ display: 'flex', gap: 0.25 }}>
                    {['paid', 'sent', 'overdue', 'cancelled'].filter(s => s !== inv.status).slice(0, 2).map(s => (
                      <Chip key={s} size="small" label={s} onClick={async () => { await exec(`mutation { adminUpdateInvoiceStatus(id:"${inv.id}",status:"${s}") }`, {}); loadAdminInvoices(); }}
                        sx={{ fontSize: 9, bgcolor: s === 'paid' ? 'rgba(52,211,153,.15)' : s === 'cancelled' ? 'rgba(239,68,68,.15)' : 'rgba(255,255,255,.06)', color: s === 'paid' ? '#34d399' : s === 'cancelled' ? '#ef4444' : 'rgba(255,255,255,.5)', cursor: 'pointer', height: 20 }} />
                    ))}
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Card>
  );

  const renderFinancing = () => (
    <>
      <Card sx={{ bgcolor: 'rgba(13, 26, 21, .8)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 3, overflow: 'hidden', backdropFilter: 'blur(12px)', mb: 2 }}>
        <Box sx={{ px: { xs: 2, sm: 2.5 }, py: 1.5, borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <DollarSign size={16} color="#f59e0b" />
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14, flex: 1 }}>Financing Offers <Typography component="span" sx={{ color: 'rgba(255,255,255,.3)', fontWeight: 400 }}>({financingOffers.length})</Typography></Typography>
          <GradientButton variant="outline" size="sm" startIcon={<Plus size={12} />} onClick={() => setFinancingForm({ lenderName: '', productType: 'loan', minAmount: 0, maxAmount: 100000, minRate: 5, maxRate: 15, termMonths: 12, requirements: '[]' })}>Add Offer</GradientButton>
        </Box>
        {financingOffers.length === 0 && <Typography sx={{ color: 'rgba(255,255,255,.3)', textAlign: 'center', py: 4, fontSize: 13 }}>No financing offers yet.</Typography>}
        <Box sx={{ overflow: 'auto' }}>
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <Box component="thead">
              <Box component="tr" sx={{ borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                {['Lender', 'Type', 'Amount Range', 'Rate', 'Term', 'Status', 'Actions'].map(h => (
                  <Box key={h} component="th" sx={{ textAlign: 'left', px: { xs: 1.5, sm: 2.5 }, py: 1.5, color: 'rgba(255,255,255,.3)', fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {financingOffers.map(o => (
                <Box key={o.id} component="tr" sx={{ borderBottom: '1px solid rgba(255,255,255,.03)', '&:hover': { bgcolor: 'rgba(255,255,255,.02)' } }}>
                  <Box component="td" sx={{ px: { xs: 1.5, sm: 2.5 }, py: 1.25 }}>
                    <Typography sx={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{o.lenderName}</Typography>
                  </Box>
                  <Box component="td" sx={{ px: 2.5, py: 1.25 }}>
                    <Chip label={o.productType.replace('_', ' ')} size="small" sx={{ bgcolor: o.productType === 'loan' ? 'rgba(59,130,246,.12)' : 'rgba(139,92,246,.12)', color: o.productType === 'loan' ? '#3b82f6' : '#8b5cf6', fontSize: 10, fontWeight: 600, textTransform: 'capitalize' }} />
                  </Box>
                  <Box component="td" sx={{ px: 2.5, py: 1.25 }}>
                    <Typography sx={{ color: 'rgba(255,255,255,.6)', fontSize: 12 }}>${o.minAmount?.toLocaleString()} — ${o.maxAmount?.toLocaleString()}</Typography>
                  </Box>
                  <Box component="td" sx={{ px: 2.5, py: 1.25 }}>
                    <Typography sx={{ color: 'rgba(255,255,255,.6)', fontSize: 12 }}>{o.minRate}% — {o.maxRate}%</Typography>
                  </Box>
                  <Box component="td" sx={{ px: 2.5, py: 1.25 }}>
                    <Typography sx={{ color: 'rgba(255,255,255,.6)', fontSize: 12 }}>{o.termMonths} months</Typography>
                  </Box>
                  <Box component="td" sx={{ px: 2.5, py: 1.25 }}>
                    <StatusBadge status={o.isActive ? 'active' : 'inactive'} />
                  </Box>
                  <Box component="td" sx={{ px: { xs: 1.5, sm: 2.5 }, py: 1.25 }}>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="Edit">
                        <IconButton size="small" sx={{ color: '#f59e0b' }} onClick={() => setFinancingForm({ id: o.id, lenderName: o.lenderName, productType: o.productType, minAmount: o.minAmount, maxAmount: o.maxAmount, minRate: o.minRate, maxRate: o.maxRate, termMonths: o.termMonths, requirements: o.requirements })}>
                          <FileText size={14} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" sx={{ color: '#ef4444' }} onClick={() => { if (confirm('Delete this offer?')) exec(`mutation { adminDeleteFinancingOffer(id:"${o.id}") }`, {}).then(loadFinancingOffers); }}>
                          <Trash2 size={14} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Card>
      <Dialog open={!!financingForm.lenderName && !financingForm.lenderName.startsWith('__init')} onClose={() => setFinancingForm({ lenderName: '', productType: 'loan', minAmount: 0, maxAmount: 0, minRate: 0, maxRate: 0, termMonths: 12, requirements: '[]' })}
        maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: '#0d1a15', border: '1px solid rgba(255,255,255,.1)', borderRadius: 3 } }}>
        <DialogTitle sx={{ color: '#fff', fontSize: 18, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,.08)' }}>{financingForm.id ? 'Edit' : 'New'} Financing Offer</DialogTitle>
        <DialogContent sx={{ pt: 3.5 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <TextField size="small" label="Lender Name" value={financingForm.lenderName} onChange={e => setFinancingForm({ ...financingForm, lenderName: e.target.value })}
              sx={{ gridColumn: { xs: '1', sm: '1 / -1' }, input: { color: '#fff' }, label: { color: 'rgba(255,255,255,.4)' }, '& fieldset': { borderColor: 'rgba(255,255,255,.12)' } }} />
            <TextField select size="small" label="Product Type" value={financingForm.productType} onChange={e => setFinancingForm({ ...financingForm, productType: e.target.value })}
              sx={{ input: { color: '#fff' }, label: { color: 'rgba(255,255,255,.4)' }, '& fieldset': { borderColor: 'rgba(255,255,255,.12)' } }} SelectProps={{ native: true }}>
              {['loan', 'line_of_credit', 'term_loan'].map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </TextField>
            <TextField size="small" label="Min Amount" type="number" value={financingForm.minAmount} onChange={e => setFinancingForm({ ...financingForm, minAmount: parseFloat(e.target.value) || 0 })}
              sx={{ input: { color: '#fff' }, label: { color: 'rgba(255,255,255,.4)' }, '& fieldset': { borderColor: 'rgba(255,255,255,.12)' } }} />
            <TextField size="small" label="Max Amount" type="number" value={financingForm.maxAmount} onChange={e => setFinancingForm({ ...financingForm, maxAmount: parseFloat(e.target.value) || 0 })}
              sx={{ input: { color: '#fff' }, label: { color: 'rgba(255,255,255,.4)' }, '& fieldset': { borderColor: 'rgba(255,255,255,.12)' } }} />
            <TextField size="small" label="Min Rate %" type="number" value={financingForm.minRate} onChange={e => setFinancingForm({ ...financingForm, minRate: parseFloat(e.target.value) || 0 })}
              sx={{ input: { color: '#fff' }, label: { color: 'rgba(255,255,255,.4)' }, '& fieldset': { borderColor: 'rgba(255,255,255,.12)' } }} />
            <TextField size="small" label="Max Rate %" type="number" value={financingForm.maxRate} onChange={e => setFinancingForm({ ...financingForm, maxRate: parseFloat(e.target.value) || 0 })}
              sx={{ input: { color: '#fff' }, label: { color: 'rgba(255,255,255,.4)' }, '& fieldset': { borderColor: 'rgba(255,255,255,.12)' } }} />
            <TextField size="small" label="Term (months)" type="number" value={financingForm.termMonths} onChange={e => setFinancingForm({ ...financingForm, termMonths: parseInt(e.target.value as string) || 12 })}
              sx={{ input: { color: '#fff' }, label: { color: 'rgba(255,255,255,.4)' }, '& fieldset': { borderColor: 'rgba(255,255,255,.12)' } }} />
            <TextField size="small" label="Requirements (JSON array)" value={financingForm.requirements} onChange={e => setFinancingForm({ ...financingForm, requirements: e.target.value })}
              sx={{ gridColumn: { xs: '1', sm: '1 / -1' }, input: { color: '#fff' }, label: { color: 'rgba(255,255,255,.4)' }, '& fieldset': { borderColor: 'rgba(255,255,255,.12)' } }} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 0 }}>
          <GradientButton variant="ghost" size="sm" onClick={() => setFinancingForm({ lenderName: '', productType: 'loan', minAmount: 0, maxAmount: 0, minRate: 0, maxRate: 0, termMonths: 12, requirements: '[]' })}>Cancel</GradientButton>
          <GradientButton variant="primary" size="sm" disabled={busy || !financingForm.lenderName} onClick={async () => {
            if (financingForm.id) {
              await exec(`mutation { adminUpdateFinancingOffer(id:"${financingForm.id}",lenderName:"${financingForm.lenderName.replace(/"/g,'\\"')}",productType:"${financingForm.productType}",minAmount:${financingForm.minAmount},maxAmount:${financingForm.maxAmount},minRate:${financingForm.minRate},maxRate:${financingForm.maxRate},termMonths:${financingForm.termMonths},requirements:"${financingForm.requirements.replace(/"/g,'\\"')}",isActive:true) }`, {});
            } else {
              await exec(`mutation { adminCreateFinancingOffer(lenderName:"${financingForm.lenderName.replace(/"/g,'\\"')}",productType:"${financingForm.productType}",minAmount:${financingForm.minAmount},maxAmount:${financingForm.maxAmount},minRate:${financingForm.minRate},maxRate:${financingForm.maxRate},termMonths:${financingForm.termMonths},requirements:"${financingForm.requirements.replace(/"/g,'\\"')}") }`, {});
            }
            setFinancingForm({ lenderName: '', productType: 'loan', minAmount: 0, maxAmount: 0, minRate: 0, maxRate: 0, termMonths: 12, requirements: '[]' });
            loadFinancingOffers();
          }}>{busy ? <CircularProgress size={14} /> : financingForm.id ? 'Update' : 'Create'}</GradientButton>
        </DialogActions>
      </Dialog>
    </>
  );

  const renderSupport = () => (
    <Box sx={{ display: 'flex', gap: 2, height: { xs: 'auto', md: 'calc(100vh - 180px)' }, flexDirection: { xs: 'column', md: 'row' } }}>
      <Card sx={{ width: { xs: '100%', md: 340 }, flexShrink: 0, bgcolor: 'rgba(13, 26, 21, .8)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 3, overflow: 'hidden', display: 'flex', flexDirection: 'column', backdropFilter: 'blur(12px)', maxHeight: { xs: 300, md: 'none' } }}>
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', gap: 1 }}>
          <MessageCircle size={15} color="#f59e0b" />
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Sessions ({supportSessions.length})</Typography>
        </Box>
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {supportSessions.length === 0 && <Typography sx={{ color: 'rgba(255,255,255,.3)', textAlign: 'center', py: 4, fontSize: 13 }}>No sessions yet.</Typography>}
          {supportSessions.map(s => (
            <Box key={s.id} onClick={() => { setSelectedSession(s.id); loadSupportMessages(s.id); }}
              sx={{ px: 2, py: 1.25, cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,.04)', transition: 'all .15s ease',
                bgcolor: selectedSession === s.id ? 'rgba(245,158,11,.1)' : 'transparent',
                borderLeft: selectedSession === s.id ? '3px solid #f59e0b' : '3px solid transparent',
                '&:hover': { bgcolor: selectedSession === s.id ? 'rgba(245,158,11,.12)' : 'rgba(255,255,255,.02)' } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                <Typography sx={{ color: '#fff', fontSize: 13, fontWeight: 600, flex: 1 }}>{s.createdByName}</Typography>
                <StatusBadge status={s.status} />
              </Box>
              <Typography sx={{ color: 'rgba(255,255,255,.45)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.subject}</Typography>
              <Typography sx={{ color: 'rgba(255,255,255,.2)', fontSize: 10, mt: 0.25 }}>{s.createdByEmail} · {new Date(s.createdAt).toLocaleDateString()}</Typography>
            </Box>
          ))}
        </Box>
      </Card>
      <Card sx={{ flex: 1, bgcolor: 'rgba(13, 26, 21, .8)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 3, overflow: 'hidden', display: 'flex', flexDirection: 'column', backdropFilter: 'blur(12px)', minHeight: { xs: 300, md: 'auto' } }}>
        {!selectedSession ? (
          <Box sx={{ p: 6, textAlign: 'center', color: 'rgba(255,255,255,.25)' }}>
            <MessageCircle size={48} />
            <Typography sx={{ mt: 1.5, fontSize: 14 }}>Select a session to view messages</Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(255,255,255,.06)' }}>
              <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Messages</Typography>
            </Box>
            <Box sx={{ flex: 1, overflow: 'auto', p: 1.5 }}>
              {supportMessages.map(m => (
                <Box key={m.id} sx={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', mb: 1.5 }}>
                  <Box sx={{ maxWidth: '80%', p: 1.25, borderRadius: 2.5, fontSize: 13, lineHeight: 1.55, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere',
                    bgcolor: m.role === 'user' ? '#f59e0b' : 'rgba(255,255,255,.06)',
                    color: m.role === 'user' ? '#000' : 'rgba(255,255,255,.87)',
                  }}>{m.content}</Box>
                </Box>
              ))}
              {supportMessages.length === 0 && <Typography sx={{ color: 'rgba(255,255,255,.3)', textAlign: 'center', py: 4, fontSize: 13 }}>No messages in this session.</Typography>}
            </Box>
          </>
        )}
      </Card>
    </Box>
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
      case 'support': return renderSupport();
      case 'banking': return renderBanking();
      case 'registrations': return renderRegistrations();
      case 'invoices': return renderAdminInvoices();
      case 'financing': return renderFinancing();
      case 'ai-usage': return <AdminAiUsage />;
      default: return null;
    }
  };

  if (!user?.isAdmin) return null;

  const titles: Record<AdminView, string> = {
    dashboard: 'Overview', users: 'Users', businesses: 'Businesses', plans: 'Plans',
    investors: 'Investors', providers: 'Providers', bookings: 'Bookings',
    submissions: 'Leads', broadcast: 'Broadcast', support: 'Support', banking: 'Banking', registrations: 'Registrations', invoices: 'Invoices',     financing: 'Financing',
    'ai-usage': 'AI Usage',
  };
  const subtitles: Record<AdminView, string> = {
    dashboard: 'Platform performance at a glance',
    users: 'Manage user accounts and permissions',
    businesses: 'Startup profiles registered on the platform',
    plans: 'Subscription tiers and user distribution',
    investors: 'Investment network partners',
    providers: 'Service provider directory',
    bookings: 'Provider appointment bookings',
    submissions: 'Contact form inquiries',
    broadcast: 'Send push notifications to all users',
    support: 'AI support chat sessions and escalations',
    banking: 'User-submitted bank accounts for approval',
    registrations: 'Business registration submissions from users',
    invoices: 'All invoices across all businesses',
    financing: 'Financing offers shown to users',
    'ai-usage': 'AI token usage and provider interactions',
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#050f0a', position: 'relative' }}>
      {isMobile ? (
        <Drawer open={mobileNavOpen} onClose={() => setMobileNavOpen(false)}
          sx={{ '& .MuiDrawer-paper': { width: 260, bgcolor: 'transparent', border: 'none' } }}>
          <NavSidebar />
        </Drawer>
      ) : (
        <NavSidebar />
      )}

      <Box sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        height: '100vh',
        overflow: 'auto',
        position: 'relative',
      }}>
        <Box sx={{
          px: { xs: 2, sm: 3, md: 4 },
          py: { xs: 2, sm: 3 },
          flex: 1,
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'fixed',
            top: 0, right: 0,
            width: 400, height: 400,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(245,158,11,.03) 0%, transparent 70%)',
            pointerEvents: 'none',
            transform: 'translate(100px, -200px)',
          },
        }}>
          <PageHeader title={titles[view]} subtitle={subtitles[view]} />
          {busy && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, px: { xs: 5, sm: 0 } }}>
              <CircularProgress size={12} sx={{ color: '#f59e0b' }} />
              <Typography sx={{ color: '#f59e0b', fontSize: 11, fontWeight: 600 }}>Processing...</Typography>
            </Box>
          )}
          {renderContent()}
        </Box>
      </Box>
    </Box>
  );
}
