import { Box, Card, CircularProgress, FormControl, MenuItem, Select, Typography, Button } from '@mui/material';
import { RefreshCw } from 'lucide-react';
import { useAIProvider } from '../../contexts/AIProviderContext';

export function AIProviderSettingsCard() {
  const {
    providers,
    selectedProvider,
    allowOverride,
    loading,
    setSelectedProvider,
    refreshProviders,
  } = useAIProvider();

  const configured = (providers || []).filter(provider => provider.configured);

  return (
    <Card
      sx={{
        mb: 3,
        p: { xs: 2, md: 2.5 },
        bgcolor: 'var(--vm-bg-secondary)',
        border: '1px solid var(--vm-border-subtle)',
        borderRadius: 3,
      }}
    >
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, auto)' }, gap: 2, alignItems: { xs: 'stretch', md: 'center' } }}>
        <Box>
          <Typography sx={{ fontWeight: 800, color: 'var(--vm-text-primary)' }}>AI Provider</Typography>
        </Box>
        <FormControl size="small" sx={{ width: { xs: '100%', md: 300 } }}>
          <Select
            value={selectedProvider}
            onChange={event => setSelectedProvider(event.target.value)}
            disabled={!allowOverride || configured.length < 2}
            sx={{ color: 'var(--vm-text-primary)', bgcolor: 'var(--vm-bg-tertiary)', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-subtle)' } }}
          >
            {configured.map(provider => (
              <MenuItem key={provider.name} value={provider.name}>
                {provider.name.toUpperCase()} · {provider.model}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box sx={{ display: 'flex', justifyContent: { xs: 'stretch', md: 'flex-end' } }}>
          <Button
            variant="outlined"
            onClick={() => void refreshProviders(true)}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={15} /> : <RefreshCw size={16} />}
            sx={{ whiteSpace: 'nowrap', textTransform: 'none', width: { xs: '100%', md: 'auto' } }}
          >
            Test connections
          </Button>
        </Box>
      </Box>
    </Card>
  );
}
