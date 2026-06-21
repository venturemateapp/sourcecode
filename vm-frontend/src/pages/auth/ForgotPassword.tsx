import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Box, Typography, Card, Stack } from '@mui/material'
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react'
import { TextField } from '../../components/shared/form-fields'
import { useAuthApi } from '../../hooks/useAuthApi'
import { useToast } from '../../components/shared/toast'

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const { requestPasswordReset, loading } = useAuthApi()
  const { success, error: showError } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    const ok = await requestPasswordReset(email)
    if (!ok) {
      showError('Failed to send reset link', {
        description: 'Please check the email address and try again.',
      })
      return
    }

    setIsSubmitted(true)
    success('Reset link sent!', {
      description: `Check your email at ${email} for instructions.`,
    })
  }

  return (
    <Box sx={{ width: '100%', maxWidth: { xs: '100%', sm: 450 }, mx: 'auto' }}>
      {/* Logo & Header */}
      <Box sx={{ textAlign: 'center', mb: 5 }}>
        <Box
          component="img"
          src="/VentureMate-logo.png"
          alt="VentureMate"
          sx={{ height: { xs: 120, md: 180 }, width: 'auto', objectFit: 'contain', mx: 'auto', display: 'block', mb: 1 }}
        />
        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            fontSize: '2rem',
            letterSpacing: '-0.02em',
            background: 'linear-gradient(135deg, #fff 0%, #a7f3d0 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 1,
          }}
        >
          Reset password
        </Typography>
        <Typography sx={{ color: '#6ee7b7', fontSize: '1rem' }}>
          {isSubmitted 
            ? 'Check your email for reset instructions' 
            : 'Enter your email to receive reset instructions'}
        </Typography>
      </Box>

      {/* Forgot Password Card */}
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
        {isSubmitted ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                bgcolor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3,
              }}
            >
              <CheckCircle size={32} color="#10b981" />
            </Box>
            <Typography sx={{ color: '#fff', fontSize: '1.1rem', fontWeight: 600, mb: 1 }}>
              Email sent!
            </Typography>
            <Typography sx={{ color: '#6ee7b7', fontSize: '0.9rem', mb: 4 }}>
              We've sent a password reset link to<br />
              <Box component="span" sx={{ color: '#34d399', fontWeight: 500 }}>{email}</Box>
            </Typography>
            <Link to="/vm/auth/signin" style={{ textDecoration: 'none' }}>
              <Box
                component="button"
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
                  gap: 1,
                  bgcolor: 'transparent',
                  color: '#fff',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.05)',
                    borderColor: 'rgba(255,255,255,0.2)',
                  },
                }}
              >
                <ArrowLeft size={18} />
                Back to sign in
              </Box>
            </Link>
          </Box>
        ) : (
          <form onSubmit={handleSubmit}>
            <Stack spacing={3}>
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

              {/* Submit Button */}
              <Box
                component="button"
                type="submit"
                disabled={loading || !email}
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
                    opacity: 0.5,
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
                    <Mail size={18} />
                    Send reset link
                  </>
                )}
              </Box>

              {/* Back to Sign In */}
              <Link to="/vm/auth/signin" style={{ textDecoration: 'none' }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1,
                    color: '#6ee7b7',
                    fontSize: '0.875rem',
                    py: 1,
                    transition: 'color 0.2s',
                    '&:hover': { color: '#34d399' },
                  }}
                >
                  <ArrowLeft size={16} />
                  Back to sign in
                </Box>
              </Link>
            </Stack>
          </form>
        )}

        {/* Visit our site */}
        <Box sx={{ textAlign: 'center', mt: 2 }}>
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
      </Card>

    </Box>
  )
}
