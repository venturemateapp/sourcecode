import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './contexts/ThemeContext.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx'
import { MuiThemeProvider } from './theme/MuiThemeProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <ThemeProvider>
        <MuiThemeProvider>
          <App />
        </MuiThemeProvider>
      </ThemeProvider>
    </AuthProvider>
  </StrictMode>,
)
