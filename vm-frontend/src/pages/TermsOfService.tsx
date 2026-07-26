import { Box, Typography, Container } from '@mui/material';

export function TermsOfService() {
  return (
    <Box sx={{ bgcolor: '#0f172a', minHeight: '100vh', color: '#e2e8f0', py: 6 }}>
      <Container maxWidth="md">
        <Typography sx={{ fontSize: 32, fontWeight: 800, color: '#10b981', mb: 1 }}>Terms of Service</Typography>
        <Typography sx={{ fontSize: 13, color: '#64748b', mb: 4 }}>Last updated: July 26, 2026</Typography>

        <Section title="1. Acceptance of Terms">
          <p>By using VentureMate, you agree to these Terms of Service. If you do not agree, do not use the service.</p>
        </Section>

        <Section title="2. Description of Service">
          <p>VentureMate provides business management tools including CRM, invoicing, calendar sync, website building, pitch deck creation, and other business productivity features.</p>
        </Section>

        <Section title="3. User Accounts">
          <p>You are responsible for maintaining the confidentiality of your account credentials. You must provide accurate information when creating an account. You may not use the service for any illegal purpose.</p>
        </Section>

        <Section title="4. Google Calendar Integration">
          <p>If you connect your Google Calendar, VentureMate will access your calendar events solely to display them within the app. You may revoke this access at any time via your Google Account settings.</p>
        </Section>

        <Section title="5. Invoice Emails">
          <p>VentureMate sends invoice emails to your customers on your behalf using your connected email account or our default email service. You are responsible for ensuring your invoices comply with applicable laws.</p>
        </Section>

        <Section title="6. Intellectual Property">
          <p>You retain ownership of all content you create using VentureMate (invoices, websites, pitch decks, etc.). VentureMate owns the platform, code, and infrastructure.</p>
        </Section>

        <Section title="7. Limitation of Liability">
          <p>VentureMate is provided "as is" without warranties. We are not liable for damages arising from your use of the service, including data loss or business interruption, to the maximum extent permitted by law.</p>
        </Section>

        <Section title="8. Termination">
          <p>We may terminate or suspend your account for violation of these terms. You may delete your account at any time, and your data will be removed within 30 days.</p>
        </Section>

        <Section title="9. Changes to Terms">
          <p>We may update these terms at any time. Continued use of VentureMate after changes constitutes acceptance of the new terms.</p>
        </Section>

        <Section title="10. Contact">
          <p>For questions about these terms, contact:<br />Email: support@venturemate.net</p>
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
