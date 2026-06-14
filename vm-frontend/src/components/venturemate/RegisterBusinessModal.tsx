import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  TextField,
  Stack,
  Stepper,
  Step,
  StepLabel,
  Chip,
  Paper,
  Grid,
} from '@mui/material';
import { GradientButton } from '../shared/buttons';
import { Upload, FileText, Building2, User, Users, Briefcase, CheckCircle, ArrowRight } from 'lucide-react';
import type { Business } from '../../types/venturemate';

interface RegisterBusinessModalProps {
  open: boolean;
  onClose: () => void;
  businesses: Business[];
  onSubmit: (data: RegistrationData) => void;
}

export interface RegistrationData {
  businessId: string;
  businessType: 'sole_proprietor' | 'llc' | 'corporation' | 'partnership' | 'nonprofit';
  legalName: string;
  taxId: string;
  registrationNumber: string;
  documents: UploadedDocument[];
  ownerInfo: {
    fullName: string;
    dateOfBirth: string;
    ssn: string;
    address: string;
    phone: string;
    email: string;
  };
  businessAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

interface UploadedDocument {
  id: string;
  name: string;
  type: string;
  size: string;
}

const BUSINESS_TYPES = [
  { 
    value: 'sole_proprietor', 
    label: 'Sole Proprietor',
    description: 'Simplest structure. You and your business are legally the same entity.',
    icon: User,
    documents: ['Personal ID', 'Business Name Registration', 'Tax ID Application']
  },
  { 
    value: 'llc', 
    label: 'Limited Liability Company (LLC)',
    description: 'Separates personal and business liabilities. Most popular for startups.',
    icon: Building2,
    documents: ['Articles of Organization', 'Operating Agreement', 'EIN Letter', 'Personal ID']
  },
  { 
    value: 'corporation', 
    label: 'Corporation (C-Corp or S-Corp)',
    description: 'Complex structure with shareholders. Best for raising venture capital.',
    icon: Briefcase,
    documents: ['Articles of Incorporation', 'Bylaws', 'EIN Letter', 'Board Resolutions', 'Personal ID']
  },
  { 
    value: 'partnership', 
    label: 'Partnership',
    description: 'Two or more people share ownership and responsibilities.',
    icon: Users,
    documents: ['Partnership Agreement', 'Business Name Registration', 'Tax ID Application', 'Personal IDs']
  },
  { 
    value: 'nonprofit', 
    label: 'Nonprofit Organization',
    description: 'For charitable, educational, or social causes. Tax-exempt status.',
    icon: Building2,
    documents: ['Articles of Incorporation', 'Bylaws', '501(c)(3) Application', 'Board Member IDs']
  },
];

const STEPS = ['Select Business', 'Business Type', 'Legal Info', 'Documents', 'Review'];

export function RegisterBusinessModal({ open, onClose, businesses, onSubmit }: RegisterBusinessModalProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedBusinessId, setSelectedBusinessId] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>([]);
  
  const selectedBusiness = businesses.find(b => b.id === selectedBusinessId);
  const businessType = BUSINESS_TYPES.find(t => t.value === selectedType);

