import { useState } from 'react';
import { Box, Typography, LinearProgress, Fade, Slide } from '@mui/material';
import { ArrowBack, CheckCircle } from '@mui/icons-material';
import { GradientButton } from '../shared/buttons';
import { WelcomeStep } from './WelcomeStep';
import { ReviewStep } from './ReviewStep';

export type OnboardingData = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  industry?: string;
};

interface OnboardingWizardProps {
  onComplete: (data: OnboardingData) => void;
  submitting?: boolean;
}

export function OnboardingWizard({ onComplete, submitting }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const [data, setData] = useState<OnboardingData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const totalSteps = 2;
  const progress = ((step - 1) / (totalSteps - 1)) * 100;

  const updateData = (updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    if (step < totalSteps) {
      setDirection('right');
      setStep((s) => s + 1);
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setDirection('left');
      setStep((s) => s - 1);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return (
          data.firstName.trim() &&
          data.lastName.trim() &&
          data.email.trim() &&
          data.password.length >= 6 &&
          data.password === data.confirmPassword
        );
      default:
        return true;
    }
  };

  const stepTitles = [
    "Let's get to know you",
    "You're all set",
  ];

  const stepSubtitles = [
    'Tell us a bit about yourself.',
    'Review your information and launch your VentureMate dashboard.',
  ];

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', p: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2rem' },
            mb: 1,
            background: 'linear-gradient(135deg, #fff 0%, #34d399 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {stepTitles[step - 1]}
        </Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '1rem', maxWidth: 480, mx: 'auto' }}>
          {stepSubtitles[step - 1]}
        </Typography>
      </Box>

      {/* Progress */}
      <Box sx={{ mb: 5 }}>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 8,
            borderRadius: 4,
            bgcolor: 'rgba(255,255,255,0.08)',
            '& .MuiLinearProgress-bar': {
              borderRadius: 4,
              background: 'linear-gradient(90deg, #059669 0%, #34d399 100%)',
            },
          }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
          {Array.from({ length: totalSteps }).map((_, idx) => (
            <Box
              key={idx}
              sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 700,
                transition: 'all 0.3s ease',
                bgcolor:
                  idx + 1 < step
                    ? 'rgba(52, 211, 153, 0.2)'
                    : idx + 1 === step
                    ? 'rgba(52, 211, 153, 1)'
                    : 'rgba(255,255,255,0.08)',
                color:
                  idx + 1 < step
                    ? '#34d399'
                    : idx + 1 === step
                    ? '#000'
                    : 'rgba(255,255,255,0.4)',
                border:
                  idx + 1 <= step
                    ? '2px solid rgba(52, 211, 153, 0.5)'
                    : '2px solid rgba(255,255,255,0.1)',
              }}
            >
              {idx + 1 < step ? <CheckCircle sx={{ fontSize: 16 }} /> : idx + 1}
            </Box>
          ))}
        </Box>
      </Box>

      {/* Step Content */}
      <Box sx={{ minHeight: 320, position: 'relative' }}>
        <Slide direction={direction === 'right' ? 'left' : 'right'} in={true} key={step}>
          <Box>
            <Fade in={true} timeout={400}>
              <Box>
                {step === 1 && <WelcomeStep data={data} updateData={updateData} />}
                {step === 2 && <ReviewStep data={data} onSubmit={() => onComplete(data)} />}
              </Box>
            </Fade>
          </Box>
        </Slide>
      </Box>

      {/* Navigation */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5, pt: 3, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {step > 1 && (
          <GradientButton
            variant="outline"
            size="md"
            onClick={prevStep}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ArrowBack sx={{ fontSize: 18 }} />
              Back
            </Box>
          </GradientButton>
        )}

        {step < totalSteps ? (
          <GradientButton variant="primary" size="md" onClick={nextStep} disabled={!canProceed()}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              Continue
            </Box>
          </GradientButton>
        ) : (
          <GradientButton variant="primary" size="md" onClick={() => onComplete(data)} disabled={submitting}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {submitting ? 'Creating account...' : 'Launch'}
            </Box>
          </GradientButton>
        )}
      </Box>
    </Box>
  );
}
