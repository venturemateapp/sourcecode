import { Box, Typography } from '@mui/material';

interface LogoBadgeProps {
  logo?: string;
  name?: string;
  size?: number | Record<string, number>;
  radius?: number | string;
}

/**
 * Logo rendered as a CSS background (not an <img>) so html2canvas captures it
 * reliably during PDF export — background images clip with border-radius,
 * Avatar/img elements do not.
 */
export function LogoBadge({ logo, name, size = 34, radius = 10 }: LogoBadgeProps) {
  const initial = ((name || 'V').trim().charAt(0) || 'V').toUpperCase();
  const fontSize = typeof size === 'number' ? size * 0.38 : { xs: 13, sm: 16 };
  return (
    <Box sx={{
      width: size, height: size, flexShrink: 0, borderRadius: radius, overflow: 'hidden',
      bgcolor: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)',
      display: 'grid', placeItems: 'center',
      ...(logo ? {
        backgroundImage: `url(${logo})`,
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        bgcolor: 'rgba(255,255,255,.04)',
      } : {}),
    }}>
      {!logo && (
        <Typography sx={{ fontSize, fontWeight: 700, color: 'rgba(255,255,255,.6)', lineHeight: 1 }}>
          {initial}
        </Typography>
      )}
    </Box>
  );
}