  const [formData, setFormData] = useState<Partial<RegistrationData>>({
    legalName: '',
    taxId: '',
    registrationNumber: '',
    ownerInfo: {
      fullName: '',
      dateOfBirth: '',
      ssn: '',
      address: '',
      phone: '',
      email: '',
    },
    businessAddress: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'United States',
    },
  });

  const handleBusinessSelect = (businessId: string) => {
    setSelectedBusinessId(businessId);
    const business = businesses.find(b => b.id === businessId);
    if (business) {
      setFormData(prev => ({
        ...prev,
        legalName: business.name,
        businessAddress: {
          street: prev.businessAddress?.street || '',
          city: business.location.split(',')[0]?.trim() || '',
          state: business.location.split(',')[1]?.trim() || '',
          zipCode: prev.businessAddress?.zipCode || '',
          country: prev.businessAddress?.country || 'United States',
        }
      }));
    }
  };

  const handleFileUpload = () => {
    // Simulate file upload
    const newDoc: UploadedDocument = {
      id: `doc_${Date.now()}`,
      name: `Document_${uploadedDocs.length + 1}.pdf`,
      type: 'application/pdf',
      size: '2.4 MB',
    };
    setUploadedDocs(prev => [...prev, newDoc]);
  };

  const handleNext = () => {
    if (activeStep < STEPS.length - 1) {
      setActiveStep(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleSubmit = () => {
    onSubmit({
      ...formData,
      businessId: selectedBusinessId,
      businessType: selectedType as RegistrationData['businessType'],
      documents: uploadedDocs,
    } as RegistrationData);
    onClose();
    // Reset state
    setActiveStep(0);
    setSelectedBusinessId('');
    setSelectedType('');
    setUploadedDocs([]);
  };

  const isStepValid = () => {
    switch (activeStep) {
      case 0:
        return selectedBusinessId !== '';
      case 1:
        return selectedType !== '';
      case 2:
        return formData.legalName?.trim() !== '' && 
               formData.ownerInfo?.fullName?.trim() !== '' &&
               formData.ownerInfo?.ssn?.trim() !== '';
      case 3:
        return uploadedDocs.length >= (businessType?.documents.length || 1);
      case 4:
        return true;
      default:
        return false;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#030712',
          backgroundImage: 'none',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: 4,
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          color: '#fff',
          fontSize: 24,
          fontWeight: 800,
          pb: 1,
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        Register Your Business
      </DialogTitle>

      <DialogContent sx={{ pt: 3, pb: 4 }}>
        <Stepper
          activeStep={activeStep}
          sx={{
            mb: 4,
            '& .MuiStepLabel-label': { color: '#64748b', fontSize: 12 },
            '& .MuiStepLabel-label.Mui-active': { color: '#10b981' },
            '& .MuiStepLabel-label.Mui-completed': { color: '#059669' },
            '& .MuiSvgIcon-root': { color: '#1f2937' },
            '& .MuiSvgIcon-root.Mui-active': { color: '#10b981' },
            '& .MuiSvgIcon-root.Mui-completed': { color: '#059669' },
          }}
        >
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box sx={{ minHeight: 400 }}>
          {/* Step 1: Select Business */}
          {activeStep === 0 && (
            <Stack spacing={3}>
              <Typography sx={{ color: '#94a3b8', fontSize: 16 }}>
                Select which business you want to register with the government.
              </Typography>

              <Grid container spacing={2}>
                {businesses.map((business) => (
                  <Grid size={{ xs: 12, md: 6 }} key={business.id}>
                    <Paper
                      onClick={() => handleBusinessSelect(business.id)}
                      sx={{
                        p: 3,
                        cursor: 'pointer',
                        bgcolor: selectedBusinessId === business.id ? 'rgba(16, 185, 129, 0.1)' : 'rgba(15, 23, 42, 0.6)',
                        border: '1px solid',
                        borderColor: selectedBusinessId === business.id ? '#10b981' : 'rgba(255,255,255,0.1)',
                        borderRadius: 3,
                        transition: 'all 0.3s',
                        '&:hover': {
                          borderColor: '#10b981',
                          transform: 'translateY(-2px)',
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box
                          sx={{
                            width: 56,
                            height: 56,
                            borderRadius: 2,
                            background: `linear-gradient(135deg, ${business.brandKit.primaryColor} 0%, ${business.brandKit.secondaryColor} 100%)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Typography sx={{ fontSize: 24, fontWeight: 700, color: 'white' }}>
                            {business.name[0]}
                          </Typography>
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: 16 }}>
                            {business.name}
                          </Typography>
                          <Typography sx={{ color: '#64748b', fontSize: 13 }}>
                            {business.industry} • {business.location}
                          </Typography>
                        </Box>
                        {selectedBusinessId === business.id && (
                          <CheckCircle size={24} color="#10b981" />
                        )}
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Stack>
          )}

          {/* Step 2: Select Business Type */}
          {activeStep === 1 && (
            <Stack spacing={3}>
              <Typography sx={{ color: '#94a3b8', fontSize: 16 }}>
                Choose the legal structure that best fits your business needs.
              </Typography>

              <Grid container spacing={2}>
                {BUSINESS_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <Grid size={{ xs: 12, md: 6 }} key={type.value}>
                      <Paper
                        onClick={() => setSelectedType(type.value)}
                        sx={{
                          p: 3,
                          cursor: 'pointer',
                          bgcolor: selectedType === type.value ? 'rgba(16, 185, 129, 0.1)' : 'rgba(15, 23, 42, 0.6)',
                          border: '1px solid',
                          borderColor: selectedType === type.value ? '#10b981' : 'rgba(255,255,255,0.1)',
                          borderRadius: 3,
                          transition: 'all 0.3s',
                          height: '100%',
                          '&:hover': {
                            borderColor: '#10b981',
                            transform: 'translateY(-2px)',
                          },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                          <Box
                            sx={{
                              width: 48,
                              height: 48,
                              borderRadius: 2,
                              bgcolor: 'rgba(16, 185, 129, 0.15)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <Icon size={24} color="#10b981" />
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: 16, mb: 0.5 }}>
                              {type.label}
                            </Typography>
                            <Typography sx={{ color: '#64748b', fontSize: 13, mb: 2 }}>
                              {type.description}
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {type.documents.map((doc) => (
                                <Chip
                                  key={doc}
                                  label={doc}
                                  size="small"
                                  sx={{
                                    bgcolor: 'rgba(255,255,255,0.05)',
                                    color: '#94a3b8',
                                    fontSize: 10,
                                  }}
                                />
                              ))}
                            </Box>
                          </Box>
                          {selectedType === type.value && (
                            <CheckCircle size={24} color="#10b981" />
                          )}
                        </Box>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            </Stack>
          )}

          {/* Step 3: Legal Information */}
          {activeStep === 2 && (
            <Stack spacing={4}>
              <Box>
                <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: 18, mb: 3 }}>
                  Business Legal Information
                </Typography>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Legal Business Name"
                      value={formData.legalName}
                      onChange={(e) => setFormData(prev => ({ ...prev, legalName: e.target.value }))}
                      fullWidth
                      sx={{
                        '& .MuiInputBase-root': {
                          bgcolor: 'rgba(15, 23, 42, 0.6)',
                          color: '#fff',
                          borderRadius: 2,
                        },
                        '& .MuiInputLabel-root': { color: '#64748b' },
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' },
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Tax ID (EIN) - Optional"
                      value={formData.taxId}
                      onChange={(e) => setFormData(prev => ({ ...prev, taxId: e.target.value }))}
                      placeholder="XX-XXXXXXX"
                      fullWidth
                      sx={{
                        '& .MuiInputBase-root': {
                          bgcolor: 'rgba(15, 23, 42, 0.6)',
                          color: '#fff',
                          borderRadius: 2,
                        },
                        '& .MuiInputLabel-root': { color: '#64748b' },
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' },
                      }}
                    />
                  </Grid>
                </Grid>
              </Box>

              <Box>
                <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: 18, mb: 3 }}>
                  Owner Information
                </Typography>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Full Legal Name"
                      value={formData.ownerInfo?.fullName}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        ownerInfo: { ...prev.ownerInfo!, fullName: e.target.value }
                      }))}
                      fullWidth
                      sx={{
                        '& .MuiInputBase-root': {
                          bgcolor: 'rgba(15, 23, 42, 0.6)',
                          color: '#fff',
                          borderRadius: 2,
                        },
                        '& .MuiInputLabel-root': { color: '#64748b' },
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' },
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Date of Birth"
                      type="date"
                      value={formData.ownerInfo?.dateOfBirth}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        ownerInfo: { ...prev.ownerInfo!, dateOfBirth: e.target.value }
                      }))}
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        '& .MuiInputBase-root': {
                          bgcolor: 'rgba(15, 23, 42, 0.6)',
                          color: '#fff',
                          borderRadius: 2,
                        },
                        '& .MuiInputLabel-root': { color: '#64748b' },
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' },
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="SSN (Last 4)"
                      value={formData.ownerInfo?.ssn}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        ownerInfo: { ...prev.ownerInfo!, ssn: e.target.value }
                      }))}
                      placeholder="XXX-XX-XXXX"
                      fullWidth
                      sx={{
                        '& .MuiInputBase-root': {
                          bgcolor: 'rgba(15, 23, 42, 0.6)',
                          color: '#fff',
                          borderRadius: 2,
                        },
                        '& .MuiInputLabel-root': { color: '#64748b' },
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' },
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Email"
                      value={formData.ownerInfo?.email}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        ownerInfo: { ...prev.ownerInfo!, email: e.target.value }
                      }))}
                      fullWidth
                      sx={{
                        '& .MuiInputBase-root': {
                          bgcolor: 'rgba(15, 23, 42, 0.6)',
                          color: '#fff',
                          borderRadius: 2,
                        },
                        '& .MuiInputLabel-root': { color: '#64748b' },
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' },
                      }}
                    />
                  </Grid>
                </Grid>
              </Box>

              <Box>
                <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: 18, mb: 3 }}>
                  Business Address
                </Typography>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      label="Street Address"
                      value={formData.businessAddress?.street}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        businessAddress: { ...prev.businessAddress!, street: e.target.value }
                      }))}
                      fullWidth
                      sx={{
                        '& .MuiInputBase-root': {
                          bgcolor: 'rgba(15, 23, 42, 0.6)',
                          color: '#fff',
                          borderRadius: 2,
                        },
                        '& .MuiInputLabel-root': { color: '#64748b' },
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' },
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      label="City"
                      value={formData.businessAddress?.city}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        businessAddress: { ...prev.businessAddress!, city: e.target.value }
                      }))}
                      fullWidth
                      sx={{
                        '& .MuiInputBase-root': {
                          bgcolor: 'rgba(15, 23, 42, 0.6)',
                          color: '#fff',
                          borderRadius: 2,
                        },
                        '& .MuiInputLabel-root': { color: '#64748b' },
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' },
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      label="State"
                      value={formData.businessAddress?.state}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        businessAddress: { ...prev.businessAddress!, state: e.target.value }
                      }))}
                      fullWidth
                      sx={{
                        '& .MuiInputBase-root': {
                          bgcolor: 'rgba(15, 23, 42, 0.6)',
                          color: '#fff',
                          borderRadius: 2,
                        },
                        '& .MuiInputLabel-root': { color: '#64748b' },
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' },
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      label="ZIP Code"
                      value={formData.businessAddress?.zipCode}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        businessAddress: { ...prev.businessAddress!, zipCode: e.target.value }
                      }))}
                      fullWidth
                      sx={{
                        '& .MuiInputBase-root': {
                          bgcolor: 'rgba(15, 23, 42, 0.6)',
                          color: '#fff',
                          borderRadius: 2,
                        },
                        '& .MuiInputLabel-root': { color: '#64748b' },
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' },
                      }}
                    />
                  </Grid>
                </Grid>
              </Box>
            </Stack>
          )}

          {/* Step 4: Documents */}
          {activeStep === 3 && (
            <Stack spacing={4}>
              <Box>
                <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: 18, mb: 1 }}>
                  Required Documents
                </Typography>
                <Typography sx={{ color: '#64748b', fontSize: 14, mb: 3 }}>
                  Please upload the following documents for {businessType?.label}
                </Typography>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 4 }}>
                  {businessType?.documents.map((doc) => (
                    <Chip
                      key={doc}
                      icon={<FileText size={14} />}
                      label={doc}
                      sx={{
                        bgcolor: 'rgba(16, 185, 129, 0.1)',
                        color: '#10b981',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                      }}
                    />
                  ))}
                </Box>
              </Box>

              {/* Upload Area */}
              <Paper
                onClick={handleFileUpload}
                sx={{
                  p: 4,
                  textAlign: 'center',
                  cursor: 'pointer',
                  bgcolor: 'rgba(15, 23, 42, 0.6)',
                  border: '2px dashed rgba(255,255,255,0.2)',
                  borderRadius: 3,
                  transition: 'all 0.3s',
                  '&:hover': {
                    borderColor: '#10b981',
                    bgcolor: 'rgba(16, 185, 129, 0.05)',
                  },
                }}
              >
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    bgcolor: 'rgba(16, 185, 129, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2,
                  }}
                >
                  <Upload size={28} color="#10b981" />
                </Box>
                <Typography sx={{ color: '#fff', fontWeight: 600, mb: 1 }}>
                  Click to upload documents
                </Typography>
                <Typography sx={{ color: '#64748b', fontSize: 14 }}>
                  PDF, JPG, or PNG (Max 10MB each)
                </Typography>
              </Paper>

              {/* Uploaded Files */}
              {uploadedDocs.length > 0 && (
                <Box>
                  <Typography sx={{ color: '#fff', fontWeight: 600, mb: 2 }}>
                    Uploaded Files ({uploadedDocs.length})
                  </Typography>
                  <Stack spacing={1}>
                    {uploadedDocs.map((doc) => (
                      <Paper
                        key={doc.id}
                        sx={{
                          p: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          bgcolor: 'rgba(15, 23, 42, 0.6)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 2,
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <FileText size={20} color="#10b981" />
                          <Box>
                            <Typography sx={{ color: '#fff', fontSize: 14 }}>
                              {doc.name}
                            </Typography>
                            <Typography sx={{ color: '#64748b', fontSize: 12 }}>
                              {doc.size}
                            </Typography>
                          </Box>
                        </Box>
                        <CheckCircle size={20} color="#10b981" />
                      </Paper>
                    ))}
                  </Stack>
                </Box>
              )}
            </Stack>
          )}

          {/* Step 5: Review */}
          {activeStep === 4 && (
            <Stack spacing={4}>
              <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: 20, textAlign: 'center' }}>
                Review Your Registration
              </Typography>

              <Paper
                sx={{
                  p: 4,
                  bgcolor: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 3,
                }}
              >
                <Stack spacing={3}>
                  <Box>
                    <Typography sx={{ color: '#64748b', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, mb: 0.5 }}>
                      Business
                    </Typography>
                    <Typography sx={{ color: '#fff', fontWeight: 600 }}>
                      {selectedBusiness?.name}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography sx={{ color: '#64748b', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, mb: 0.5 }}>
                      Registration Type
                    </Typography>
                    <Typography sx={{ color: '#fff', fontWeight: 600 }}>
                      {businessType?.label}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography sx={{ color: '#64748b', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, mb: 0.5 }}>
                      Legal Name
                    </Typography>
                    <Typography sx={{ color: '#fff', fontWeight: 600 }}>
                      {formData.legalName}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography sx={{ color: '#64748b', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, mb: 0.5 }}>
                      Owner
                    </Typography>
                    <Typography sx={{ color: '#fff', fontWeight: 600 }}>
                      {formData.ownerInfo?.fullName}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography sx={{ color: '#64748b', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, mb: 0.5 }}>
                      Documents
                    </Typography>
                    <Typography sx={{ color: '#10b981', fontWeight: 600 }}>
                      {uploadedDocs.length} files uploaded
                    </Typography>
                  </Box>
                </Stack>
              </Paper>

              <Paper
                sx={{
                  p: 3,
                  bgcolor: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: 2,
                }}
              >
                <Typography sx={{ color: '#f59e0b', fontSize: 14 }}>
                  By submitting, you confirm that all information provided is accurate and you have the authority to register this business.
                </Typography>
              </Paper>
            </Stack>
          )}
        </Box>

        {/* Navigation */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, pt: 3, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {activeStep === STEPS.length - 1 ? 'Submit Registration' : 'Continue'}
              <ArrowRight size={18} />
            </Box>
          </GradientButton>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
