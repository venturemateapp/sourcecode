import { Box, TextField } from '@mui/material';

interface WelcomeStepProps {
  data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
  };
  updateData: (updates: Partial<WelcomeStepProps['data']>) => void;
}

export function WelcomeStep({ data, updateData }: WelcomeStepProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
        <TextField
          fullWidth
          label="First name"
          value={data.firstName}
          onChange={(e) => updateData({ firstName: e.target.value })}
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
          label="Last name"
          value={data.lastName}
          onChange={(e) => updateData({ lastName: e.target.value })}
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
      </Box>

      <TextField
        fullWidth
        type="email"
        label="Email address"
        value={data.email}
        onChange={(e) => updateData({ email: e.target.value })}
        placeholder="you@startup.com"
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

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
        <TextField
          fullWidth
          type="password"
          label="Password"
          value={data.password}
          onChange={(e) => updateData({ password: e.target.value })}
          placeholder="••••••••"
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
          type="password"
          label="Confirm password"
          value={data.confirmPassword}
          onChange={(e) => updateData({ confirmPassword: e.target.value })}
          placeholder="••••••••"
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
      </Box>
    </Box>
  );
}
