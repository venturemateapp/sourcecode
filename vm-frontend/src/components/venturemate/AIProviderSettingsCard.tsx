import { Box, Card, Typography } from '@mui/material';
import { useAIProvider } from '../../contexts/AIProviderContext';

export function AIProviderSettingsCard() {
  return (
    <Card sx={{ p: 2.5, bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3 }}>
      <Typography sx={{ color: 'var(--vm-text-primary)', fontWeight: 800, mb: 0.5 }}>AI Model</Typography>
      <Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 12 }}>
        Using DeepSeek V4 Flash — configured server-side.
      </Typography>
    </Card>
  );
}
