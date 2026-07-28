import { Box, CircularProgress, Typography } from '@mui/material';

export function ExportProgress({ open, label }: { open: boolean; label: string }) {
  if (!open) return null;
  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        position: 'absolute', inset: 0, zIndex: 120,
        display: 'grid', placeItems: 'center',
        bgcolor: 'rgba(4,7,12,.78)', backdropFilter: 'blur(5px)',
        borderRadius: 'inherit',
      }}
    >
      <Box sx={{ textAlign: 'center', px: 3 }}>
        <CircularProgress size={34} thickness={4.5} />
        <Typography sx={{ mt: 1.25, color: '#fff', fontSize: 13, fontWeight: 800 }}>{label}</Typography>
        <Typography sx={{ mt: 0.35, color: 'rgba(255,255,255,.55)', fontSize: 10.5 }}>Keep this page open while your file is prepared.</Typography>
      </Box>
    </Box>
  );
}
