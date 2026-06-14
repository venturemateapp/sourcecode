import MuiTextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import { useState, forwardRef } from 'react'
import type { ReactNode } from 'react'
import type { TextFieldProps as MUITextFieldProps } from '@mui/material/TextField'

export interface TextFieldProps extends Omit<MUITextFieldProps, 'id' | 'variant'> {
  id: string
  label: string
  endAdornment?: ReactNode
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField({ id, label, type = 'text', endAdornment, ...props }, ref) {
    const [showPassword, setShowPassword] = useState(false)
    const isPassword = type === 'password'
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type

    const adornment = isPassword ? (
      <InputAdornment position="end">
        <IconButton
          onClick={() => setShowPassword((v) => !v)}
          edge="end"
          sx={{ color: 'rgba(255,255,255,0.5)', p: 1 }}
        >
          {showPassword ? <VisibilityOff /> : <Visibility />}
        </IconButton>
      </InputAdornment>
    ) : endAdornment ? (
      <InputAdornment position="end">{endAdornment}</InputAdornment>
    ) : undefined

    return (
      <MuiTextField
        ref={ref}
        id={id}
        label={label}
        type={inputType}
        variant="outlined"
        fullWidth
        slotProps={{
          input: {
            endAdornment: adornment,
            sx: {
              borderRadius: '10px',
              backgroundColor: 'rgba(255,255,255,0.05)',
              color: '#fff',
              fontSize: '15px',
              py: 0.75,
              '& fieldset': {
                borderColor: 'rgba(255,255,255,0.2)',
              },
              '&:hover fieldset': {
                borderColor: 'rgba(255,255,255,0.3)',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#34d399',
              },
            },
          },
        }}
        sx={{
          '& .MuiInputLabel-root': {
            color: 'rgba(255,255,255,0.5)',
            fontSize: '15px',
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: '#34d399',
          },
          '& .MuiInputLabel-shrink': {
            fontSize: '13px',
          },
          ...props.sx,
        }}
        {...props}
      />
    )
  }
)
