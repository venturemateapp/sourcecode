import { Box } from '@mui/material';

interface AuroraBackgroundProps {
  accent?: string;
  secondary?: string;
  variant?: 'default' | 'purple' | 'blue' | 'green';
}

export function AuroraBackground({ accent = '#8b5cf6', secondary = '#2563eb' }: AuroraBackgroundProps) {
  return (
    <Box sx={{
      position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none',
      '& > *': { position: 'absolute', inset: 0 },
    }}>
      {/* Base */}
      <Box sx={{ bgcolor: '#08080b' }} />

      {/* Large ambient glow */}
      <Box sx={{
        top: -192, right: -192, width: 650, height: 650, borderRadius: '50%',
        background: `radial-gradient(circle, ${accent}22, transparent 70%)`,
        filter: 'blur(150px)',
      }} />

      {/* Secondary glow */}
      <Box sx={{
        bottom: -240, left: -160, width: 600, height: 600, borderRadius: '50%',
        background: `radial-gradient(circle, ${secondary}15, transparent 70%)`,
        filter: 'blur(160px)',
      }} />

      {/* Mesh gradient overlay */}
      <Box sx={{
        opacity: 0.3,
        background: `
          radial-gradient(circle at 20% 20%, color-mix(in srgb, ${accent} 15%, transparent), transparent 35%),
          radial-gradient(circle at 80% 70%, color-mix(in srgb, ${secondary} 12%, transparent), transparent 40%)
        `,
      }} />

      {/* Technical grid */}
      <Box sx={{
        opacity: 0.035,
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)
        `,
        backgroundSize: '48px 48px',
      }} />

      {/* Fine grain noise texture */}
      <Box sx={{
        opacity: 0.035, mixBlendMode: 'overlay',
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.55'/%3E%3C/svg%3E")`,
      }} />
    </Box>
  );
}

export function FloatingOrb({ accent = '#8b5cf6', secondary = '#2563eb' }: { accent?: string; secondary?: string }) {
  return (
    <Box sx={{
      position: 'absolute', right: 80, top: '50%', transform: 'translateY(-50%)',
      display: { xs: 'none', lg: 'block' }, pointerEvents: 'none',
    }}>
      <Box sx={{ position: 'relative', width: 430, height: 430 }}>
        {/* Outer glow */}
        <Box sx={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: `${accent}30`, filter: 'blur(100px)',
        }} />

        {/* Outer rings */}
        <Box sx={{ position: 'absolute', inset: 16, borderRadius: '50%', border: '1px solid rgba(255,255,255,.1)' }} />
        <Box sx={{ position: 'absolute', inset: 48, borderRadius: '50%', border: '1px solid rgba(255,255,255,.1)' }} />
        <Box sx={{ position: 'absolute', inset: 80, borderRadius: '50%', border: '1px solid rgba(255,255,255,.1)' }} />

        {/* Main orb */}
        <Box sx={{
          position: 'absolute', inset: 96, borderRadius: '50%', boxShadow: '0 25px 50px -12px rgba(0,0,0,.5)',
          background: `
            radial-gradient(circle at 30% 25%, rgba(255,255,255,.8), transparent 10%),
            radial-gradient(circle at 70% 70%, ${secondary}, transparent 45%),
            linear-gradient(135deg, ${accent}, ${secondary})
          `,
        }} />

        {/* Orb highlight */}
        <Box sx={{
          position: 'absolute', left: 135, top: 120, width: 80, height: 48,
          borderRadius: '50%', background: 'rgba(255,255,255,.3)', filter: 'blur(12px)',
          transform: 'rotate(-25deg)',
        }} />

        {/* Orbiting dot */}
        <Box sx={{
          position: 'absolute', right: 40, top: 80, width: 12, height: 12,
          borderRadius: '50%', background: 'white', boxShadow: '0 0 25px white',
        }} />
      </Box>
    </Box>
  );
}
