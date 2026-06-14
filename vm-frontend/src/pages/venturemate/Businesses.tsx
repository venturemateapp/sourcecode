import { useState } from 'react';
import { Box, Typography, Card, Chip, IconButton, Menu, MenuItem } from '@mui/material';
import { Plus, MoreVertical, FileCheck } from 'lucide-react';
import { CreateBusinessModal } from '../../components/venturemate/CreateBusinessModal';
import { RegisterBusinessModal, type RegistrationData } from '../../components/venturemate/RegisterBusinessModal';
import type { ViewType, Business } from '../../types/venturemate';
import { useBusiness } from '../../contexts/BusinessContext';
import { DomainChat } from '../../components/venturemate/DomainChat';

interface BusinessesProps {
  onViewChange: (view: ViewType) => void;
}

export function Businesses({ onViewChange }: BusinessesProps) {
  const { businesses: businessList, setSelectedBusinessId, addBusiness } = useBusiness();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [, setSelectedBusiness] = useState<Business | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);

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
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
        <Box>
          <Typography sx={{ fontSize: { xs: 22, sm: 28 }, fontWeight: 700, color: 'var(--vm-text-primary)', mb: 1 }}>
            My Businesses
          </Typography>
          <Typography sx={{ fontSize: { xs: 13, sm: 15, md: 16 }, color: 'var(--vm-text-muted)' }}>
            Manage all your startups in one place
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Box
            component="button"
            onClick={() => setRegisterModalOpen(true)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              py: 1.5,
              px: 3,
              borderRadius: 2,
              border: '1px solid var(--vm-border-primary)',
              bgcolor: 'transparent',
              color: 'var(--vm-text-primary)',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': { 
                bgcolor: 'var(--vm-bg-hover)',
                borderColor: 'var(--vm-primary-600)',
              },
            }}
          >
            <FileCheck size={18} />
            Register Business
          </Box>
          <Box
            component="button"
            onClick={() => setCreateModalOpen(true)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              py: 1.5,
              px: 3,
              borderRadius: 2,
              border: 'none',
              bgcolor: 'var(--vm-primary-600)',
              color: 'white',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': { bgcolor: 'var(--vm-primary-500)' },
            }}
          >
            <Plus size={18} />
            Create New Business
          </Box>
        </Box>
      </Box>

      {/* Stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: '24px', mb: 4 }}>
        {[
          { label: 'Total Businesses', value: businessList.length },
          { label: 'Total Funding Raised', value: `$${(businessList.reduce((acc, b) => acc + b.financials.fundingRaised, 0) / 1000000).toFixed(1)}M` },
          { label: 'Combined MRR', value: `$${businessList.reduce((acc, b) => acc + b.financials.revenue.currentMRR, 0).toLocaleString()}` },
          { label: 'Team Members', value: businessList.reduce((acc, b) => acc + b.team.length, 0) },
        ].map((stat) => (
          <div key={stat.label}>
            <Card
              sx={{
                bgcolor: 'var(--vm-bg-secondary)',
                border: '1px solid var(--vm-border-subtle)',
                borderRadius: 3,
                p: 3,
              }}
            >
              <Typography sx={{ fontSize: 24, fontWeight: 700, color: 'var(--vm-text-primary)' }}>
                {stat.value}
              </Typography>
              <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)' }}>
                {stat.label}
              </Typography>
            </Card>
          </div>
        ))}
      </Box>

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

              <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
                <Chip
                  size="small"
                  label={business.stage.toUpperCase()}
                  sx={{
                    bgcolor: `${stageColors[business.stage]}20`,
                    color: stageColors[business.stage],
                    fontWeight: 600,
                    fontSize: 10,
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
                  }}
                />
              </Box>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <div style={{ textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 16, fontWeight: 700, color: 'var(--vm-text-primary)' }}>
                    ${business.financials.revenue.currentMRR.toLocaleString()}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)' }}>MRR</Typography>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 16, fontWeight: 700, color: 'var(--vm-text-primary)' }}>
                    {business.metrics.totalUsers}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)' }}>Users</Typography>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 16, fontWeight: 700, color: 'var(--vm-text-primary)' }}>
                    {business.team.length}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)' }}>Team</Typography>
                </div>
              </div>

              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
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
                    borderRadius: 1.5,
                    border: '1px solid var(--vm-border-primary)',
                    bgcolor: 'transparent',
                    color: 'var(--vm-text-secondary)',
                    fontSize: 12,
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
                    borderRadius: 1.5,
                    border: '1px solid var(--vm-border-primary)',
                    bgcolor: 'transparent',
                    color: 'var(--vm-text-secondary)',
                    fontSize: 12,
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
                    borderRadius: 1.5,
                    border: '1px solid var(--vm-border-primary)',
                    bgcolor: 'transparent',
                    color: 'var(--vm-text-secondary)',
                    fontSize: 12,
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
        onSubmit={(data: RegistrationData) => {
          // Handle registration submission - would typically call an API
          console.log('Business registration submitted:', data);
          // Show success message or redirect
        }}
      />
      <DomainChat domain="businesses" placeholder="Ask me to manage your businesses..." />
    </Box>
  );
}
