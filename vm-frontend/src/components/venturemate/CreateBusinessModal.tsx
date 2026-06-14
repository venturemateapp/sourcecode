import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  TextField,
  MenuItem,
  Stack,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import { GradientButton } from '../shared/buttons';
import type { Business } from '../../types/venturemate';

interface CreateBusinessModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (business: Partial<Business>) => void;
}

const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'E-commerce',
  'SaaS',
  'AI/ML',
  'Blockchain',
  'Clean Energy',
  'AgriTech',
  'HealthTech',
  'EdTech',
  'Consumer',
  'Enterprise',
  'Other',
];

const STAGES = [
  { value: 'idea', label: 'Idea' },
  { value: 'mvp', label: 'MVP' },
  { value: 'beta', label: 'Beta' },
  { value: 'launched', label: 'Launched' },
  { value: 'scaling', label: 'Scaling' },
  { value: 'profitable', label: 'Profitable' },
];

const STEPS = ['Basic Info', 'Details', 'Brand Colors'];

export function CreateBusinessModal({ open, onClose, onCreate }: CreateBusinessModalProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    tagline: '',
    description: '',
    industry: '',
    stage: 'idea',
    location: '',
    primaryColor: '#10b981',
    secondaryColor: '#059669',
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (activeStep < STEPS.length - 1) {
      setActiveStep((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = () => {
    const newBusiness: Partial<Business> = {
      name: formData.name,
      tagline: formData.tagline,
      description: formData.description,
      industry: formData.industry,
      stage: formData.stage as Business['stage'],
      location: formData.location,
      foundedDate: new Date().toISOString().split('T')[0],
      brandKit: {
        logo: '',
        logoWhite: '',
        logoIcon: '',
        primaryColor: formData.primaryColor,
        secondaryColor: formData.secondaryColor,
        accentColor: '#34d399',
        darkColor: '#064e3b',
        fontHeading: 'Inter',
        fontBody: 'Inter',
        patterns: [],
        socialBanners: [],
      },
      pitchDeck: {
        id: `pd_${Date.now()}`,
        title: `${formData.name} - Pitch Deck`,
        slides: [],
        template: 'modern',
        lastModified: new Date().toISOString(),
        exportFormats: ['pdf'],
        views: 0,
      },
      businessPlan: {
        id: `bp_${Date.now()}`,
        title: `${formData.name} Business Plan`,
        sections: [],
        executiveSummary: '',
        lastModified: new Date().toISOString(),
        version: '1.0',
        exportFormats: ['pdf', 'docx'],
      },
      milestones: [],
      team: [],
      documents: [],
      websiteConfig: {
        id: `ws_${Date.now()}`,
        subdomain: '',
        template: 'modern',
        pages: [],
        status: 'draft',
        seo: {
          title: '',
          description: '',
          keywords: [],
        },
        analytics: {},
      },
      financials: {
        fundingRaised: 0,
        fundingRounds: [],
        revenue: {
          currentMRR: 0,
          currentARR: 0,
          growthRate: 0,
          history: [],
        },
        expenses: {
          monthlyBurn: 0,
          breakdown: [],
        },
        runway: 0,
        burnRate: 0,
        projections: [],
      },
      metrics: {
        totalUsers: 0,
        activeUsers: 0,
        retentionRate: 0,
        churnRate: 0,
        nps: 0,
        cac: 0,
        ltv: 0,
        customMetrics: [],
      },
      aiGenerated: {
        ideas: [],
      },
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    onCreate(newBusiness);
    onClose();
    setActiveStep(0);
    setFormData({
      name: '',
      tagline: '',
      description: '',
      industry: '',
      stage: 'idea',
      location: '',
      primaryColor: '#10b981',
      secondaryColor: '#059669',
    });
  };

  const isStepValid = () => {
    switch (activeStep) {
      case 0:
        return formData.name.trim().length > 0 && formData.tagline.trim().length > 0;
      case 1:
        return formData.industry.length > 0 && formData.location.trim().length > 0;
      case 2:
        return true;
      default:
        return false;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
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
        Create New Business
      </DialogTitle>

      <DialogContent sx={{ pt: 0 }}>
        <Stepper
          activeStep={activeStep}
          sx={{
            mb: 4,
            '& .MuiStepLabel-label': { color: 'var(--vm-text-muted)' },
            '& .MuiStepLabel-label.Mui-active': { color: 'var(--vm-primary-400)' },
            '& .MuiStepLabel-label.Mui-completed': { color: 'var(--vm-primary-500)' },
            '& .MuiSvgIcon-root': { color: 'var(--vm-bg-tertiary)' },
            '& .MuiSvgIcon-root.Mui-active': { color: 'var(--vm-primary-600)' },
            '& .MuiSvgIcon-root.Mui-completed': { color: 'var(--vm-primary-500)' },
          }}
        >
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box sx={{ minHeight: 300 }}>
          {activeStep === 0 && (
            <Stack spacing={3}>
              <Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 14, mb: 1 }}>
                Let's start with the basics of your new venture.
              </Typography>

              <TextField
                label="Business Name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g., EcoTech Solutions"
                fullWidth
                required
                sx={{
                  '& .MuiInputBase-root': {
                    bgcolor: 'var(--vm-bg-primary)',
                    color: 'var(--vm-text-primary)',
                  },
                  '& .MuiInputLabel-root': { color: 'var(--vm-text-muted)' },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' },
                }}
              />

              <TextField
                label="Tagline"
                value={formData.tagline}
                onChange={(e) => handleChange('tagline', e.target.value)}
                placeholder="e.g., Sustainable tech for a better tomorrow"
                fullWidth
                required
                helperText="A short, catchy description of your business"
                sx={{
                  '& .MuiInputBase-root': {
                    bgcolor: 'var(--vm-bg-primary)',
                    color: 'var(--vm-text-primary)',
                  },
                  '& .MuiInputLabel-root': { color: 'var(--vm-text-muted)' },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' },
                  '& .MuiFormHelperText-root': { color: 'var(--vm-text-muted)' },
                }}
              />

              <TextField
                label="Description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Describe what your business does..."
                fullWidth
                multiline
                rows={3}
                sx={{
                  '& .MuiInputBase-root': {
                    bgcolor: 'var(--vm-bg-primary)',
                    color: 'var(--vm-text-primary)',
                  },
                  '& .MuiInputLabel-root': { color: 'var(--vm-text-muted)' },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' },
                }}
              />
            </Stack>
          )}

          {activeStep === 1 && (
            <Stack spacing={3}>
              <Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 14, mb: 1 }}>
                Tell us more about your business stage and location.
              </Typography>

              <TextField
                select
                label="Industry"
                value={formData.industry}
                onChange={(e) => handleChange('industry', e.target.value)}
                fullWidth
                required
                sx={{
                  '& .MuiInputBase-root': {
                    bgcolor: 'var(--vm-bg-primary)',
                    color: 'var(--vm-text-primary)',
                  },
                  '& .MuiInputLabel-root': { color: 'var(--vm-text-muted)' },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' },
                }}
              >
                {INDUSTRIES.map((industry) => (
                  <MenuItem key={industry} value={industry}>
                    {industry}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label="Stage"
                value={formData.stage}
                onChange={(e) => handleChange('stage', e.target.value)}
                fullWidth
                sx={{
                  '& .MuiInputBase-root': {
                    bgcolor: 'var(--vm-bg-primary)',
                    color: 'var(--vm-text-primary)',
                  },
                  '& .MuiInputLabel-root': { color: 'var(--vm-text-muted)' },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' },
                }}
              >
                {STAGES.map((stage) => (
                  <MenuItem key={stage.value} value={stage.value}>
                    {stage.label}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Location"
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                placeholder="e.g., San Francisco, CA"
                fullWidth
                required
                sx={{
                  '& .MuiInputBase-root': {
                    bgcolor: 'var(--vm-bg-primary)',
                    color: 'var(--vm-text-primary)',
                  },
                  '& .MuiInputLabel-root': { color: 'var(--vm-text-muted)' },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' },
                }}
              />
            </Stack>
          )}

          {activeStep === 2 && (
            <Stack spacing={3}>
              <Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 14, mb: 1 }}>
                Choose your brand colors. You can change these later.
              </Typography>

              <Box>
                <Typography sx={{ color: 'var(--vm-text-primary)', fontSize: 14, mb: 2 }}>
                  Primary Color
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <input
                    type="color"
                    value={formData.primaryColor}
                    onChange={(e) => handleChange('primaryColor', e.target.value)}
                    style={{ width: 60, height: 40, border: 'none', borderRadius: 8, cursor: 'pointer' }}
                  />
                  <TextField
                    value={formData.primaryColor}
                    onChange={(e) => handleChange('primaryColor', e.target.value)}
                    sx={{
                      width: 120,
                      '& .MuiInputBase-root': {
                        bgcolor: 'var(--vm-bg-primary)',
                        color: 'var(--vm-text-primary)',
                      },
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' },
                    }}
                  />
                </Box>
              </Box>

              <Box>
                <Typography sx={{ color: 'var(--vm-text-primary)', fontSize: 14, mb: 2 }}>
                  Secondary Color
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <input
                    type="color"
                    value={formData.secondaryColor}
                    onChange={(e) => handleChange('secondaryColor', e.target.value)}
                    style={{ width: 60, height: 40, border: 'none', borderRadius: 8, cursor: 'pointer' }}
                  />
                  <TextField
                    value={formData.secondaryColor}
                    onChange={(e) => handleChange('secondaryColor', e.target.value)}
                    sx={{
                      width: 120,
                      '& .MuiInputBase-root': {
                        bgcolor: 'var(--vm-bg-primary)',
                        color: 'var(--vm-text-primary)',
                      },
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' },
                    }}
                  />
                </Box>
              </Box>

              <Box
                sx={{
                  p: 3,
                  borderRadius: 2,
                  bgcolor: 'var(--vm-bg-primary)',
                  border: '1px solid var(--vm-border-subtle)',
                  mt: 2,
                }}
              >
                <Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 12, mb: 1 }}>
                  Preview
                </Typography>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 2,
                    background: `linear-gradient(135deg, ${formData.primaryColor} 0%, ${formData.secondaryColor} 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography sx={{ fontSize: 24, fontWeight: 700, color: 'white' }}>
                    {formData.name[0] || '?'}
                  </Typography>
                </Box>
              </Box>
            </Stack>
          )}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, pt: 2, borderTop: '1px solid var(--vm-border-subtle)' }}>
          <GradientButton
            variant="ghost"
            size="md"
            onClick={activeStep === 0 ? onClose : handleBack}
          >
            {activeStep === 0 ? 'Cancel' : 'Back'}
          </GradientButton>

          <GradientButton
            variant="primary"
            size="md"
            onClick={handleNext}
            disabled={!isStepValid()}
          >
            {activeStep === STEPS.length - 1 ? 'Create Business' : 'Next'}
          </GradientButton>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
