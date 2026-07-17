import { type ReactNode } from 'react';
import { Dialog, DialogTitle, DialogContent, IconButton, Typography, Box, useMediaQuery, useTheme } from '@mui/material';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg';
  actions?: ReactNode;
}

export function Modal({ open, onClose, title, icon, children, maxWidth = 'sm', actions }: ModalProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          bgcolor: 'var(--vm-bg-secondary)',
          borderRadius: isMobile ? 0 : 3,
          border: isMobile ? 'none' : '1px solid var(--vm-border-subtle)',
          backgroundImage: 'none',
          m: isMobile ? 0 : { xs: 1, sm: 2 },
          maxHeight: isMobile ? '100%' : { xs: '90vh', sm: '85vh' },
        },
      }}
    >
      <DialogTitle sx={{
        borderBottom: '1px solid var(--vm-border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: { xs: 2, sm: 3 },
        py: { xs: 1.5, sm: 2 },
      }}>
        {icon && <Box sx={{ display: 'flex', color: 'var(--vm-primary-400)' }}>{icon}</Box>}
        <Typography sx={{ fontWeight: 700, fontSize: { xs: 15, sm: 17 }, color: 'var(--vm-text-primary)', flex: 1 }}>
          {title}
        </Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: 'var(--vm-text-muted)', '&:hover': { bgcolor: 'rgba(255,255,255,.05)' } }}>
          <X size={20} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{
        pt: 3.5,
        px: { xs: 2, sm: 3 },
        pb: actions ? 1 : 3,
        overflowY: 'auto',
        '&:first-of-type': { pt: 3.5 },
      }}>
        {children}
      </DialogContent>

      {actions && (
        <Box sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 1,
          px: { xs: 2, sm: 3 },
          pb: { xs: 2, sm: 2.5 },
          pt: 1,
          borderTop: '1px solid var(--vm-border-subtle)',
          flexWrap: 'wrap',
        }}>
          {actions}
        </Box>
      )}
    </Dialog>
  );
}
