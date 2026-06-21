import { useMemo } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Typography,
} from '@mui/material';
import { Bot, ChevronDown, Database } from 'lucide-react';
import { useBusiness } from '../../contexts/BusinessContext';
import { useDomainData } from '../../hooks/useDomainData';

interface AIManagedModuleDataProps {
  domain: string;
}

function humanize(value: string) {
  return value.replace(/[-_]/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
}

function ValueView({ value, depth = 0 }: { value: unknown; depth?: number }) {
  if (value === null || value === undefined) {
    return <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>Not set</Typography>;
  }
  if (typeof value === 'boolean') {
    return <Chip size="small" label={value ? 'Yes' : 'No'} color={value ? 'success' : 'default'} />;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return (
      <Typography sx={{ fontSize: 12.5, color: 'var(--vm-text-primary)', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
        {String(value)}
      </Typography>
    );
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>No records</Typography>;
    return (
      <Box sx={{ display: 'grid', gap: 1 }}>
        {value.slice(0, 30).map((item, index) => (
          <Box key={index} sx={{ p: 1.25, borderRadius: 2, bgcolor: 'var(--vm-bg-tertiary)', border: '1px solid var(--vm-border-subtle)' }}>
            <ValueView value={item} depth={depth + 1} />
          </Box>
        ))}
        {value.length > 30 && <Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)' }}>Showing 30 of {value.length} records.</Typography>}
      </Box>
    );
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>No saved fields</Typography>;
    if (depth > 3) {
      return <Typography component="pre" sx={{ m: 0, fontSize: 11, whiteSpace: 'pre-wrap', color: 'var(--vm-text-secondary)' }}>{JSON.stringify(value, null, 2)}</Typography>;
    }
    return (
      <Box sx={{ display: 'grid', gap: 1 }}>
        {entries.map(([key, child]) => (
          <Box key={key} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'minmax(120px, 0.35fr) 1fr' }, gap: 1 }}>
            <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: 'var(--vm-text-secondary)' }}>{humanize(key)}</Typography>
            <ValueView value={child} depth={depth + 1} />
          </Box>
        ))}
      </Box>
    );
  }
  return <Typography sx={{ fontSize: 12 }}>{String(value)}</Typography>;
}

export function AIManagedModuleData({ domain }: AIManagedModuleDataProps) {
  const { selectedBusiness } = useBusiness();
  const { data, loading, error } = useDomainData(selectedBusiness?.id, domain);
  const parsed = useMemo(() => {
    if (!data) return null;
    try {
      return JSON.parse(data) as unknown;
    } catch {
      return data;
    }
  }, [data]);

  if (!selectedBusiness || (!loading && !error && parsed === null)) return null;

  return (
    <Box sx={{ mt: 2.5 }}>
      <Accordion
        disableGutters
        sx={{
          bgcolor: 'var(--vm-bg-secondary)',
          color: 'var(--vm-text-primary)',
          border: '1px solid var(--vm-border-subtle)',
          borderRadius: '12px !important',
          '&:before': { display: 'none' },
        }}
      >
        <AccordionSummary expandIcon={<ChevronDown size={18} />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            <Database size={18} />
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 800 }}>AI-managed {humanize(domain)} data</Typography>
              <Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)' }}>Persistent records created or updated by VentureMate AI</Typography>
            </Box>
            <Chip size="small" icon={<Bot size={13} />} label="Synced" color="success" variant="outlined" sx={{ ml: { xs: 0, sm: 1 } }} />
          </Box>
        </AccordionSummary>
        <Divider />
        <AccordionDetails>
          {loading && <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CircularProgress size={16} /><Typography sx={{ fontSize: 12 }}>Loading AI-managed data…</Typography></Box>}
          {error && <Alert severity="warning">{error}</Alert>}
          {!loading && !error && parsed !== null && <ValueView value={parsed} />}
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}
