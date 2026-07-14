import { Box, Card, Typography } from '@mui/material';

export function AIProviderSettingsCard() {
  return (
    <Card sx={{ p: 2.5, bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3 }}>
      <Typography sx={{ color: 'var(--vm-text-primary)', fontWeight: 800, mb: 0.5 }}>AI Model</Typography>
      <Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 12 }}>
        AI model is configured server-side. No user selection needed.
      </Typography>
    </Card>
  );
}
