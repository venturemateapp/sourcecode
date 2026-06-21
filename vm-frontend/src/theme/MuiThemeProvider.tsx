import type { ReactNode } from 'react';
import { CssBaseline } from '@mui/material';
import { ThemeProvider as MUIThemeProvider } from '@mui/material/styles';
import { useTheme } from '../contexts/ThemeContext';
import { lightTheme, darkTheme } from './muiTheme';

export function MuiThemeProvider({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  const muiTheme = theme === 'dark' ? darkTheme : lightTheme;

  return (
    <MUIThemeProvider theme={muiTheme}>
      <CssBaseline />
      {children}
    </MUIThemeProvider>
  );
}
