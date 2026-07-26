import { Dialog, DialogTitle, DialogContent, Typography, Box, CircularProgress } from '@mui/material';
import { AlertTriangle } from 'lucide-react';
import { GradientButton } from './buttons';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmColor?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', confirmColor = '#ef4444', loading = false, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={loading ? undefined : onCancel} maxWidth="xs" fullWidth
      PaperProps={{ sx: { bgcolor: 'var(--vm-bg-secondary)', borderRadius: 3, border: '1px solid var(--vm-border-subtle)' } }}>
      <DialogTitle sx={{ borderBottom: '1px solid var(--vm-border-subtle)', display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: `${confirmColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AlertTriangle size={16} color={confirmColor} />
        </Box>
        <Typography sx={{ fontWeight: 700, color: 'var(--vm-text-primary)' }}>{title}</Typography>
      </DialogTitle>
      <DialogContent sx={{ pt: 3, mt: 1 }}>
        <Typography sx={{ color: 'var(--vm-text-secondary)', fontSize: 14, lineHeight: 1.6 }}>{message}</Typography>
      </DialogContent>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, p: 2.5, pt: 0 }}>
        <GradientButton variant="ghost" size="sm" onClick={onCancel} disabled={loading}>Cancel</GradientButton>
        <GradientButton variant="primary" size="sm" onClick={onConfirm} disabled={loading}
          sx={{ bgcolor: confirmColor, '&:hover': { bgcolor: confirmColor, opacity: 0.8 } }}>
          {loading ? <CircularProgress size={14} sx={{ color: 'white' }} /> : confirmLabel}
        </GradientButton>
      </Box>
    </Dialog>
  );
}
