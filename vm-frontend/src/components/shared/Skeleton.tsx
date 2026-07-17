import { Box, Skeleton as MuiSkeleton } from '@mui/material';

interface CardSkeletonProps {
  count?: number;
  type?: 'card' | 'table-row' | 'text' | 'stat' | 'list-item';
}

export function CardSkeleton({ count = 1, type = 'card' }: CardSkeletonProps) {
  const items = Array.from({ length: count });

  if (type === 'stat') {
    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', sm: 'repeat(4,1fr)' }, gap: { xs: 1.5, sm: 2 } }}>
        {items.map((_, i) => (
          <Box key={i} sx={{ p: { xs: 1.5, sm: 2.5 }, borderRadius: 3, bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)' }}>
            <MuiSkeleton variant="rounded" width={32} height={32} sx={{ bgcolor: 'rgba(255,255,255,.06)', mb: 1, borderRadius: 1.5 }} />
            <MuiSkeleton variant="text" width="60%" height={28} sx={{ bgcolor: 'rgba(255,255,255,.06)' }} />
            <MuiSkeleton variant="text" width="40%" height={14} sx={{ bgcolor: 'rgba(255,255,255,.04)', mt: 0.25 }} />
          </Box>
        ))}
      </Box>
    );
  }

  if (type === 'table-row') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {items.map((_, i) => (
          <Box key={i} sx={{ display: 'flex', gap: 2, p: 1.5, borderBottom: '1px solid rgba(255,255,255,.04)' }}>
            <MuiSkeleton variant="rounded" width={28} height={28} sx={{ bgcolor: 'rgba(255,255,255,.06)', borderRadius: 1.5, flexShrink: 0 }} />
            <Box sx={{ flex: 1 }}>
              <MuiSkeleton variant="text" width="40%" height={14} sx={{ bgcolor: 'rgba(255,255,255,.06)' }} />
              <MuiSkeleton variant="text" width="60%" height={12} sx={{ bgcolor: 'rgba(255,255,255,.04)', mt: 0.25 }} />
            </Box>
            <MuiSkeleton variant="rounded" width={60} height={22} sx={{ bgcolor: 'rgba(255,255,255,.06)', borderRadius: 1 }} />
          </Box>
        ))}
      </Box>
    );
  }

  if (type === 'list-item') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {items.map((_, i) => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 2.5, bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)' }}>
            <MuiSkeleton variant="rounded" width={40} height={40} sx={{ bgcolor: 'rgba(255,255,255,.06)', borderRadius: 1.5, flexShrink: 0 }} />
            <Box sx={{ flex: 1 }}>
              <MuiSkeleton variant="text" width="50%" height={14} sx={{ bgcolor: 'rgba(255,255,255,.06)' }} />
              <MuiSkeleton variant="text" width="30%" height={12} sx={{ bgcolor: 'rgba(255,255,255,.04)', mt: 0.25 }} />
            </Box>
            <MuiSkeleton variant="rounded" width={20} height={20} sx={{ bgcolor: 'rgba(255,255,255,.06)' }} />
          </Box>
        ))}
      </Box>
    );
  }

  // Default: card grid
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2,1fr)', lg: 'repeat(3,1fr)' }, gap: 2 }}>
      {items.map((_, i) => (
        <Box key={i} sx={{ p: 2, borderRadius: 3, bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)' }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
            <MuiSkeleton variant="rounded" width={44} height={44} sx={{ bgcolor: 'rgba(255,255,255,.06)', borderRadius: 1.5, flexShrink: 0 }} />
            <Box sx={{ flex: 1 }}>
              <MuiSkeleton variant="text" width="60%" height={16} sx={{ bgcolor: 'rgba(255,255,255,.06)' }} />
              <MuiSkeleton variant="text" width="40%" height={12} sx={{ bgcolor: 'rgba(255,255,255,.04)', mt: 0.25 }} />
            </Box>
          </Box>
          <MuiSkeleton variant="text" width="100%" height={12} sx={{ bgcolor: 'rgba(255,255,255,.04)', mb: 0.5 }} />
          <MuiSkeleton variant="text" width="80%" height={12} sx={{ bgcolor: 'rgba(255,255,255,.04)' }} />
          <Box sx={{ display: 'flex', gap: 0.75, mt: 1.5 }}>
            <MuiSkeleton variant="rounded" width="48%" height={32} sx={{ bgcolor: 'rgba(255,255,255,.06)', borderRadius: 2 }} />
            <MuiSkeleton variant="rounded" width="48%" height={32} sx={{ bgcolor: 'rgba(255,255,255,.06)', borderRadius: 2 }} />
          </Box>
        </Box>
      ))}
    </Box>
  );
}
