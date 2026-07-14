import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Typography, CircularProgress } from '@mui/material';

const providerNames: Record<string, string> = {
  'google-calendar': 'Google Calendar',
  'slack': 'Slack',
  'github': 'GitHub',
  'linkedin': 'LinkedIn',
  'stripe': 'Stripe',
};

export function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const provider = searchParams.get('provider') || '';
  const success = searchParams.get('success') === 'true';
  const error = searchParams.get('error') || '';

  useEffect(() => {
    const timer = setTimeout(() => {
      const stored = JSON.parse(localStorage.getItem('venturemate_user') || '{}');
      navigate(stored?.isAdmin ? '/vm/admin' : '/vm', { replace: true });
    }, 3000);
    return () => clearTimeout(timer);
  }, [navigate]);

  const displayName = providerNames[provider] || provider;

  return (
    <Box sx={{ textAlign: 'center', p: 4 }}>
      {success ? (
        <>
          <Typography variant="h5" sx={{ color: '#22c55e', fontWeight: 600, mb: 2 }}>
            {displayName} Connected!
          </Typography>
          <Typography sx={{ color: 'var(--vm-text-muted)', mb: 3 }}>
            Redirecting to dashboard...
          </Typography>
        </>
      ) : (
        <>
          <Typography variant="h5" sx={{ color: '#ef4444', fontWeight: 600, mb: 2 }}>
            Connection Failed
          </Typography>
          <Typography sx={{ color: 'var(--vm-text-muted)', mb: 3 }}>
            {error || 'An error occurred while connecting your account.'}
          </Typography>
        </>
      )}
      <CircularProgress size={24} sx={{ color: 'var(--vm-primary-400)' }} />
    </Box>
  );
}
