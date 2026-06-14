import { Box, Typography } from '@mui/material';
import { Building2 } from 'lucide-react';

interface NoBusinessSelectedProps {
  message?: string;
}

export function NoBusinessSelected({ message }: NoBusinessSelectedProps) {
  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      minHeight: 400,
      textAlign: 'center',
      p: 4,
    }}>
      <Box sx={{
        width: 72,
        height: 72,
        borderRadius: 3,
        bgcolor: 'var(--vm-bg-tertiary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        mb: 3,
      }}>
        <Building2 size={36} color="var(--vm-text-muted)" style={{ opacity: 0.4 }} />
      </Box>
      <Typography sx={{ fontSize: 18, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 1 }}>
        No Business Selected
      </Typography>
      <Typography sx={{ fontSize: 14, color: 'var(--vm-text-muted)', maxWidth: 400, lineHeight: 1.6 }}>
        {message || 'Select or create a business from the sidebar to access this page.'}
      </Typography>
    </Box>
  );
}
