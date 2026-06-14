import { Box } from '@mui/material';

export function AnimatedBackground() {
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgcolor: '#0a0a0f',
        overflow: 'hidden',
        zIndex: -1,
      }}
    >
      {/* Base gradient */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(ellipse at 20% 20%, rgba(16, 185, 129, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 80%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, rgba(139, 92, 246, 0.05) 0%, transparent 70%)
          `,
        }}
      />

      {/* Animated orbs */}
      <Box
        sx={{
          position: 'absolute',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.4) 0%, transparent 70%)',
          filter: 'blur(80px)',
          top: '-10%',
          left: '-10%',
          animation: 'float1 20s ease-in-out infinite',
          '@keyframes float1': {
            '0%, 100%': { transform: 'translate(0, 0) scale(1)', opacity: 0.5 },
            '33%': { transform: 'translate(100px, 50px) scale(1.1)', opacity: 0.7 },
            '66%': { transform: 'translate(50px, 100px) scale(0.9)', opacity: 0.4 },
          },
        }}
      />

      <Box
        sx={{
          position: 'absolute',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.35) 0%, transparent 70%)',
          filter: 'blur(70px)',
          bottom: '-5%',
          right: '-5%',
          animation: 'float2 25s ease-in-out infinite',
          '@keyframes float2': {
            '0%, 100%': { transform: 'translate(0, 0) scale(1)', opacity: 0.4 },
            '50%': { transform: 'translate(-80px, -60px) scale(1.15)', opacity: 0.6 },
          },
        }}
      />

      <Box
        sx={{
          position: 'absolute',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)',
          filter: 'blur(60px)',
          top: '40%',
          left: '60%',
          animation: 'float3 18s ease-in-out infinite',
          display: { xs: 'none', md: 'block' },
          '@keyframes float3': {
            '0%, 100%': { transform: 'translate(0, 0) scale(1)', opacity: 0.3 },
            '50%': { transform: 'translate(-100px, 80px) scale(1.2)', opacity: 0.5 },
          },
        }}
      />

      <Box
        sx={{
          position: 'absolute',
          width: 350,
          height: 350,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.25) 0%, transparent 70%)',
          filter: 'blur(50px)',
          bottom: '30%',
          left: '10%',
          animation: 'float4 22s ease-in-out infinite',
          display: { xs: 'none', md: 'block' },
          '@keyframes float4': {
            '0%, 100%': { transform: 'translate(0, 0)', opacity: 0.25 },
            '50%': { transform: 'translate(60px, -40px)', opacity: 0.4 },
          },
        }}
      />

      {/* Grid pattern overlay */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          opacity: 0.5,
        }}
      />

      {/* Glowing particles */}
      {[...Array(20)].map((_, i) => {
        const colors = ['rgba(16, 185, 129, 0.8)', 'rgba(59, 130, 246, 0.8)', 'rgba(139, 92, 246, 0.8)'];
        const color = colors[i % 3];
        const size = 2 + (i % 5) + 0.5;
        const left = (i * 5) % 100;
        const top = (i * 7) % 100;
        const animDuration = 3 + (i % 5);
        const animDelay = (i % 6) * 0.8;
        return (
          <Box
            key={i}
            sx={{
              position: 'absolute',
              width: size,
              height: size,
              borderRadius: '50%',
              background: color,
              boxShadow: `0 0 10px ${color}`,
              left: `${left}%`,
              top: `${top}%`,
              animation: `twinkle ${animDuration}s ease-in-out infinite`,
              animationDelay: `${animDelay}s`,
              opacity: 0.2 + ((i % 4) * 0.2),
              '@keyframes twinkle': {
                '0%, 100%': { opacity: 0.2, transform: 'scale(1)' },
                '50%': { opacity: 1, transform: 'scale(1.5)' },
              },
            }}
          />
        );
      })}

      {/* Infinity symbol glow effect */}
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 800,
          height: 400,
          opacity: 0.1,
          background: `
            radial-gradient(ellipse 100% 50% at 30% 50%, rgba(16, 185, 129, 0.5) 0%, transparent 50%),
            radial-gradient(ellipse 100% 50% at 70% 50%, rgba(59, 130, 246, 0.5) 0%, transparent 50%)
          `,
          filter: 'blur(60px)',
          animation: 'pulse 8s ease-in-out infinite',
          '@keyframes pulse': {
            '0%, 100%': { opacity: 0.08, transform: 'translate(-50%, -50%) scale(1)' },
            '50%': { opacity: 0.15, transform: 'translate(-50%, -50%) scale(1.05)' },
          },
        }}
      />
    </Box>
  );
}
