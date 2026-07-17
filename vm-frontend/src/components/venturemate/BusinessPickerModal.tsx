import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  Card,
} from '@mui/material';
import { GradientButton } from '../shared/buttons';
import { Plus } from 'lucide-react';
import { useBusiness } from '../../contexts/BusinessContext';
import type { ViewType } from '../../types/venturemate';

interface BusinessPickerModalProps {
  open: boolean;
  targetView: ViewType | null;
  onClose: () => void;
  onSelectBusiness: (businessId: string) => void;
  onCreateBusiness: () => void;
  isSwitching?: boolean;
}

const viewTitles: Record<ViewType, string> = {
  dashboard: 'Dashboard',
  businesses: 'My Businesses',
  'business-overview': 'Business Overview',
  'ai-assistant': 'AI Assistant',
  'pitch-deck': 'Pitch Deck',
  'business-plan': 'Business Plan',
  'branding-kit': 'Branding Kit',
  'website-builder': 'Website Builder',
  websites: 'Websites',
  milestones: 'Milestones',
  documents: 'Documents',
  team: 'Team',
  'business-settings': 'Settings',
  network: 'Network',
  investors: 'Investors',
  cofounders: 'Co-founders',
  messages: 'Messages',
  'ai-tools': 'AI Tools',
  'generate-idea': 'Generate Idea',
  'market-research': 'Market Research',
  'financial-forecast': 'Financial Forecast',
  crm: 'CRM',
  companies: 'Companies',
  invoices: 'Invoices',
  expenditure: 'Expenditure',
  banking: 'Banking',
  social: 'Social Media',
  marketplace: 'Marketplace',
  'credit-score': 'Credit Score',
  'health-score': 'Health Score',
  account: 'Account',
  profile: 'Profile',
  billing: 'Billing',
  settings: 'Settings',
  calendar: 'Calendar',
  'email-settings': 'Email Sync',
};

export function BusinessPickerModal({
  open,
  targetView,
  onClose,
  onSelectBusiness,
  onCreateBusiness,
  isSwitching = false,
}: BusinessPickerModalProps) {
  const { businesses } = useBusiness();
  const title = targetView ? viewTitles[targetView] : 'this feature';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'var(--vm-bg-secondary)',
          backgroundImage: 'none',
          border: '1px solid var(--vm-border-subtle)',
          borderRadius: 3,
        },
      }}
    >
      <DialogTitle
        sx={{
          color: 'var(--vm-text-primary)',
          fontSize: 20,
          fontWeight: 700,
          pb: 1,
        }}
      >
        Choose a Business
      </DialogTitle>
      <DialogContent sx={{ pt: 0 }}>
        <Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 14, mb: 3 }}>
          {isSwitching 
            ? 'Select a different business to work with.' 
            : `Select which business you want to use for ${title}.`
          }
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, justifyContent: 'center' }}>
          {businesses.map((business) => (
            <Card
              key={business.id}
              onClick={() => onSelectBusiness(business.id)}
              sx={{
                bgcolor: 'var(--vm-bg-primary)',
                border: '1px solid var(--vm-border-subtle)',
                borderRadius: 2,
                p: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: 'var(--vm-primary-600)',
                  bgcolor: 'var(--vm-bg-hover)',
                },
              }}
            >
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  background: `linear-gradient(135deg, ${business.brandKit.primaryColor} 0%, ${business.brandKit.secondaryColor} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Typography sx={{ fontSize: 20, fontWeight: 700, color: 'white' }}>
                  {business.name[0]}
                </Typography>
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  sx={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: 'var(--vm-text-primary)',
                  }}
                >
                  {business.name}
                </Typography>
                <Typography
                  sx={{
                    fontSize: 13,
                    color: 'var(--vm-text-muted)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {business.tagline}
                </Typography>
              </Box>
              <Box
                sx={{
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 1,
                  bgcolor: 'var(--vm-primary-900)',
                  color: 'var(--vm-primary-400)',
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'capitalize',
                }}
              >
                {business.stage}
              </Box>
            </Card>
          ))}

          <GradientButton
            onClick={onCreateBusiness}
            variant="outline"
            size="md"
            fullWidth
            sx={{
              justifyContent: 'center',
              py: 1.5,
              px: 2,
              borderRadius: 2,
              border: '1px dashed var(--vm-border-primary)',
              color: 'var(--vm-text-muted)',
              fontSize: 14,
              fontWeight: 500,
              textTransform: 'none',
              '&:hover': {
                borderColor: 'var(--vm-primary-600)',
                color: 'var(--vm-primary-400)',
                bgcolor: 'var(--vm-bg-hover)',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Plus size={18} />
              Create new business
            </Box>
          </GradientButton>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
