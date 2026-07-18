import { useState } from 'react';
import { Box, Typography, TextField, Chip, Stack } from '@mui/material';
import { Business, Add } from '@mui/icons-material';
import { GradientButton } from '../shared/buttons';
import type { OnboardingData } from './OnboardingWizard';

interface BusinessStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  industries: string[];
}

export function BusinessStep({ data, updateData, industries }: BusinessStepProps) {
  const [customIndustry, setCustomIndustry] = useState('');

  const selectIndustry = (industry: string) => {
    updateData({ industry });
  };

  const setCustom = () => {
    if (customIndustry) {
      updateData({ industry: customIndustry });
      setCustomIndustry('');
    }
  };

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
        <Business sx={{ fontSize: 40, color: '#fff' }} />
      </Box>

      <Typography variant="h4" fontWeight={700} sx={{ mb: 2, color: 'var(--vm-text-primary)' }}>
        Your Business Interest
      </Typography>
      <Typography sx={{ mb: 4, color: 'var(--vm-text-muted)' }}>
        Select the industry that best describes your business
      </Typography>

      <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="center" sx={{ mb: 3, gap: 1 }}>
        {industries.map((industry) => {
          const isSelected = data.industry === industry;
          return (
             <Chip
              key={industry}
              label={industry}
              onClick={() => selectIndustry(industry)}
              sx={{
                bgcolor: isSelected ? 'var(--vm-primary-600)' : 'var(--vm-bg-tertiary)',
                color: isSelected ? '#fff' : 'var(--vm-text-secondary)',
                border: '1px solid',
                borderColor: isSelected ? 'var(--vm-primary-500)' : 'var(--vm-border-primary)',
                maxWidth: '100%',
                '& .MuiChip-label': { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', py: 0.5 },
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: isSelected ? 'var(--vm-primary-500)' : 'var(--vm-bg-hover)',
                },
              }}
            />
          );
        })}
      </Stack>

      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
        <TextField
          size="small"
          placeholder="Or type your own"
          value={customIndustry}
          onChange={(e) => setCustomIndustry(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && setCustom()}
          sx={{
            width: 200,
            '& .MuiInputBase-root': {
              bgcolor: 'var(--vm-bg-tertiary)',
              color: 'var(--vm-text-primary)',
            },
          }}
        />
        <GradientButton variant="secondary" size="sm" onClick={setCustom}>
          <Add />
        </GradientButton>
      </Box>

      {data.industry && (
        <Typography sx={{ mt: 3, color: 'var(--vm-primary-400)' }}>
          Selected: {data.industry}
        </Typography>
      )}
    </Box>
  );
}
