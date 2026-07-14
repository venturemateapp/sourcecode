import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, Chip, CircularProgress, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { Building2, Shield, Users, Activity, LogOut } from 'lucide-react';
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

export function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => { void load(); }, [load]);

  if (!user?.isAdmin) return null;

  return (
    <Box sx={{ p: { xs: 1.25, sm: 2, md: 3 }, minHeight: '100vh', bgcolor: '#0a0f0d' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <Shield size={22} color="var(--vm-primary-400)" />
        <Typography sx={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>Admin Dashboard</Typography>
        <Chip icon={<Users size={13} />} label={user.email} size="small" sx={{ color: 'rgba(255,255,255,.7)' }} />
        <Chip label="Admin" size="small" color="warning" />
        <Chip icon={<LogOut size={13} />} label="Logout" size="small" clickable onClick={logout} sx={{ ml: 'auto', cursor: 'pointer' }} />
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'rgba(255,255,255,.5)' }}><CircularProgress size={16} /><Typography>Loading...</Typography></Box>
      ) : data ? (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
            <Card sx={{ p: 3, bgcolor: '#0d1a15', border: '1px solid rgba(255,255,255,.08)', borderRadius: 3 }}>
              <Users size={24} color="var(--vm-primary-400)" />
              <Typography sx={{ fontSize: 36, fontWeight: 900, color: '#fff', mt: 1 }}>{data.totalUsers}</Typography>
              <Typography sx={{ color: 'rgba(255,255,255,.5)', fontSize: 13 }}>Total Users</Typography>
            </Card>
            <Card sx={{ p: 3, bgcolor: '#0d1a15', border: '1px solid rgba(255,255,255,.08)', borderRadius: 3 }}>
              <Activity size={24} color="#34d399" />
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
      ) : (
        <Typography sx={{ color: 'rgba(255,255,255,.5)' }}>Could not load dashboard data.</Typography>
      )}
    </Box>
  );
}
