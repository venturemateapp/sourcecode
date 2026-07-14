import { Box, Typography } from '@mui/material';
import { Bot } from 'lucide-react';
import type { ViewType } from '../../types/venturemate';
import { useBusiness } from '../../contexts/BusinessContext';
import { NoBusinessSelected } from '../../components/venturemate/NoBusinessSelected';
import { AIChatPanel } from '../../components/venturemate/AIChatPanel';

interface AIAssistantProps {
  onViewChange?: (view: ViewType) => void;
}

export function AIAssistant(_props: AIAssistantProps) {
  const { selectedBusiness } = useBusiness();

  if (!selectedBusiness) {
    return <NoBusinessSelected message="Select a business to use the AI assistant." />;
  }

  return (
    <Box sx={{ px: { xs: 0, sm: 1, md: 2 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2.5,
            background: 'linear-gradient(135deg, var(--vm-primary-600), var(--vm-primary-400))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Bot size={23} color="white" />
        </Box>
        <Box>
          <Typography sx={{ fontSize: { xs: 19, sm: 23 }, fontWeight: 800, color: 'var(--vm-text-primary)' }}>
            AI Operations Assistant
          </Typography>
          <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>
            Powered by DeepSeek V4 Flash. Describe what you need and the AI will handle it.
          </Typography>
        </Box>
      </Box>
      <AIChatPanel domain="general" mode="page" />
    </Box>
  );
}
