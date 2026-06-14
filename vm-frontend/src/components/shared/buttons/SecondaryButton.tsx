import Button from '@mui/material/Button'
import type { ButtonProps } from '@mui/material/Button'

export function SecondaryButton({ children, sx, ...props }: ButtonProps) {
  return (
    <Button
      variant="outlined"
      sx={{
        textTransform: 'none',
        fontWeight: 500,
        px: 3.5,
        py: 1.25,
        fontSize: '15px',
        borderRadius: '10px',
        borderColor: 'rgba(255,255,255,0.2)',
        color: '#fff',
        backgroundColor: 'rgba(255,255,255,0.05)',
        '&:hover': {
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderColor: 'rgba(255,255,255,0.2)',
        },
        ...sx,
      }}
      {...props}
    >
      {children}
    </Button>
  )
}
