import { Box, Typography, Container } from '@mui/material';

export function Footer() {
  return (
    <Box
      sx={{
        borderTop: '1px solid var(--vm-border-subtle)',
        bgcolor: 'rgba(10, 10, 15, 0.5)',
        backdropFilter: 'blur(10px)',
        py: 2,
        flexShrink: 0,
      }}
    >
      <Container maxWidth={false} sx={{ px: { xs: 2, sm: 3, md: 4 } }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          <Box sx={{ display: 'flex', gap: 3 }}>
            {['Terms', 'Privacy', 'Cookies'].map((item) => (
              <Typography
                key={item}
                sx={{
                  fontSize: 12,
                  color: 'var(--vm-text-muted)',
                  cursor: 'pointer',
                  '&:hover': { color: 'var(--vm-primary-400)' },
                }}
              >
                {item}
              </Typography>
            ))}
          </Box>
          <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>
            &copy; {new Date().getFullYear()} VentureMate. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
