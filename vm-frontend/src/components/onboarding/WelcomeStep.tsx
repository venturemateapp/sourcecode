import { Box } from '@mui/material';
import { TextField } from '../shared/form-fields';

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
          id="first-name"
          fullWidth
          label="First name"
          value={data.firstName}
          onChange={(e) => updateData({ firstName: e.target.value })}
        />
        <TextField
          id="last-name"
          fullWidth
          label="Last name"
          value={data.lastName}
          onChange={(e) => updateData({ lastName: e.target.value })}
        />
      </Box>

      <TextField
        id="email"
        fullWidth
        type="email"
        label="Email address"
        value={data.email}
        onChange={(e) => updateData({ email: e.target.value })}
        placeholder="you@startup.com"
      />

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
        <TextField
          id="password"
          fullWidth
          type="password"
          label="Password"
          value={data.password}
          onChange={(e) => updateData({ password: e.target.value })}
          placeholder="••••••••"
        />
        <TextField
          id="confirm-password"
          fullWidth
          type="password"
          label="Confirm password"
          value={data.confirmPassword}
          onChange={(e) => updateData({ confirmPassword: e.target.value })}
          placeholder="••••••••"
        />
      </Box>
    </Box>
  );
}
