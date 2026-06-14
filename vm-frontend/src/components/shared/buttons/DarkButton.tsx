import Button from '@mui/material/Button'
import type { ButtonProps } from '@mui/material/Button'

export function DarkButton({ children, sx, ...props }: ButtonProps) {
  return (
    <Button
      variant="contained"
      sx={{
        textTransform: 'none',
        fontWeight: 600,
        px: 2,
        py: 0.75,
        borderRadius: '8px',
        backgroundColor: '#111827',
        color: '#fff',
        boxShadow: 'none',
        '&:hover': {
          backgroundColor: '#1f2937',
          boxShadow: 'none',
        },
        ...sx,
      }}
      {...props}
    >
      {children}
    </Button>
  )
}
