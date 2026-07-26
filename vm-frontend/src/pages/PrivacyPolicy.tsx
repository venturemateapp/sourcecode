import { Box, Typography, Container } from '@mui/material';

export function PrivacyPolicy() {
  return (
    <Box sx={{ bgcolor: '#0f172a', minHeight: '100vh', color: '#e2e8f0', py: 6 }}>
      <Container maxWidth="md">
        <Typography sx={{ fontSize: 32, fontWeight: 800, color: '#10b981', mb: 1 }}>Privacy Policy</Typography>
        <Typography sx={{ fontSize: 13, color: '#64748b', mb: 4 }}>Last updated: July 26, 2026</Typography>

        <Section title="1. Information We Collect">
          <p>We collect information you provide when creating an account, including your name, email address, and business details. When you sign in with Google, we receive your name, email, and profile picture from Google. If you connect your Google Calendar, we access your calendar events to display them in our app.</p>
        </Section>

        <Section title="2. How We Use Your Information">
          <p>We use your information to: provide and maintain our services, display your synced calendar events, send invoice emails to your customers on your behalf, improve and personalize your experience, and communicate with you about your account.</p>
        </Section>

        <Section title="3. Google Calendar Data">
          <p>If you connect your Google Calendar, we only read your calendar events to display them within our app. We never modify, delete, or share your calendar data with third parties. You can disconnect your calendar at any time, which removes our access to your calendar data.</p>
        </Section>

        <Section title="4. Data Sharing">
          <p>We do not sell your personal data. We may share data with service providers (e.g., cloud hosting, email delivery) who are contractually bound to protect your data. We may disclose data if required by law.</p>
        </Section>

        <Section title="5. Data Security">
          <p>We implement industry-standard security measures including encryption in transit (TLS) and at rest. OAuth tokens are stored encrypted in our database. Access to your data is restricted to authorized personnel only.</p>
        </Section>

        <Section title="6. Data Retention">
          <p>We retain your data for as long as your account is active. If you delete your account, your data is permanently deleted within 30 days. Google Calendar tokens can be revoked at any time via Google's security settings.</p>
        </Section>

        <Section title="7. Your Rights">
          <p>You can access, update, or delete your data at any time through your account settings. You can revoke Google Calendar access via your Google Account settings. Contact us at support@venturemate.net for data requests.</p>
        </Section>

        <Section title="8. Contact">
          <p>For privacy-related inquiries, contact us at:<br />Email: support@venturemate.net<br />Address: VentureMate Inc., [Your Address]</p>
        </Section>
      </Container>
    </Box>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mb: 4 }}>
      <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#10b981', mb: 1.5 }}>{title}</Typography>
      <Typography sx={{ fontSize: 14, color: '#cbd5e1', lineHeight: 1.8 }}>{children}</Typography>
    </Box>
  );
}
