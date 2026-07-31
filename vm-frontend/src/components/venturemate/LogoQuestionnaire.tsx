import { useState } from 'react';
import { Box, Chip, TextField, Typography } from '@mui/material';
import { Sparkles } from 'lucide-react';
import { AnimatedButton } from '../shared/AnimatedButton';

export interface LogoAnswers {
  brandName: string;
  pitch: string;
  vibe: string;
  markType: string;
  colorPreference: string;
}

const VIBES = ['Modern', 'Minimal', 'Premium', 'Bold', 'Friendly', 'Playful', 'Luxury', 'Trustworthy'];
const MARK_TYPES = ['Combination (icon + text)', 'Icon only', 'Wordmark only', 'Monogram'];
const COLOR_PREFS = ['golden', 'green', 'blue', 'red', 'purple', 'black & white', 'pastel', 'no preference'];

function buildPrompt(answers: LogoAnswers): string {
  return `Create a complete brand identity and logo for my business based on these answers:

1. Brand name: ${answers.brandName.trim()}
2. What the brand does (one sentence): ${answers.pitch.trim()}
3. Vibe: ${answers.vibe}
4. Mark type: ${answers.markType}
5. Color preference: ${answers.colorPreference}

Use these answers to generate the brand kit (logo, colours, typography). Match the vibe, mark type, and colour preference exactly.`;
}

interface LogoQuestionnaireProps {
  defaultBrandName?: string;
  defaultTagline?: string;
  onSubmit: (prompt: string) => void;
  disabled?: boolean;
}

export function LogoQuestionnaire({ defaultBrandName = '', defaultTagline = '', onSubmit, disabled }: LogoQuestionnaireProps) {
  const [answers, setAnswers] = useState<LogoAnswers>({
    brandName: defaultBrandName || 'EDSPiKE',
    pitch: defaultTagline || 'Powering Progress In Education',
    vibe: 'Modern',
    markType: 'Combination (icon + text)',
    colorPreference: 'golden',
  });

  const set = (field: keyof LogoAnswers, value: string) => setAnswers(prev => ({ ...prev, [field]: value }));

  const valid = answers.brandName.trim().length > 0 && answers.pitch.trim().length > 0;

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
        <Sparkles size={20} color="var(--vm-primary-400)" />
        <Typography sx={{ color: 'var(--vm-text-primary)', fontSize: 18, fontWeight: 900 }}>
          Answer a few questions to generate your logo
        </Typography>
      </Box>
      <Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 13, mb: 3 }}>
        Your answers are used to create a brand identity tailored to your business.
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <TextField
          label="What's your brand name?"
          value={answers.brandName}
          onChange={(e) => set('brandName', e.target.value)}
          fullWidth
          required
          sx={{ '& .MuiInputBase-root': { bgcolor: 'rgba(0,0,0,.2)', color: 'var(--vm-text-primary)' }, '& .MuiInputLabel-root': { color: 'var(--vm-text-muted)' } }}
        />

        <TextField
          label="What does your brand do? (one sentence)"
          value={answers.pitch}
          onChange={(e) => set('pitch', e.target.value)}
          fullWidth
          required
          multiline
          minRows={2}
          sx={{ '& .MuiInputBase-root': { bgcolor: 'rgba(0,0,0,.2)', color: 'var(--vm-text-primary)' }, '& .MuiInputLabel-root': { color: 'var(--vm-text-muted)' } }}
        />

        <Box>
          <Typography sx={{ color: 'var(--vm-text-secondary)', fontSize: 13, fontWeight: 700, mb: 1 }}>What's the vibe?</Typography>
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
            {VIBES.map(v => (
              <Chip key={v} label={v} size="small" onClick={() => set('vibe', v)}
                sx={{ fontSize: 11, cursor: 'pointer',
                  bgcolor: answers.vibe === v ? 'var(--vm-primary-600)' : 'var(--vm-bg-tertiary)',
                  color: answers.vibe === v ? '#fff' : 'var(--vm-text-secondary)',
                  border: answers.vibe === v ? '1px solid var(--vm-primary-500)' : '1px solid var(--vm-border-primary)' }} />
            ))}
          </Box>
        </Box>

        <Box>
          <Typography sx={{ color: 'var(--vm-text-secondary)', fontSize: 13, fontWeight: 700, mb: 1 }}>Mark type?</Typography>
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
            {MARK_TYPES.map(m => (
              <Chip key={m} label={m} size="small" onClick={() => set('markType', m)}
                sx={{ fontSize: 11, cursor: 'pointer',
                  bgcolor: answers.markType === m ? 'var(--vm-primary-600)' : 'var(--vm-bg-tertiary)',
                  color: answers.markType === m ? '#fff' : 'var(--vm-text-secondary)',
                  border: answers.markType === m ? '1px solid var(--vm-primary-500)' : '1px solid var(--vm-border-primary)' }} />
            ))}
          </Box>
        </Box>

        <Box>
          <Typography sx={{ color: 'var(--vm-text-secondary)', fontSize: 13, fontWeight: 700, mb: 1 }}>Color preference?</Typography>
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
            {COLOR_PREFS.map(c => (
              <Chip key={c} label={c} size="small" onClick={() => set('colorPreference', c)}
                sx={{ fontSize: 11, cursor: 'pointer',
                  bgcolor: answers.colorPreference === c ? 'var(--vm-primary-600)' : 'var(--vm-bg-tertiary)',
                  color: answers.colorPreference === c ? '#fff' : 'var(--vm-text-secondary)',
                  border: answers.colorPreference === c ? '1px solid var(--vm-primary-500)' : '1px solid var(--vm-border-primary)' }} />
            ))}
          </Box>
        </Box>

        <AnimatedButton
          fullWidth variant="primary" size="md" icon={<Sparkles size={16} />}
          disabled={!valid || disabled} onClick={() => onSubmit(buildPrompt(answers))}
          sx={{ mt: 1 }}
        >
          Generate my logo
        </AnimatedButton>
      </Box>
    </Box>
  );
}
