import { Box, Typography, Avatar } from '@mui/material';
import { CheckCircle } from '@mui/icons-material';
import { GradientButton } from '../shared/buttons';
import type { OnboardingData } from './OnboardingWizard';

interface ReviewStepProps {
  data: OnboardingData;
  onSubmit: () => void;
}

export function ReviewStep({ data, onSubmit }: ReviewStepProps) {
  return (
    <Box sx={{ textAlign: 'center' }}>
      <Box
        sx={{
          width: 80,
          height: 80,
          borderRadius: '24px',
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mx: 'auto',
          mb: 3,
        }}
      >
        <CheckCircle sx={{ fontSize: 40, color: '#fff' }} />
      </Box>

      <Typography variant="h4" fontWeight={700} sx={{ mb: 2, color: 'var(--vm-text-primary)' }}>
        Review Your Profile
      </Typography>
      <Typography sx={{ mb: 4, color: 'var(--vm-text-muted)' }}>
        Here's a summary of your information
      </Typography>

      <Box
        sx={{
          bgcolor: 'var(--vm-bg-secondary)',
          border: '1px solid var(--vm-border-subtle)',
          borderRadius: 3,
          p: 3,
          textAlign: 'left',
          maxWidth: 400,
          mx: 'auto',
          mb: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            sx={{
              width: 60,
              height: 60,
              bgcolor: 'var(--vm-primary-600)',
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            {data.firstName?.[0]}{data.lastName?.[0]}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography fontWeight={600} sx={{ color: 'var(--vm-text-primary)' }}>
              {data.firstName} {data.lastName}
            </Typography>
            <Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 14 }}>
              {data.email}
            </Typography>
          </Box>
        </Box>
      </Box>

      <GradientButton variant="primary" size="lg" onClick={onSubmit}>
        Complete Setup
      </GradientButton>
    </Box>
  );
}
