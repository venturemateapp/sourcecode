import { useEffect, useRef, useState } from 'react';
import { Box, Chip, CircularProgress, Typography } from '@mui/material';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { graphqlRequest } from '../../lib/api';

interface GenStatus {
  step: string;
  message: string;
  progress: number;
  error?: string;
  done: boolean;
  updatedAt: string;
}

const GEN_STATUS_QUERY = `
  query GenStatus($businessId: ID!) {
    generationStatus(businessId: $businessId) {
      step message progress error done updatedAt
    }
  }
`;

const STEPS = [
  { key: 'thinking', label: 'Analyzing business profile' },
  { key: 'proposing', label: 'Generating proposal' },
  { key: 'critiquing', label: 'Design director review' },
  { key: 'revising', label: 'Refining based on feedback' },
  { key: 'generating_variations', label: 'Creating light/dark/monochrome variants' },
  { key: 'generating_mockups', label: 'Generating brand mockups' },
  { key: 'done', label: 'Complete' },
];

export function GenerationProgress({ businessId, onDone }: { businessId: string; onDone?: () => void }) {
  const [status, setStatus] = useState<GenStatus | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    intervalRef.current = setInterval(async () => {
      try {
        const data = await graphqlRequest<{ generationStatus: GenStatus }>(GEN_STATUS_QUERY, { businessId });
        const s = data.generationStatus;
        setStatus(s);
        if (s.done) {
          clearInterval(intervalRef.current);
          onDone?.();
        }
      } catch {
        clearInterval(intervalRef.current);
      }
    }, 800);
    return () => clearInterval(intervalRef.current);
  }, [businessId, onDone]);

  if (!status || status.step === 'idle') return null;

  const currentIdx = STEPS.findIndex(s => s.key === status.step);
  const showSteps = status.step !== 'revising' && status.step !== 'done';

  return (
    <Box sx={{ p: 2, borderRadius: 3, bgcolor: '#0d1a15', border: '1px solid rgba(255,255,255,.08)', mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
        <Loader2 size={18} className="animate-spin" color="var(--vm-primary-400)" />
        <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14, flex: 1 }}>{status.message}</Typography>
        <Chip label={`${status.progress}%`} size="small" sx={{ color: 'rgba(255,255,255,.6)', fontSize: 11 }} />
      </Box>
      <Box sx={{ width: '100%', height: 4, bgcolor: 'rgba(255,255,255,.08)', borderRadius: 4, overflow: 'hidden', mb: 1.5 }}>
        <Box sx={{ height: '100%', bgcolor: 'var(--vm-primary-400)', borderRadius: 4, transition: 'width .3s ease', width: `${status.progress}%` }} />
      </Box>
      {showSteps && (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {STEPS.slice(0, -1).map((step, i) => {
            const isActive = i === currentIdx;
            const isPast = i < currentIdx || (currentIdx < 0 && status.done);
            return (
              <Box key={step.key} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 0.75, py: 0.4, borderRadius: 1, bgcolor: isActive ? 'rgba(255,255,255,.06)' : 'transparent' }}>
                {isPast ? <CheckCircle2 size={12} color="#34d399" /> : isActive ? <CircularProgress size={10} /> : <Box sx={{ width: 8, height: 8, borderRadius: 999, bgcolor: 'rgba(255,255,255,.15)' }} />}
                <Typography sx={{ fontSize: 10, color: isPast ? '#34d399' : isActive ? '#fff' : 'rgba(255,255,255,.35)' }}>{step.label}</Typography>
              </Box>
            );
          })}
        </Box>
      )}
      {status.error && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, color: '#ef4444' }}>
          <XCircle size={14} />
          <Typography sx={{ fontSize: 12 }}>{status.error}</Typography>
        </Box>
      )}
    </Box>
  );
}
