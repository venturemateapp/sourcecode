import { Box, Card, Chip, CircularProgress, FormControl, MenuItem, Select, Typography, Button } from '@mui/material';
import { Bot, RefreshCw, Server } from 'lucide-react';
import { useAIProvider } from '../../contexts/AIProviderContext';

export function AIProviderSettingsCard() {
  const {
    providers,
    selectedProvider,
    selectedProviderInfo,
    activeProvider,
    allowOverride,
    loading,
    error,
    setSelectedProvider,
    refreshProviders,
  } = useAIProvider();

  const configured = providers.filter(provider => provider.configured);

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
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: { md: 'center' } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, flex: 1 }}>
          <Box sx={{ width: 42, height: 42, borderRadius: 2.5, bgcolor: 'var(--vm-primary-900)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Bot size={22} color="var(--vm-primary-400)" />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 800, color: 'var(--vm-text-primary)' }}>AI Provider</Typography>
            <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>
              Ollama is the server default. Provider selection is applied to both the full assistant and the floating module assistant.
            </Typography>
          </Box>
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

        <Button
          variant="outlined"
          onClick={() => void refreshProviders(true)}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={15} /> : <RefreshCw size={16} />}
          sx={{ whiteSpace: 'nowrap', textTransform: 'none' }}
        >
          Test connections
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
        {providers.map(provider => (
          <Chip
            key={provider.name}
            size="small"
            icon={<Server size={13} />}
            label={`${provider.name.toUpperCase()}: ${provider.configured ? (provider.available ? provider.message || 'Ready' : 'Unavailable') : 'Not configured'}`}
            color={provider.configured && provider.available ? 'success' : provider.configured ? 'warning' : 'default'}
            variant={provider.name === selectedProvider ? 'filled' : 'outlined'}
          />
        ))}
      </Box>

      <Typography sx={{ mt: 1.25, fontSize: 11, color: error ? '#ef4444' : 'var(--vm-text-muted)' }}>
        {error || `Backend default: ${activeProvider.toUpperCase()} · Current selection: ${selectedProvider.toUpperCase()} · ${selectedProviderInfo?.endpoint || 'endpoint hidden'}`}
      </Typography>
    </Card>
  );
}
