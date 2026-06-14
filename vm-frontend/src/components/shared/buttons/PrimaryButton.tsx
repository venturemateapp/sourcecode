import Button from '@mui/material/Button'
import type { ButtonProps } from '@mui/material/Button'

export function PrimaryButton({ children, sx, ...props }: ButtonProps) {
  return (
    <Button
      variant="contained"
      fullWidth
      sx={{
        textTransform: 'none',
        fontWeight: 600,
        py: 1.75,
        fontSize: '15px',
        borderRadius: '10px',
        background: 'linear-gradient(90deg, #059669 0%, #34d399 100%)',
        color: '#fff',
        boxShadow: 'none',
        '&:hover': {
          opacity: 0.95,
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
