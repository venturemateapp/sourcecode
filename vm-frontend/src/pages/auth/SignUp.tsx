import { useState, useEffect } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { Box, Typography, Card, Stack } from '@mui/material'
import { ArrowRight } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { TextField } from '../../components/shared/form-fields'
import { useToast } from '../../components/shared/toast'

export function SignUp() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { register, loading, error: authError, clearError } = useAuth()
  const { success, error: showError } = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const refCode = searchParams.get('ref')

  useEffect(() => {
    if (refCode) {
      localStorage.setItem('vm_referral_code', refCode)
    }
  }, [refCode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    if (!firstName || !email || !password) {
      showError('Validation error', { description: 'Please fill in all required fields.' })
      return
    }
    const user = await register({ email, password, firstName, lastName, referralCode: refCode || undefined })
    if (!user) {
      showError('Sign up failed', { description: authError || 'Could not create account. Please try again.' })
      return
    }
    localStorage.removeItem('vm_referral_code')
    success('Account created!', { description: 'Welcome to VentureMate.' })
    navigate('/vm/onboarding')
  }

  return (
    <Box sx={{ width: '100%', maxWidth: { xs: '100%', sm: 450 }, mx: 'auto' }}>
      <Box sx={{ textAlign: 'center', mb: 5 }}>
        <Box component="img" src="/VentureMate-logo.png" alt="VentureMate"
          sx={{ height: { xs: 120, md: 180 }, width: 'auto', objectFit: 'contain', mx: 'auto', display: 'block' }} />
        <Typography variant="h4" sx={{ fontWeight: 800, fontSize: { xs: 22, sm: 26 }, color: '#fff', textAlign: 'center', mt: 2 }}>
          Create Your Account
        </Typography>
        <Typography sx={{ color: 'rgba(255,255,255,.55)', fontSize: 14, mt: 1, textAlign: 'center', overflowWrap: 'anywhere' }}>
          Start building your startup with VentureMate
        </Typography>
      </Box>

      <Card sx={{ bgcolor: '#0a1a14', border: '1px solid rgba(255,255,255,.08)', borderRadius: 4, p: { xs: 3, sm: 4 } }}>
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2.5}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField id="firstName" label="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} required fullWidth />
              <TextField id="lastName" label="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} fullWidth />
            </Box>
            <TextField id="email" label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required fullWidth />
            <TextField id="password" label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required fullWidth
              helperText="At least 6 characters" />
            {refCode && (
              <Typography sx={{ fontSize: 12, color: 'rgba(16,185,129,.7)', textAlign: 'center', overflowWrap: 'anywhere' }}>
                Referral code applied — you'll both earn rewards!
              </Typography>
            )}
            <Box component="button" type="submit" disabled={loading}
              sx={{ width: '100%', py: 1.5, px: 3, borderRadius: 2, border: 'none', bgcolor: loading ? 'rgba(16,185,129,.5)' : 'var(--vm-primary-600)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, '&:hover': { bgcolor: loading ? 'rgba(16,185,129,.5)' : 'var(--vm-primary-500)' } }}>
              {loading ? 'Creating account...' : 'Create Account'} <ArrowRight size={18} />
            </Box>
          </Stack>
        </Box>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,.5)', overflowWrap: 'anywhere' }}>
            Already have an account?{' '}
            <Link to="/vm/auth/signin" style={{ color: '#10b981', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
          </Typography>
        </Box>
      </Card>
    </Box>
  )
}
