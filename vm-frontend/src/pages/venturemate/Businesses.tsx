import { useCallback, useEffect, useState } from 'react';
import { Box, Typography, Card, Chip, IconButton, Menu, MenuItem } from '@mui/material';
import { Plus, MoreVertical, FileCheck } from 'lucide-react';
import { CreateBusinessModal } from '../../components/venturemate/CreateBusinessModal';
import { RegisterBusinessModal } from '../../components/venturemate/RegisterBusinessModal';
import type { ViewType, Business } from '../../types/venturemate';
import { graphqlRequest } from '../../lib/api';
import { useBusiness } from '../../contexts/BusinessContext';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useToast } from '../../components/shared/toast';

interface BusinessRegistrationStatus {
  id: string;
  businessId: string;
  status: string;
  registrationType: string;
  createdAt: string;
}

const REGISTRATIONS_QUERY = `
  query BusinessRegistrations($businessId: ID!, $status: String) {
    businessRegistrations(businessId: $businessId, status: $status) {
      id, businessId, status, registrationType, createdAt
    }
  }
`;

interface BusinessesProps {
  onViewChange: (view: ViewType) => void;
}

export function Businesses({ onViewChange }: BusinessesProps) {
  const { businesses: businessList, setSelectedBusinessId, addBusiness } = useBusiness();
  const { subscription } = useSubscription();
  const toast = useToast();
  const { format } = useCurrency();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [, setSelectedBusiness] = useState<Business | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [registrations, setRegistrations] = useState<Record<string, BusinessRegistrationStatus>>({});

  const maxBusinesses = subscription?.plan?.limits?.maxBusinesses;
  const limitReached = maxBusinesses !== -1 && businessList.length >= (maxBusinesses ?? Infinity);

  const handleCreateClick = () => {
    if (limitReached) {
      toast.warning('Upgrade required', {
        description: `You've reached the maximum of ${maxBusinesses} businesses on your ${subscription?.plan?.displayName || subscription?.plan?.name || 'current'} plan. Upgrade to add more.`,
      });
      return;
    }
    setCreateModalOpen(true);
  };

  const fetchRegistrations = useCallback(() => {
    if (businessList.length === 0) return;
    (async () => {
      try {
        const results = await Promise.all(
          businessList.map(b =>
            graphqlRequest<{ businessRegistrations: BusinessRegistrationStatus[] }>(REGISTRATIONS_QUERY, {
              businessId: b.id,
            }).catch(() => ({ businessRegistrations: [] }))
          )
        );
        const map: Record<string, BusinessRegistrationStatus> = {};
        results.forEach((res, idx) => {
          if (res.businessRegistrations.length > 0) {
            map[businessList[idx].id] = res.businessRegistrations[0];
          }
        });
        setRegistrations(map);
      } catch {
        // silently fail
      }
    })();
  }, [businessList]);

  useEffect(() => { fetchRegistrations(); }, [fetchRegistrations]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, business: Business) => {
    setAnchorEl(event.currentTarget);
    setSelectedBusiness(business);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedBusiness(null);
  };

  const stageColors: Record<string, string> = {
    idea: '#6b7280',
    mvp: '#f59e0b',
    beta: '#3b82f6',
    launched: '#10b981',
    scaling: '#8b5cf6',
    profitable: '#059669',
  };

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', mb: 4, gap: { xs: 2, sm: 0 } }}>
        <Box>
          <Typography sx={{ fontSize: { xs: 22, sm: 28 }, fontWeight: 700, color: 'var(--vm-text-primary)', mb: 1 }}>
            My Businesses
          </Typography>
          <Typography sx={{ fontSize: { xs: 13, sm: 15, md: 16 }, color: 'var(--vm-text-muted)' }}>
            Manage all your startups in one place
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1, sm: 2 }, width: { xs: '100%', sm: 'auto' } }}>
          <Box
            component="button"
            onClick={() => setRegisterModalOpen(true)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              py: 1.5,
              px: 3,
              borderRadius: 2,
              border: '1px solid var(--vm-border-primary)',
              bgcolor: 'transparent',
              color: 'var(--vm-text-primary)',
              fontSize: { xs: 13, sm: 14 },
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': { 
                bgcolor: 'var(--vm-bg-hover)',
                borderColor: 'var(--vm-primary-600)',
              },
            }}
          >
            <FileCheck size={16} />
            Register
          </Box>
          <Box
            component="button"
            onClick={handleCreateClick}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              py: 1.5,
              px: 3,
              borderRadius: 2,
              border: 'none',
              bgcolor: 'var(--vm-primary-600)',
              color: 'white',
              fontSize: { xs: 13, sm: 14 },
              fontWeight: 600,
              cursor: limitReached ? 'not-allowed' : 'pointer',
              opacity: limitReached ? 0.5 : 1,
              transition: 'all 0.2s',
              '&:hover': limitReached ? {} : { bgcolor: 'var(--vm-primary-500)' },
            }}
          >
            <Plus size={16} />
            {limitReached ? 'Limit Reached' : 'Create'}
          </Box>
        </Box>
      </Box>

      {/* Stats */}
      {(() => {
        // Aggregate per-currency revenue across all businesses
        const allRevenue: Record<string, number> = {};
        businessList.forEach(b => {
          try {
            const byCur = JSON.parse(b.revenueByCurrency || '{}');
            Object.entries(byCur).forEach(([c, amt]) => {
              allRevenue[c] = (allRevenue[c] || 0) + (amt as number);
            });
          } catch { /* ignore */ }
        });
        const revenueEntries = Object.entries(allRevenue);

        return (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: '24px', mb: 4 }}>
            <div>
              <Card sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, p: 3 }}>
                <Typography sx={{ fontSize: { xs: 20, sm: 24 }, fontWeight: 700, color: 'var(--vm-text-primary)' }}>{businessList.length}</Typography>
                <Typography sx={{ fontSize: { xs: 12, sm: 13 }, color: 'var(--vm-text-muted)' }}>Total Businesses</Typography>
              </Card>
            </div>
            <div>
              <Card sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, p: 3 }}>
                <Typography sx={{ fontSize: { xs: 20, sm: 24 }, fontWeight: 700, color: 'var(--vm-text-primary)' }}>
                  {format(businessList.reduce((acc, b) => acc + (b.financials?.fundingRaised ?? 0), 0) / 1000000)}
                </Typography>
                <Typography sx={{ fontSize: { xs: 12, sm: 13 }, color: 'var(--vm-text-muted)' }}>Total Funding Raised</Typography>
              </Card>
            </div>
            <div>
              <Card sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, p: 3 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#22c55e', mb: 1 }}>Total Revenue</Typography>
                {revenueEntries.length > 0 ? revenueEntries.map(([c, amt]) => (
                  <Typography key={c} sx={{ fontSize: 12, color: 'var(--vm-text-primary)', lineHeight: 1.5 }}>
                    {c} {amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>
                )) : <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>—</Typography>}
              </Card>
            </div>
            <div>
              <Card sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, p: 3 }}>
                <Typography sx={{ fontSize: { xs: 20, sm: 24 }, fontWeight: 700, color: 'var(--vm-text-primary)' }}>
                  {businessList.reduce((acc, b) => acc + (b.team?.length ?? 0), 0)}
                </Typography>
                <Typography sx={{ fontSize: { xs: 12, sm: 13 }, color: 'var(--vm-text-muted)' }}>Team Members</Typography>
              </Card>
            </div>
          </Box>
        );
      })()}

      {/* Businesses Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: '24px' }}>
        {businessList.map((business) => (
          <div key={business.id}>
            <Card
              sx={{
                bgcolor: 'var(--vm-bg-secondary)',
                border: '1px solid var(--vm-border-subtle)',
                borderRadius: 3,
                p: 3,
                transition: 'all 0.3s',
                cursor: 'pointer',
                '&:hover': {
                  borderColor: 'var(--vm-border-secondary)',
                  transform: 'translateY(-2px)',
                },
              }}
              onClick={() => {
                setSelectedBusinessId(business.id);
                onViewChange('business-overview');
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 2.5,
                      background: `linear-gradient(135deg, ${business.brandKit.primaryColor} 0%, ${business.brandKit.secondaryColor} 100%)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography sx={{ fontSize: 24, fontWeight: 700, color: 'white' }}>
                      {business.name[0]}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: 18, fontWeight: 700, color: 'var(--vm-text-primary)' }}>
                      {business.name}
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)' }}>
                      {business.industry}
                    </Typography>
                  </Box>
                </Box>
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMenuOpen(e, business);
                  }}
                  sx={{ color: 'var(--vm-text-muted)' }}
                >
                  <MoreVertical size={18} />
                </IconButton>
              </Box>

              <Typography sx={{ fontSize: 14, color: 'var(--vm-text-secondary)', mb: 3, lineHeight: 1.6 }}>
                {business.tagline}
              </Typography>

              <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap', maxWidth: '100%' }}>
                <Chip
                  size="small"
                  label={business.stage.toUpperCase()}
                  sx={{
                    bgcolor: `${stageColors[business.stage]}20`,
                    color: stageColors[business.stage],
                    fontWeight: 600,
                    fontSize: 10,
                    '& .MuiChip-label': { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', py: 0.5 },
                    maxWidth: '100%',
                  }}
                />
                <Chip
                  size="small"
                  label={business.status.toUpperCase()}
                  sx={{
                    bgcolor: business.status === 'active' ? 'rgba(34, 197, 94, 0.2)' : 'var(--vm-bg-tertiary)',
                    color: business.status === 'active' ? '#4ade80' : 'var(--vm-text-muted)',
                    fontWeight: 600,
                    fontSize: 10,
                    '& .MuiChip-label': { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', py: 0.5 },
                    maxWidth: '100%',
                  }}
                />
                {registrations[business.id] && (
                  <Chip
                    size="small"
                    label={registrations[business.id].status === 'approved' ? 'REGISTERED' : registrations[business.id].status.toUpperCase()}
                    sx={{
                      bgcolor: registrations[business.id].status === 'approved' ? 'rgba(59, 130, 246, 0.2)' : registrations[business.id].status === 'pending' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      color: registrations[business.id].status === 'approved' ? '#60a5fa' : registrations[business.id].status === 'pending' ? '#f59e0b' : '#ef4444',
                      fontWeight: 600,
                      fontSize: 10,
                      '& .MuiChip-label': { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', py: 0.5 },
                      maxWidth: '100%',
                    }}
                  />
                )}
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(100px, 1fr)', gap: 1.5, mb: 2 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(16,185,129,.06)', border: '1px solid rgba(16,185,129,.12)' }}>
                  <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#10b981', mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.3 }}>Revenue</Typography>
                  {(() => {
                    const byCurrency = JSON.parse(business.revenueByCurrency || '{}');
                    const entries = Object.entries(byCurrency) as [string, number][];
                    return entries.length > 0 ? entries.slice(0, 3).map(([c, amt]) => (
                      <Typography key={c} sx={{ fontSize: 12, fontWeight: 600, color: 'var(--vm-text-primary)', lineHeight: 1.5 }}>
                        {c} {amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Typography>
                    )) : <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>—</Typography>;
                  })()}
                </Box>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(139,92,246,.06)', border: '1px solid rgba(139,92,246,.12)' }}>
                  <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#8b5cf6', mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.3 }}>Team</Typography>
                  <Typography sx={{ fontSize: 18, fontWeight: 800, color: 'var(--vm-text-primary)' }}>{business.team?.length ?? 0}</Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
                <Box
                  component="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedBusinessId(business.id);
                    onViewChange('pitch-deck');
                  }}
                  sx={{
                    flex: 1,
                    py: 1,
                    px: 1,
                    borderRadius: 1.5,
                    border: '1px solid var(--vm-border-primary)',
                    bgcolor: 'transparent',
                    color: 'var(--vm-text-secondary)',
                    fontSize: { xs: 11, sm: 12 },
                    fontWeight: 500,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'var(--vm-bg-hover)' },
                  }}
                >
                  Pitch Deck
                </Box>
                <Box
                  component="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedBusinessId(business.id);
                    onViewChange('milestones');
                  }}
                  sx={{
                    flex: 1,
                    py: 1,
                    px: 1,
                    borderRadius: 1.5,
                    border: '1px solid var(--vm-border-primary)',
                    bgcolor: 'transparent',
                    color: 'var(--vm-text-secondary)',
                    fontSize: { xs: 11, sm: 12 },
                    fontWeight: 500,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'var(--vm-bg-hover)' },
                  }}
                >
                  Milestones
                </Box>
                <Box
                  component="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedBusinessId(business.id);
                    onViewChange('website-builder');
                  }}
                  sx={{
                    flex: 1,
                    py: 1,
                    px: 1,
                    borderRadius: 1.5,
                    border: '1px solid var(--vm-border-primary)',
                    bgcolor: 'transparent',
                    color: 'var(--vm-text-secondary)',
                    fontSize: { xs: 11, sm: 12 },
                    fontWeight: 500,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'var(--vm-bg-hover)' },
                  }}
                >
                  Website
                </Box>
              </Box>
            </Card>
          </div>
        ))}
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            bgcolor: 'var(--vm-bg-secondary)',
            border: '1px solid var(--vm-border-subtle)',
            borderRadius: 2,
          },
        }}
      >
        <MenuItem onClick={handleMenuClose} sx={{ color: 'var(--vm-text-primary)', fontSize: 14 }}>
          Edit Business
        </MenuItem>
        <MenuItem onClick={handleMenuClose} sx={{ color: 'var(--vm-text-primary)', fontSize: 14 }}>
          Duplicate
        </MenuItem>
        <MenuItem onClick={handleMenuClose} sx={{ color: '#ef4444', fontSize: 14 }}>
          Archive
        </MenuItem>
      </Menu>

      <CreateBusinessModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreate={async (newBusiness) => {
          await addBusiness(newBusiness);
        }}
      />

      <RegisterBusinessModal
        open={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        businesses={businessList}
        onRegistrationComplete={() => {
          setRegisterModalOpen(false);
          fetchRegistrations();
        }}
      />
    </Box>
  );
}
