import { Box, Typography, IconButton } from '@mui/material';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Step {
  label: string;
  icon?: React.ReactNode;
}

interface StepWizardProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (index: number) => void;
  children?: React.ReactNode;
  onBack?: () => void;
  onNext?: () => void;
  showNav?: boolean;
}

export function StepWizard({ steps, currentStep, onStepClick, children, onBack, onNext, showNav = true }: StepWizardProps) {
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3, overflow: 'auto', pb: 0.5 }}>
        {steps.map((step, i) => (
          <Box key={step.label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              onClick={() => onStepClick?.(i)}
              sx={{
                display: 'flex', alignItems: 'center', gap: 1,
                cursor: onStepClick ? 'pointer' : 'default',
                opacity: i <= currentStep ? 1 : 0.4,
                transition: 'opacity .2s',
              }}
            >
              <Box sx={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, flexShrink: 0,
                bgcolor: i < currentStep ? 'var(--vm-primary-500)' : i === currentStep ? 'var(--vm-primary-500)' : 'var(--vm-bg-tertiary)',
                color: i <= currentStep ? '#fff' : 'var(--vm-text-muted)',
                border: i > currentStep ? '1px solid var(--vm-border-subtle)' : 'none',
                transition: 'all .3s',
              }}>
                {i < currentStep ? <Box component="svg" viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={3}><polyline points="20 6 9 17 4 12" /></Box> : (step.icon || i + 1)}
              </Box>
              <Typography sx={{
                fontSize: 12, fontWeight: i === currentStep ? 700 : 500,
                color: i <= currentStep ? 'var(--vm-text-primary)' : 'var(--vm-text-muted)',
                display: { xs: i === currentStep ? 'block' : 'none', sm: 'block' },
                whiteSpace: 'nowrap',
              }}>{step.label}</Typography>
            </Box>
            {i < steps.length - 1 && (
              <Box sx={{
                width: 20, height: 1,
                bgcolor: i < currentStep ? 'var(--vm-primary-500)' : 'var(--vm-border-subtle)',
                display: { xs: 'none', sm: 'block' },
                transition: 'background .3s',
              }} />
            )}
          </Box>
        ))}
      </Box>

      {children}

      {showNav && (
        <Box sx={{ mt: 2.5, display: 'flex', justifyContent: 'space-between' }}>
          <Box>
            {onBack && currentStep > 0 && (
              <IconButton onClick={onBack} size="small" sx={{ color: 'var(--vm-text-muted)', border: '1px solid var(--vm-border-subtle)', borderRadius: 2 }}>
                <ChevronLeft size={18} />
              </IconButton>
            )}
          </Box>
          <Box>
            {onNext && currentStep < steps.length - 1 && (
              <IconButton onClick={onNext} size="small" sx={{ color: 'var(--vm-primary-400)', border: '1px solid var(--vm-primary-600)', borderRadius: 2 }}>
                <ChevronRight size={18} />
              </IconButton>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}
