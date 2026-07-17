import { Button, CircularProgress, type SxProps, type Theme } from '@mui/material';

interface AnimatedButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  sx?: SxProps<Theme>;
  fullWidth?: boolean;
  type?: 'button' | 'submit';
}

const variantStyles: Record<string, any> = {
  primary: {
    bgcolor: 'var(--vm-primary-500)',
    color: '#fff',
    '&:hover': { bgcolor: 'var(--vm-primary-400)', transform: 'translateY(-1px)' },
    '&:disabled': { bgcolor: 'var(--vm-primary-700)', color: 'rgba(255,255,255,.3)' },
  },
  secondary: {
    bgcolor: 'rgba(255,255,255,.06)',
    color: 'var(--vm-text-primary)',
    border: '1px solid var(--vm-border-subtle)',
    '&:hover': { bgcolor: 'rgba(255,255,255,.1)', borderColor: 'rgba(255,255,255,.15)' },
  },
  ghost: {
    bgcolor: 'transparent',
    color: 'var(--vm-text-muted)',
    '&:hover': { bgcolor: 'rgba(255,255,255,.04)', color: 'var(--vm-text-primary)' },
  },
  danger: {
    bgcolor: '#ef444415',
    color: '#ef4444',
    border: '1px solid #ef444430',
    '&:hover': { bgcolor: '#ef444425', borderColor: '#ef444450' },
  },
  success: {
    bgcolor: '#22c55e15',
    color: '#22c55e',
    border: '1px solid #22c55e30',
    '&:hover': { bgcolor: '#22c55e25', borderColor: '#22c55e50' },
  },
};

const sizeStyles: Record<string, any> = {
  sm: { fontSize: 11, px: 1.5, py: 0.5, minHeight: 30 },
  md: { fontSize: 12, px: 2, py: 0.75, minHeight: 36 },
  lg: { fontSize: 14, px: 3, py: 1, minHeight: 44 },
};

export function AnimatedButton({ children, onClick, disabled, loading, variant = 'primary', size = 'md', icon, sx, fullWidth, type = 'button' }: AnimatedButtonProps) {
  return (
    <Button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      fullWidth={fullWidth}
      sx={{
        textTransform: 'none',
        fontWeight: 700,
        borderRadius: 2,
        gap: 1,
        transition: 'all .2s cubic-bezier(.4,0,.2,1)',
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...(sx as any),
      }}
    >
      {loading ? <CircularProgress size={14} sx={{ color: 'inherit' }} /> : icon}
      {children}
    </Button>
  );
}
