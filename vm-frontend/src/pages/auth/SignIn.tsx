import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Box, Typography, Card, Stack } from '@mui/material'
import { ArrowRight } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { TextField } from '../../components/shared/form-fields'
import { useToast } from '../../components/shared/toast'
import { API_CONFIG } from '../../lib/constants'

export function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { login, loading, error: authError, clearError } = useAuth()
  const { success, error: showError } = useToast()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    if (!email || !password) {
      showError('Validation error', {
        description: 'Please enter both email and password.',
      })
      return
    }

    const loggedIn = await login(email, password)
    if (!loggedIn) {
      showError('Sign in failed', {
        description: 'Invalid email or password. Please try again.',
      })
      return
    }

    success('Welcome back!', {
      description: `Signed in as ${email}`,
    })
    const stored = JSON.parse(localStorage.getItem('venturemate_user') || '{}')
    navigate(stored?.isAdmin ? '/vm/admin' : '/vm')
  }

  const handleGoogleSignIn = () => {
    window.location.href = API_CONFIG.GOOGLE_AUTH_URL
  }

  return (
    <Box sx={{ width: '100%', maxWidth: { xs: '100%', sm: 450 }, mx: 'auto' }}>
      {/* Logo & Header */}
      <Box sx={{ textAlign: 'center', mb: 5 }}>
        <Box
          component="img"
          src="/ventureMate-logo2.png"
          alt="VentureMate"
          sx={{ height: { xs: 120, md: 180 }, width: 'auto', objectFit: 'contain', mx: 'auto', display: 'block' }}
        />
        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            fontSize: { xs: '1.5rem', sm: '1.875rem', md: '2rem' },
            letterSpacing: '-0.02em',
            background: 'linear-gradient(135deg, #fff 0%, #a7f3d0 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 1,
          }}
        >
          Welcome back
        </Typography>
        <Typography sx={{ color: '#6ee7b7', fontSize: { xs: '0.8125rem', sm: '0.875rem', md: '1rem' } }}>
          Sign in to continue building your startup
        </Typography>
      </Box>

      {/* Sign In Card */}
      <Card
        sx={{
          bgcolor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: '24px',
          p: { xs: 3, sm: 4 },
          boxShadow: '0 0 60px rgba(16, 185, 129, 0.1)',
        }}
      >
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={3}>
            {/* Error Message */}
            {authError && (
              <Box
                sx={{
                  p: 2.5,
                  borderRadius: '12px',
                  bgcolor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: '#fca5a5',
                  fontSize: '0.875rem',
                }}
              >
                {authError}
              </Box>
            )}

            {/* Email Field */}
            <TextField
              id="email"
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="founder@startup.com"
            />

            {/* Password Field */}
            <TextField
              id="password"
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />

            {/* Forgot Password Link */}
            <Box sx={{ textAlign: 'right' }}>
              <Typography
                component="a"
                href="/vm/auth/forgot-password"
                sx={{
                  color: '#34d399',
                  fontSize: '0.875rem',
                  textDecoration: 'none',
                  '&:hover': { color: '#6ee7b7', textDecoration: 'underline' },
                }}
              >
                Forgot password?
              </Typography>
            </Box>

            {/* Sign In Button */}
            <Box
              component="button"
              type="submit"
              disabled={loading}
              sx={{
                width: '100%',
                py: 1.5,
                px: 3,
                borderRadius: '14px',
                border: 'none',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
                color: '#fff',
                boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 30px rgba(16, 185, 129, 0.5)',
                },
                '&:disabled': {
                  opacity: 0.7,
                  cursor: 'not-allowed',
                },
              }}
            >
              {loading ? (
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    '@keyframes spin': { to: { transform: 'rotate(360deg)' } },
                  }}
                />
              ) : (
                <>
                  Sign in
                  <ArrowRight size={18} />
                </>
              )}
            </Box>

            {/* Google Sign In */}
            <Box
              component="button"
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              sx={{
                width: '100%',
                py: 1.5,
                px: 3,
                borderRadius: '14px',
                border: '1px solid rgba(255,255,255,0.1)',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1.5,
                bgcolor: 'transparent',
                color: '#fff',
                transition: 'all 0.3s ease',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.05)',
                  borderColor: 'rgba(255,255,255,0.2)',
                },
                '&:disabled': {
                  opacity: 0.5,
                  cursor: 'not-allowed',
                },
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </Box>

            {/* Visit our site */}
            <Box sx={{ textAlign: 'center', pt: 1 }}>
              <Link to="/" style={{ textDecoration: 'none' }}>
                <Typography
                  sx={{
                    color: '#6ee7b7',
                    fontSize: '0.8125rem',
                    '&:hover': { color: '#34d399', textDecoration: 'underline' },
                  }}
                >
                  Visit our site ↗
                </Typography>
              </Link>
            </Box>
          </Stack>
        </Box>

      </Card>

      {/* New User Registration */}
      <Box
        sx={{
          textAlign: 'center',
          mt: 3,
          p: 2,
          borderRadius: '12px',
          border: '1px solid rgba(52, 211, 153, 0.2)',
          bgcolor: 'rgba(52, 211, 153, 0.05)',
        }}
      >
        <Typography sx={{ fontSize: '0.875rem', color: '#6ee7b7', mb: 1 }}>
          New to VentureMate?
        </Typography>
        <Typography
          component="a"
          href="/vm/onboarding"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            color: '#34d399',
            fontWeight: 600,
            fontSize: '0.9375rem',
            textDecoration: 'none',
            '&:hover': { color: '#6ee7b7', textDecoration: 'underline' },
          }}
        >
          Create a new account
        </Typography>
      </Box>

    </Box>
  )
}
