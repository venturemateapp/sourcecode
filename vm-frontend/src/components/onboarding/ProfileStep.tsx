import { Box, Typography, TextField, Chip } from '@mui/material';

const commonSkills = [
  'Product Strategy',
  'Engineering',
  'Design',
  'Marketing',
  'Sales',
  'Finance',
  'Operations',
  'AI/ML',
  'Fundraising',
  'Growth',
];

interface ProfileStepProps {
  data: {
    location: string;
    bio: string;
    skills: string[];
  };
  updateData: (updates: Partial<ProfileStepProps['data']>) => void;
}

export function ProfileStep({ data, updateData }: ProfileStepProps) {
  const toggleSkill = (skill: string) => {
    const exists = data.skills.includes(skill);
    updateData({
      skills: exists ? data.skills.filter((s) => s !== skill) : [...data.skills, skill],
    });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <TextField
        fullWidth
        label="Location"
        placeholder="e.g. San Francisco, CA"
        value={data.location}
        onChange={(e) => updateData({ location: e.target.value })}
        sx={{
          '& .MuiInputBase-root': {
            bgcolor: 'rgba(255,255,255,0.03)',
            borderRadius: 2,
            color: '#fff',
          },
          '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' },
          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' },
        }}
      />

      <TextField
        fullWidth
        multiline
        rows={3}
        label="Bio"
        placeholder="Tell us about your background and what drives you..."
        value={data.bio}
        onChange={(e) => updateData({ bio: e.target.value })}
        sx={{
          '& .MuiInputBase-root': {
            bgcolor: 'rgba(255,255,255,0.03)',
            borderRadius: 2,
            color: '#fff',
          },
          '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' },
          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' },
        }}
      />

      <Box>
        <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)', mb: 1.5 }}>
          Select your top skills
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, maxWidth: '100%' }}>
          {commonSkills.map((skill) => {
            const selected = data.skills.includes(skill);
            return (
              <Chip
                key={skill}
                label={skill}
                onClick={() => toggleSkill(skill)}
                sx={{
                  cursor: 'pointer',
                  borderRadius: '9999px',
                  fontWeight: 500,
                  transition: 'all 0.2s',
                  bgcolor: selected ? 'rgba(52, 211, 153, 0.15)' : 'rgba(255,255,255,0.05)',
                  color: selected ? '#34d399' : 'rgba(255,255,255,0.7)',
                  border: '1px solid',
                  borderColor: selected ? 'rgba(52, 211, 153, 0.4)' : 'rgba(255,255,255,0.1)',
                  maxWidth: '100%',
                  '& .MuiChip-label': { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', py: 0.5 },
                  '&:hover': {
                    bgcolor: selected ? 'rgba(52, 211, 153, 0.25)' : 'rgba(255,255,255,0.1)',
                  },
                }}
              />
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}
