import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, Typography, Container, Fade, LinearProgress } from '@mui/material';
import { OnboardingWizard, type OnboardingData } from '../../components/onboarding/OnboardingWizard';
import { useToast } from '../../components/shared/toast';
import { useAuth } from '../../contexts/AuthContext';
import { AnimatedBackground } from '../../components/AnimatedBackground';

const ONBOARDING_DATA_KEY = 'venturemate_onboarding_data';
const ONBOARDING_COMPLETED_KEY = 'venturemate_onboarding_completed';

export function OnboardingPage() {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const { register, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // If already onboarded, go to dashboard
    const completed = localStorage.getItem(ONBOARDING_COMPLETED_KEY) === 'true';
    if (completed) {
      navigate('/vm', { replace: true });
      return;
    }
    // Small delay for smooth entrance
    const t = setTimeout(() => setIsLoading(false), 400);
    return () => clearTimeout(t);
  }, [navigate]);

  const handleComplete = async (data: OnboardingData) => {
    const newUser = await register({
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
    });

    if (!newUser) {
      showError('Registration failed', {
        description: 'An account with this email already exists. Please sign in instead.',
      });
      return;
    }

// Mark onboarding complete (already set by register, but save data for reference)
     localStorage.setItem(ONBOARDING_DATA_KEY, JSON.stringify(data));

    success('Welcome to VentureMate!', {
      description: `Your account is ready, ${data.firstName}.`,
    });

    // Auto-redirect to dashboard (already logged in)
    navigate('/vm');
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3,
          position: 'relative',
        }}
      >
        <AnimatedBackground />
        <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1 }}>
          <Box
            sx={{
              p: 4,
              bgcolor: 'rgba(20, 20, 26, 0.9)',
              backdropFilter: 'blur(20px)',
              borderRadius: 4,
              border: '1px solid rgba(255, 255, 255, 0.08)',
              textAlign: 'center',
            }}
          >
            <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ color: '#fff' }}>
              Loading your experience...
            </Typography>
            <LinearProgress sx={{ mt: 2, mb: 2, bgcolor: 'rgba(255,255,255,0.1)', '& .MuiLinearProgress-bar': { bgcolor: '#34d399' } }} />
          </Box>
        </Container>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        py: { xs: 2, md: 4 },
        px: 2,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <AnimatedBackground />

      <Fade in={true} timeout={600}>
        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
          {/* Header Banner */}
          <Box
            sx={{
              mb: 3,
              p: { xs: 3, md: 4 },
              borderRadius: 4,
              background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.9) 0%, rgba(16, 185, 129, 0.8) 100%)',
              color: 'white',
              textAlign: 'center',
              boxShadow: '0 20px 60px rgba(16, 185, 129, 0.2)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, mb: 1 }}>
              <img
                src="/ventureMate-logo2.png"
                alt="VentureMate"
                style={{ height: 36, width: 'auto', objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
              />
            </Box>
            <Typography variant="h4" fontWeight={800} sx={{ fontSize: { xs: '1.5rem', md: '2rem' } }}>
              Create Your Account
            </Typography>
            <Typography variant="body1" sx={{ mt: 1, opacity: 0.9, maxWidth: 480, mx: 'auto' }}>
              Join VentureMate and start building your startup
            </Typography>
          </Box>

          {/* Wizard Card */}
          <Box
            sx={{
              bgcolor: 'rgba(20, 20, 26, 0.85)',
              backdropFilter: 'blur(20px)',
              borderRadius: 4,
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
              overflow: 'hidden',
            }}
          >
            <OnboardingWizard onComplete={handleComplete} submitting={loading} />
          </Box>

          {/* Footer */}
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography sx={{ color: 'rgba(255,255,255,0.6)', mb: 1 }}>
              Already have an account?{' '}
              <Typography
                component="a"
                href="/vm/auth/signin"
                sx={{
                  color: '#34d399',
                  fontWeight: 600,
                  textDecoration: 'none',
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                Sign in
              </Typography>
            </Typography>
            <Typography
              component={Link}
              to="/"
              sx={{
                display: 'inline-block',
                mt: 1.5,
                color: '#6ee7b7',
                fontSize: '0.8125rem',
                textDecoration: 'none',
                '&:hover': { color: '#34d399', textDecoration: 'underline' },
              }}
            >
              Visit our site ↗
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
              Your data stays private and is only used to personalize your experience
            </Typography>
          </Box>
        </Container>
      </Fade>
    </Box>
  );
}
