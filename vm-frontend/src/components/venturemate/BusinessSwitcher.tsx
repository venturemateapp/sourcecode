import { useState } from 'react';
import {
  Box,
  Typography,
  Menu,
  MenuItem,
  Avatar,
} from '@mui/material';
import { ChevronDown, Plus } from 'lucide-react';
import { useBusiness } from '../../contexts/BusinessContext';
import type { ViewType } from '../../types/venturemate';

interface BusinessSwitcherProps {
  onViewChange: (view: ViewType) => void;
}

export function BusinessSwitcher({ onViewChange }: BusinessSwitcherProps) {
  const { businesses, selectedBusiness, selectedBusinessId, setSelectedBusinessId } = useBusiness();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleSelect = (id: string) => {
    setSelectedBusinessId(id);
    handleClose();
  };

  const handleCreateNew = () => {
    handleClose();
    onViewChange('businesses');
  };

  return (
    <>
      <Box
        onClick={handleOpen}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.5,
          py: 0.5,
          borderRadius: 2,
          cursor: 'pointer',
          bgcolor: 'var(--vm-bg-secondary)',
          border: '1px solid var(--vm-border-subtle)',
          '&:hover': { bgcolor: 'var(--vm-bg-hover)' },
          minWidth: 0,
        }}
      >
        {selectedBusiness ? (
          <>
            {selectedBusiness.brandKit.logo && (selectedBusiness.brandKit.logo.startsWith('data:') || selectedBusiness.brandKit.logo.startsWith('http')) ? (
              <Avatar src={selectedBusiness.brandKit.logo} sx={{ width: 24, height: 24, borderRadius: 1 }} />
            ) : (
              <Box
                sx={{
                  width: 24, height: 24, borderRadius: 1,
                  background: `linear-gradient(135deg, ${selectedBusiness.brandKit.primaryColor} 0%, ${selectedBusiness.brandKit.secondaryColor} 100%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}
              >
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'white' }}>
                  {selectedBusiness.name[0]}
                </Typography>
              </Box>
            )}
            <Typography
              sx={{
                fontSize: 13, fontWeight: 600, color: 'var(--vm-text-primary)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                maxWidth: { xs: 60, sm: 120, md: 160 },
              }}
            >
              {selectedBusiness.name}
            </Typography>
          </>
        ) : (
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'var(--vm-text-muted)', px: 0.5 }}>
            No Business
          </Typography>
        )}
        <ChevronDown size={14} color="var(--vm-text-muted)" />
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: {
            bgcolor: 'var(--vm-bg-secondary)',
            border: '1px solid var(--vm-border-subtle)',
            borderRadius: 2,
            mt: 1,
            minWidth: 240,
            maxHeight: 360,
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid var(--vm-border-subtle)' }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'var(--vm-text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
            Switch Business
          </Typography>
        </Box>

        {businesses.map((business) => (
          <MenuItem
            key={business.id}
            selected={business.id === selectedBusinessId}
            onClick={() => handleSelect(business.id)}
            sx={{
              py: 1.5,
              px: 2,
              gap: 1.5,
              '&.Mui-selected': {
                bgcolor: 'var(--vm-primary-900)',
              },
              '&:hover': { bgcolor: 'var(--vm-bg-hover)' },
            }}
          >
            {business.brandKit.logo && (business.brandKit.logo.startsWith('data:') || business.brandKit.logo.startsWith('http')) ? (
              <Avatar src={business.brandKit.logo} sx={{ width: 32, height: 32, borderRadius: 1 }} />
            ) : (
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 1,
                  background: `linear-gradient(135deg, ${business.brandKit.primaryColor} 0%, ${business.brandKit.secondaryColor} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'white' }}>
                  {business.name[0]}
                </Typography>
              </Box>
            )}
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'var(--vm-text-primary)', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                {business.name}
              </Typography>
              <Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)', overflowWrap: 'anywhere' }}>
                {business.industry}
              </Typography>
            </Box>
          </MenuItem>
        ))}

        <Box sx={{ borderTop: '1px solid var(--vm-border-subtle)', px: 1, py: 1 }}>
          <MenuItem
            onClick={handleCreateNew}
            sx={{
              gap: 1,
              py: 1.5,
              borderRadius: 1.5,
              color: 'var(--vm-primary-400)',
              '&:hover': { bgcolor: 'var(--vm-bg-hover)' },
            }}
          >
            <Plus size={18} />
            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
              Create New Business
            </Typography>
          </MenuItem>
        </Box>
      </Menu>
    </>
  );
}
