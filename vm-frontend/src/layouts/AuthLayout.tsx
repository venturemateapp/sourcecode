import { Outlet } from 'react-router-dom'
import { Box } from '@mui/material'
import { AnimatedBackground } from '../components/AnimatedBackground'
import { Footer } from '../components/shared/Footer'

export function AuthLayout() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <AnimatedBackground />

      {/* Main Content */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: { xs: 2, sm: 4, md: 6 },
          py: 6,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Outlet />
      </Box>

      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <Footer />
      </Box>
    </Box>
  )
}
