import { ThemeProvider as MUIThemeProvider } from '@mui/material/styles'
import { useTheme } from '../contexts/ThemeContext'
import { lightTheme, darkTheme } from './muiTheme'

export function MuiThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme()
  const muiTheme = theme === 'dark' ? darkTheme : lightTheme

  return <MUIThemeProvider theme={muiTheme}>{children}</MUIThemeProvider>
}
