import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Box, Card, Chip, CircularProgress, Typography } from '@mui/material';
import { Activity, BarChart3, Building2, ChevronRight, LogOut, Shield, Users, UserCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { graphqlRequest } from '../../lib/api';

interface AdminDashboardData {
  totalUsers: number;
  activeUsers: number;
  totalBusinesses: number;
  plansBreakdown: Array<{ planName: string; count: number }>;
  recentSignups: Array<{ id: string; firstName: string; surname: string; email: string; status: string; isAdmin: boolean; createdAt: string }>;
}

const ADMIN_DASHBOARD_QUERY = `
  query { adminDashboard { totalUsers activeUsers totalBusinesses plansBreakdown { planName count } recentSignups { id firstName surname email status isAdmin createdAt } } }
`;

type AdminView = 'dashboard' | 'users' | 'businesses';

const NAV_ITEMS: Array<{ key: AdminView; icon: typeof Shield; label: string }> = [
  { key: 'dashboard', icon: BarChart3, label: 'Dashboard' },
  { key: 'users', icon: Users, label: 'Users' },
  { key: 'businesses', icon: Building2, label: 'Businesses' },
];

export function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<AdminView>('dashboard');
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState<AdminDashboardData['recentSignups']>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  useEffect(() => {
    if (!user?.isAdmin) {
      navigate('/vm', { replace: true });
      return;
    }
  }, [user, navigate]);

  const load = useCallback(async () => {
    try {
      const d = await graphqlRequest<{ adminDashboard: AdminDashboardData }>(ADMIN_DASHBOARD_QUERY);
      setData(d.adminDashboard);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const d = await graphqlRequest<{ adminUsers: AdminDashboardData['recentSignups'] }>(
        `query { adminUsers { id firstName surname email status isAdmin createdAt } }`
      );
      setAllUsers(d.adminUsers);
    } catch {
      // ignore
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (view === 'users') void loadUsers(); }, [view, loadUsers]);

  if (!user?.isAdmin) return null;

  const renderContent = () => {
    if (view === 'dashboard') {
      if (loading) return <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'rgba(255,255,255,.5)' }}><CircularProgress size={16} /><Typography>Loading...</Typography></Box>;
      if (!data) return <Typography sx={{ color: 'rgba(255,255,255,.5)' }}>Could not load dashboard data.</Typography>;
      return (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
            <Card sx={{ p: 3, bgcolor: '#0d1a15', border: '1px solid rgba(255,255,255,.08)', borderRadius: 3 }}>
              <Users size={24} color="var(--vm-primary-400)" />
              <Typography sx={{ fontSize: 36, fontWeight: 900, color: '#fff', mt: 1 }}>{data.totalUsers}</Typography>
              <Typography sx={{ color: 'rgba(255,255,255,.5)', fontSize: 13 }}>Total Users</Typography>
            </Card>
            <Card sx={{ p: 3, bgcolor: '#0d1a15', border: '1px solid rgba(255,255,255,.08)', borderRadius: 3 }}>
              <UserCheck size={24} color="#34d399" />
              <Typography sx={{ fontSize: 36, fontWeight: 900, color: '#fff', mt: 1 }}>{data.activeUsers}</Typography>
              <Typography sx={{ color: 'rgba(255,255,255,.5)', fontSize: 13 }}>Active Users</Typography>
            </Card>
            <Card sx={{ p: 3, bgcolor: '#0d1a15', border: '1px solid rgba(255,255,255,.08)', borderRadius: 3 }}>
              <Building2 size={24} color="#f59e0b" />
              <Typography sx={{ fontSize: 36, fontWeight: 900, color: '#fff', mt: 1 }}>{data.totalBusinesses}</Typography>
              <Typography sx={{ color: 'rgba(255,255,255,.5)', fontSize: 13 }}>Total Businesses</Typography>
            </Card>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 3 }}>
            <Card sx={{ p: 2.5, bgcolor: '#0d1a15', border: '1px solid rgba(255,255,255,.08)', borderRadius: 3 }}>
              <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 15, mb: 1.5 }}>Subscription Plans</Typography>
              {data.plansBreakdown.map(p => (
                <Box key={p.planName} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75, borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                  <Typography sx={{ color: 'rgba(255,255,255,.7)', fontSize: 13, textTransform: 'capitalize' }}>{p.planName}</Typography>
                  <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>{p.count}</Typography>
                </Box>
              ))}
            </Card>
            <Card sx={{ p: 2.5, bgcolor: '#0d1a15', border: '1px solid rgba(255,255,255,.08)', borderRadius: 3 }}>
              <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 15, mb: 1.5 }}>Recent Signups</Typography>
              {data.recentSignups.map(u => (
                <Box key={u.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                  <Box>
                    <Typography sx={{ color: '#fff', fontSize: 13 }}>{u.firstName} {u.surname}</Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,.4)', fontSize: 11 }}>{u.email}</Typography>
                  </Box>
                  <Chip label={u.status} size="small" sx={{ fontSize: 10, color: u.status === 'active' ? '#34d399' : '#f59e0b' }} />
                </Box>
              ))}
            </Card>
          </Box>
        </>
      );
    }

    if (view === 'users') {
      return (
        <Card sx={{ bgcolor: '#0d1a15', border: '1px solid rgba(255,255,255,.08)', borderRadius: 3, overflow: 'hidden' }}>
          <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid rgba(255,255,255,.08)' }}>
            <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>All Users</Typography>
          </Box>
          {usersLoading ? (
            <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 1, color: 'rgba(255,255,255,.5)' }}><CircularProgress size={16} /><Typography>Loading...</Typography></Box>
          ) : (
            allUsers.map(u => (
              <Box key={u.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2.5, py: 1.25, borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                <Box>
                  <Typography sx={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>{u.firstName} {u.surname}</Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,.4)', fontSize: 12 }}>{u.email}</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.75 }}>
                  {u.isAdmin && <Chip label="Admin" size="small" color="warning" sx={{ fontSize: 10 }} />}
                  <Chip label={u.status} size="small" sx={{ fontSize: 10, color: u.status === 'active' ? '#34d399' : '#f59e0b' }} />
                </Box>
              </Box>
            ))
          )}
        </Card>
      );
    }

    if (view === 'businesses') {
      return (
        <Card sx={{ bgcolor: '#0d1a15', border: '1px solid rgba(255,255,255,.08)', borderRadius: 3, p: 3 }}>
          <Typography sx={{ color: '#fff', fontSize: 15, fontWeight: 700, mb: 1 }}>All Businesses</Typography>
          <Typography sx={{ color: 'rgba(255,255,255,.5)', fontSize: 13 }}>Total: {data?.totalBusinesses || 0} businesses across the platform.</Typography>
        </Card>
      );
    }
    return null;
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#0a0f0d' }}>
      {/* Admin Sidebar */}
      <Box sx={{ width: 240, flexShrink: 0, bgcolor: '#07130f', borderRight: '1px solid rgba(255,255,255,.06)', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ p: 2.5, borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Shield size={22} color="#f59e0b" />
          <Box>
            <Typography sx={{ color: '#fff', fontSize: 15, fontWeight: 800, lineHeight: 1.2 }}>Admin</Typography>
            <Typography sx={{ color: 'rgba(255,255,255,.4)', fontSize: 10 }}>{user.email}</Typography>
          </Box>
        </Box>

        <Box sx={{ flex: 1, py: 1 }}>
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const active = view === item.key;
            return (
              <Box key={item.key} onClick={() => setView(item.key)}
                sx={{ px: 2.5, py: 1.25, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1.5,
                  bgcolor: active ? 'rgba(245,158,11,.1)' : 'transparent',
                  borderRight: active ? '2px solid #f59e0b' : '2px solid transparent',
                  '&:hover': { bgcolor: 'rgba(255,255,255,.03)' } }}>
                <Icon size={17} color={active ? '#f59e0b' : 'rgba(255,255,255,.5)'} />
                <Typography sx={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? '#f59e0b' : 'rgba(255,255,255,.7)' }}>
                  {item.label}
                </Typography>
                {active && <ChevronRight size={14} color="#f59e0b" style={{ marginLeft: 'auto' }} />}
              </Box>
            );
          })}
        </Box>

        <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,.06)', cursor: 'pointer' }} onClick={() => { logout(); navigate('/vm/auth/signin'); }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <LogOut size={16} color="rgba(255,255,255,.5)" />
            <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,.5)' }}>Log out</Typography>
          </Box>
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, p: { xs: 2, sm: 3, md: 4 }, overflow: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Typography sx={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>
            {view === 'dashboard' ? 'Overview' : view === 'users' ? 'Users' : 'Businesses'}
          </Typography>
          <Chip label="Admin" size="small" color="warning" />
        </Box>
        {renderContent()}
      </Box>
    </Box>
  );
}
