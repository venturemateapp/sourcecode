import { Box, type SxProps, type Theme } from '@mui/material';

interface GlassCardProps {
  children: React.ReactNode;
  sx?: SxProps<Theme>;
  gradient?: string;
  borderColor?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function GlassCard({ children, sx, gradient, borderColor, hover = true, onClick }: GlassCardProps) {
  return (
    <Box sx={{
      position: 'relative',
      borderRadius: 3,
      border: `1px solid ${borderColor || 'rgba(255,255,255,.06)'}`,
      background: gradient || 'rgba(255,255,255,.02)',
      backdropFilter: 'blur(12px)',
      overflow: 'hidden',
      transition: 'all .3s cubic-bezier(.4,0,.2,1)',
      cursor: onClick ? 'pointer' : undefined,
      '&::before': {
        content: '""',
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(180deg, rgba(255,255,255,.03) 0%, transparent 100%)',
        pointerEvents: 'none',
      },
      ...(hover ? {
        '&:hover': {
          transform: 'translateY(-2px)',
          borderColor: borderColor || 'rgba(255,255,255,.12)',
          boxShadow: `0 8px 32px rgba(0,0,0,.2)`,
        },
      } : {}),
      ...(sx as any),
    }} onClick={onClick}>
      {children}
    </Box>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: string;
  color?: string;
}

export function StatCard({ icon, label, value, trend, color = 'var(--vm-primary-400)' }: StatCardProps) {
  return (
    <GlassCard sx={{ p: { xs: 1.5, sm: 2 }, textAlign: 'center' }}>
      <Box sx={{ width: 36, height: 36, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: `${color}15`, color, mx: 'auto', mb: 1 }}>
        {icon}
      </Box>
      <Box sx={{ fontSize: { xs: 18, sm: 24 }, fontWeight: 900, color: 'var(--vm-text-primary)', lineHeight: 1.1 }}>{value}</Box>
      <Box sx={{ fontSize: 11, color: 'var(--vm-text-muted)', mt: 0.25 }}>{label}</Box>
      {trend && <Box sx={{ fontSize: 10, color: trend.startsWith('+') ? '#22c55e' : '#ef4444', mt: 0.25 }}>{trend}</Box>}
    </GlassCard>
  );
}
