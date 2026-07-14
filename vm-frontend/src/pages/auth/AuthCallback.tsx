import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Box, Typography, CircularProgress } from '@mui/material'

export function AuthCallback() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'processing' | 'error'>(token ? 'processing' : 'error')

  useEffect(() => {
    if (!token) return

    try {
      const parts = token.split('.')
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
        localStorage.setItem('venturemate_token', token)
        localStorage.setItem('venturemate_user', JSON.stringify({
          id: payload.user_id,
          email: payload.email,
          firstName: payload.first_name || '',
          lastName: payload.surname || '',
          picture: payload.picture || '',
          onboarded: payload.onboarded || false,
          status: payload.status || 'active',
        }))
        if (payload.onboarded) {
          localStorage.setItem('venturemate_onboarding_completed', 'true')
        }
      }

      window.location.href = '/vm'
    } catch {
      setStatus('error')
    }
  }, [token])

  if (status === 'error') {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography sx={{ color: '#fca5a5', mb: 2 }}>Authentication failed</Typography>
        <Typography
          component="a"
          href="/vm/auth/signin"
          sx={{ color: '#34d399', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
        >
          Back to sign in
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ textAlign: 'center', py: 8 }}>
      <CircularProgress sx={{ color: '#10b981', mb: 2 }} />
      <Typography sx={{ color: '#6ee7b7' }}>Completing sign in...</Typography>
    </Box>
  )
}
