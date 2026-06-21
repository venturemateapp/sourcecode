import { createContext, useContext, useEffect, type ReactNode } from 'react';

type Theme = 'dark' | 'light';

type ThemeContextValue = {
  theme: Theme;
  setTheme: (_theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const STORAGE_KEY = 'venturemate_theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = 'dark';
    localStorage.setItem(STORAGE_KEY, 'dark');
  }, []);

  // VentureMate is a dark-theme product. These methods remain for compatibility
  // with older components, but intentionally keep the application in dark mode.
  const setTheme = (_theme: Theme) => {
    document.documentElement.classList.add('dark');
    localStorage.setItem(STORAGE_KEY, 'dark');
  };
  const toggleTheme = () => setTheme('dark');

  return (
    <ThemeContext.Provider value={{ theme: 'dark', setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
