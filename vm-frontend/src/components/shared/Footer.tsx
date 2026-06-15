import { Box, Typography, Container } from '@mui/material';

export function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        borderTop: '1px solid var(--vm-border-subtle)',
        bgcolor: 'rgba(10, 10, 15, 0.5)',
        backdropFilter: 'blur(10px)',
        py: 2,
        mt: 'auto',
        flexShrink: 0,
      }}
    >
      <Container maxWidth={false} sx={{ px: { xs: 2, sm: 3, md: 4 } }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: 'center',
            justifyContent: 'center',
            gap: { xs: 0.5, sm: 3 },
          }}
        >
          <Box sx={{ display: 'flex', gap: 3 }}>
            {['Terms', 'Privacy', 'Cookies'].map((item) => (
              <Typography
                key={item}
                sx={{
                  fontSize: { xs: 11, sm: 12 },
                  color: 'var(--vm-text-muted)',
                  cursor: 'pointer',
                  '&:hover': { color: 'var(--vm-primary-400)' },
                }}
              >
                {item}
              </Typography>
            ))}
          </Box>
          <Typography sx={{ fontSize: { xs: 11, sm: 12 }, color: 'var(--vm-text-muted)' }}>
            &copy; {new Date().getFullYear()} VentureMate. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
