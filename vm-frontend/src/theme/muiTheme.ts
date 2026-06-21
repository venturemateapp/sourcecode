import { createTheme } from '@mui/material/styles';

const shared = {
  typography: {
    fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#050f0a',
          color: '#ffffff',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          color: '#ffffff',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#0a1f16',
          color: '#ffffff',
          borderColor: 'rgba(6,95,70,.45)',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: '#0a1f16',
          color: '#ffffff',
          border: '1px solid rgba(6,95,70,.45)',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: { root: { color: '#ffffff' } },
    },
    MuiDialogContent: {
      styleOverrides: { root: { color: '#d1fae5' } },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: '#0f2e22',
          color: '#ffffff',
          border: '1px solid rgba(6,95,70,.55)',
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          color: '#ffffff',
          '&:hover': { backgroundColor: '#1a4d3a' },
          '&.Mui-selected': {
            backgroundColor: '#065f46',
            '&:hover': { backgroundColor: '#047857' },
          },
        },
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: {
          backgroundColor: '#0f2e22',
          color: '#ffffff',
          border: '1px solid rgba(6,95,70,.55)',
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          color: '#ffffff',
          backgroundColor: '#0f2e22',
        },
        input: {
          color: '#ffffff',
          '&::placeholder': { color: '#6ee7b7', opacity: 0.72 },
          '&:-webkit-autofill': {
            WebkitTextFillColor: '#ffffff',
            WebkitBoxShadow: '0 0 0 1000px #0f2e22 inset',
            transition: 'background-color 9999s ease-out 0s',
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: '#0f2e22',
          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(6,95,70,.72)' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#10b981' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#34d399' },
          '&.Mui-disabled': { backgroundColor: '#0a1f16', color: '#6ee7b7' },
        },
        input: { color: '#ffffff' },
      },
    },
    MuiFilledInput: {
      styleOverrides: {
        root: { backgroundColor: '#0f2e22', color: '#ffffff' },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: '#a7f3d0',
          '&.Mui-focused': { color: '#34d399' },
          '&.Mui-disabled': { color: '#6ee7b7' },
        },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: {
          color: '#a7f3d0',
          '&.Mui-focused': { color: '#34d399' },
        },
      },
    },
    MuiFormHelperText: {
      styleOverrides: { root: { color: '#6ee7b7' } },
    },
    MuiSelect: {
      styleOverrides: {
        select: { color: '#ffffff', backgroundColor: '#0f2e22' },
        icon: { color: '#a7f3d0' },
      },
    },
    MuiAutocomplete: {
      styleOverrides: {
        paper: { backgroundColor: '#0f2e22', color: '#ffffff' },
        option: {
          color: '#ffffff',
          '&[aria-selected="true"]': { backgroundColor: '#065f46' },
          '&.Mui-focused': { backgroundColor: '#1a4d3a' },
        },
        tag: { color: '#ffffff' },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: { backgroundColor: '#0a1f16' },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { color: '#d1fae5', borderColor: 'rgba(6,95,70,.4)' },
        head: { color: '#ffffff', backgroundColor: '#0f2e22', fontWeight: 800 },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: { backgroundColor: '#0a1f16', color: '#ffffff', backgroundImage: 'none' },
      },
    },
    MuiAccordionSummary: {
      styleOverrides: { root: { color: '#ffffff' } },
    },
    MuiAccordionDetails: {
      styleOverrides: { root: { color: '#d1fae5' } },
    },
    MuiTabs: {
      styleOverrides: { root: { color: '#a7f3d0' } },
    },
    MuiTab: {
      styleOverrides: {
        root: { color: '#6ee7b7', '&.Mui-selected': { color: '#34d399' } },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { color: '#ffffff', borderColor: 'rgba(110,231,183,.45)' },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { backgroundColor: '#143d2d', color: '#ffffff', border: '1px solid #065f46' },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 800 },
        outlined: { color: '#d1fae5', borderColor: '#047857' },
        text: { color: '#a7f3d0' },
      },
    },
    MuiIconButton: {
      styleOverrides: { root: { color: '#a7f3d0' } },
    },
    MuiTypography: {
      styleOverrides: { root: { overflowWrap: 'anywhere' } },
    },
  },
};

export const darkTheme = createTheme({
  ...shared,
  palette: {
    mode: 'dark',
    primary: { main: '#10b981', light: '#34d399', dark: '#047857' },
    secondary: { main: '#6ee7b7' },
    success: { main: '#22c55e' },
    warning: { main: '#f59e0b' },
    error: { main: '#ef4444' },
    background: { default: '#050f0a', paper: '#0a1f16' },
    text: { primary: '#ffffff', secondary: '#a7f3d0', disabled: '#6ee7b7' },
    divider: 'rgba(6,95,70,.45)',
  },
});

// VentureMate is intentionally dark-first. Keeping the exported light theme aligned
// prevents legacy toggles or stored preferences from producing unreadable white cards.
export const lightTheme = darkTheme;
