import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import Snackbar from '@mui/material/Snackbar'
import Alert, { type AlertColor } from '@mui/material/Alert'

type ToastOptions = {
  description?: string
  duration?: number
}

type ToastContextValue = {
  success: (title: string, options?: ToastOptions) => void
  error: (title: string, options?: ToastOptions) => void
  info: (title: string, options?: ToastOptions) => void
  warning: (title: string, options?: ToastOptions) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState<AlertColor>('info')
  const [duration, setDuration] = useState(5000)

  const show = useCallback(
    (
      title: string,
      opts: ToastOptions = {},
      sev: AlertColor
    ) => {
      setMessage(title)
      setDescription(opts.description ?? '')
      setSeverity(sev)
      setDuration(opts.duration ?? 5000)
      setOpen(true)
    },
    []
  )

  const success = useCallback(
    (title: string, opts?: ToastOptions) => show(title, opts, 'success'),
    [show]
  )
  const error = useCallback(
    (title: string, opts?: ToastOptions) => show(title, opts, 'error'),
    [show]
  )
  const info = useCallback(
    (title: string, opts?: ToastOptions) => show(title, opts, 'info'),
    [show]
  )
  const warning = useCallback(
    (title: string, opts?: ToastOptions) => show(title, opts, 'warning'),
    [show]
  )

  return (
    <ToastContext.Provider value={{ success, error, info, warning }}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={duration}
        onClose={(_, reason) => {
          if (reason === 'clickaway') return
          setOpen(false)
        }}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          severity={severity}
          variant="filled"
          onClose={() => setOpen(false)}
          sx={theme => ({
            width: { xs: '90vw', sm: 360 },
            alignItems: 'flex-start',
            ...(severity === 'info' && {
              backgroundColor: theme.palette.success.main,
              color: '#fff',
              '& .MuiAlert-icon': { color: '#fff' },
              '& .MuiAlert-message': { color: '#fff' },
            }),
          })}
        >
          <span style={{ fontWeight: 600, display: 'block' }}>{message}</span>
          {description && (
            <span style={{ fontSize: 13, opacity: 0.9, display: 'block', marginTop: 2 }}>
              {description}
            </span>
          )}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return ctx
}
