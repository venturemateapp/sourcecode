import { useState, useRef } from 'react';
import { DatePicker } from '@mui/x-date-pickers';
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
  CircularProgress,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { GradientButton } from '../shared/buttons';
import { graphqlRequest, uploadFile } from '../../lib/api';
import { Upload, FileText, Building2, User, Users, Briefcase, CheckCircle, ArrowRight, X, Plus, Trash2 } from 'lucide-react';
import type { Business } from '../../types/venturemate';

interface RegisterBusinessModalProps {
  open: boolean;
  onClose: () => void;
  businesses: Business[];
  onRegistrationComplete?: () => void;
}

interface UploadedDoc {
  id: string;
  name: string;
  url: string;
}

interface MemberDoc {
  idFront: UploadedDoc | null;
  idBack: UploadedDoc | null;
  signature: UploadedDoc | null;
}

interface Member {
  id: string;
  fullName: string;
  role: string;
  email: string;
  phone: string;
  docs: MemberDoc;
}

const REGISTER_BUSINESS_MUTATION = `
  mutation RegisterBusiness($businessId: ID!, $userId: ID!, $registrationType: String!, $legalName: String!, $taxId: String, $ownerName: String!, $ownerDob: String, $ownerSsn: String, $ownerEmail: String, $ownerPhone: String, $addressStreet: String, $addressCity: String, $addressState: String, $addressZip: String, $addressCountry: String, $documents: String, $members: String) {
    registerBusiness(businessId: $businessId, userId: $userId, registrationType: $registrationType, legalName: $legalName, taxId: $taxId, ownerName: $ownerName, ownerDob: $ownerDob, ownerSsn: $ownerSsn, ownerEmail: $ownerEmail, ownerPhone: $ownerPhone, addressStreet: $addressStreet, addressCity: $addressCity, addressState: $addressState, addressZip: $addressZip, addressCountry: $addressCountry, documents: $documents, members: $members) {
      id, status, createdAt
    }
  }
`;

const BUSINESS_TYPES = [
  {
    value: 'sole_proprietor',
    label: 'Sole Proprietor',
    description: 'Simplest structure. You and your business are legally the same entity.',
    icon: User,
  },
  {
    value: 'llc',
    label: 'Limited Liability Company (LLC)',
    description: 'Separates personal and business liabilities. Most popular for startups.',
    icon: Building2,
  },
];

const ROLE_OPTIONS = ['Owner', 'Director', 'Co-Founder', 'Member', 'Manager'];

const STEPS = ['Select Business', 'Business Type', 'Owner Info', 'Members & Docs', 'Review'];

function generateId() {
  return `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function RegisterBusinessModal({ open, onClose, businesses, onRegistrationComplete }: RegisterBusinessModalProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedBusinessId, setSelectedBusinessId] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<{ memberId: string; field: keyof MemberDoc } | null>(null);

  const selectedBusiness = businesses.find(b => b.id === selectedBusinessId);

  const [ownerName, setOwnerName] = useState('');
  const [ownerDob, setOwnerDob] = useState('');
  const [ownerSsn, setOwnerSsn] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [legalName, setLegalName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [addressStreet, setAddressStreet] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressState, setAddressState] = useState('');
  const [addressZip, setAddressZip] = useState('');
  const [addressCountry, setAddressCountry] = useState('United States');

  const [ownerDocs, setOwnerDocs] = useState<MemberDoc>({ idFront: null, idBack: null, signature: null });
  const [members, setMembers] = useState<Member[]>([]);

  const handleBusinessSelect = (id: string) => {
    setSelectedBusinessId(id);
    const biz = businesses.find(b => b.id === id);
    if (biz) {
      setLegalName(biz.name);
      const parts = biz.location.split(',').map(s => s.trim());
      if (parts.length >= 1) setAddressCity(parts[0]);
      if (parts.length >= 2) setAddressState(parts[1]);
    }
  };

  const handleUpload = async (file: File, memberId: string, field: keyof MemberDoc) => {
    if (!selectedBusinessId) return;
    try {
      const result = await uploadFile(file, selectedBusinessId, 'registration');
      const doc: UploadedDoc = { id: result.document.id, name: result.document.name, url: result.document.url };
      if (memberId === '__owner__') {
        setOwnerDocs(prev => ({ ...prev, [field]: doc }));
      } else {
        setMembers(prev => prev.map(m => m.id === memberId ? { ...m, docs: { ...m.docs, [field]: doc } } : m));
      }
    } catch {
      // silently fail
    }
  };

  const triggerUpload = (memberId: string, field: keyof MemberDoc) => {
    setUploadTarget({ memberId, field });
    setTimeout(() => fileInputRef.current?.click(), 0);
  };

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget) return;
    handleUpload(file, uploadTarget.memberId, uploadTarget.field);
    e.target.value = '';
  };

  const addMember = () => {
    setMembers(prev => [...prev, { id: generateId(), fullName: '', role: 'Member', email: '', phone: '', docs: { idFront: null, idBack: null, signature: null } }]);
  };

  const removeMember = (id: string) => {
    setMembers(prev => prev.filter(m => m.id !== id));
  };

  const updateMember = (id: string, field: keyof Omit<Member, 'id' | 'docs'>, value: string) => {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const resetState = () => {
    setActiveStep(0);
    setSelectedBusinessId('');
    setSelectedType('');
    setOwnerName('');
    setOwnerDob('');
    setOwnerSsn('');
    setOwnerEmail('');
    setOwnerPhone('');
    setLegalName('');
    setTaxId('');
    setAddressStreet('');
    setAddressCity('');
    setAddressState('');
    setAddressZip('');
    setAddressCountry('United States');
    setOwnerDocs({ idFront: null, idBack: null, signature: null });
    setMembers([]);
    setSubmitError('');
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

  const handleSubmit = async () => {
    if (!selectedBusiness) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const allDocs = [
        ownerDocs.idFront, ownerDocs.idBack, ownerDocs.signature,
        ...members.flatMap(m => [m.docs.idFront, m.docs.idBack, m.docs.signature]),
      ].filter(Boolean);

      const membersData = members.map(m => ({
        fullName: m.fullName,
        role: m.role,
        email: m.email,
        phone: m.phone,
        idFront: m.docs.idFront,
        idBack: m.docs.idBack,
        signature: m.docs.signature,
      }));

      await graphqlRequest<{ registerBusiness: { id: string } }>(REGISTER_BUSINESS_MUTATION, {
        businessId: selectedBusinessId,
        userId: selectedBusiness.userId,
        registrationType: selectedType,
        legalName: legalName || selectedBusiness.name,
        taxId: taxId || null,
        ownerName,
        ownerDob: ownerDob || null,
        ownerSsn: ownerSsn || null,
        ownerEmail: ownerEmail || null,
        ownerPhone: ownerPhone || null,
        addressStreet: addressStreet || null,
        addressCity: addressCity || null,
        addressState: addressState || null,
        addressZip: addressZip || null,
        addressCountry,
        documents: JSON.stringify(allDocs),
        members: JSON.stringify(membersData),
      });

      onRegistrationComplete?.();
      onClose();
      resetState();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const isStepValid = () => {
    switch (activeStep) {
      case 0: return selectedBusinessId !== '';
      case 1: return selectedType !== '';
      case 2: return ownerName.trim() !== '';
      case 3:
        if (selectedType === 'llc' && members.length === 0) return false;
        return true;
      case 4: return true;
      default: return false;
    }
  };

  const renderUploadBtn = (memberId: string, field: keyof MemberDoc, label: string, current: UploadedDoc | null) => (
    <Box>
      <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={onFileSelected} style={{ display: 'none' }} />
      <Typography sx={{ color: '#94a3b8', fontSize: 11, mb: 0.5 }}>{label}</Typography>
      {current ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'rgba(16, 185, 129, 0.1)', borderRadius: 1, p: 1 }}>
          <FileText size={14} color="#10b981" />
          <Typography sx={{ color: '#10b981', fontSize: 11, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {current.name}
          </Typography>
          <CheckCircle size={14} color="#10b981" />
        </Box>
      ) : (
        <Box
          onClick={() => triggerUpload(memberId, field)}
          sx={{
            p: 1.5,
            border: '1px dashed rgba(255,255,255,0.2)',
            borderRadius: 1,
            cursor: 'pointer',
            textAlign: 'center',
            '&:hover': { borderColor: '#10b981', bgcolor: 'rgba(16, 185, 129, 0.05)' },
          }}
        >
          <Upload size={16} color="#64748b" />
        </Box>
      )}
    </Box>
  );

  const renderMemberCard = (member: Member, index: number) => (
    <Paper key={member.id} sx={{ p: 3, bgcolor: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>Member {index + 1}</Typography>
        <IconButton onClick={() => removeMember(member.id)} sx={{ color: '#ef4444', p: 0.5 }}>
          <Trash2 size={16} />
        </IconButton>
      </Box>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Full Name"
            size="small"
            value={member.fullName}
            onChange={e => updateMember(member.id, 'fullName', e.target.value)}
            fullWidth
            sx={{ '& .MuiInputBase-root': { bgcolor: 'rgba(0,0,0,0.3)', color: '#fff', borderRadius: 1.5, fontSize: 13 }, '& .MuiInputLabel-root': { color: '#64748b', fontSize: 13 } }}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <FormControl fullWidth size="small" sx={{ '& .MuiInputBase-root': { bgcolor: 'rgba(0,0,0,0.3)', color: '#fff', borderRadius: 1.5, fontSize: 13 }, '& .MuiInputLabel-root': { color: '#64748b', fontSize: 13 }, '& .MuiSvgIcon-root': { color: '#64748b' } }}>
            <InputLabel sx={{ fontSize: 13 }}>Role</InputLabel>
            <Select value={member.role} label="Role" onChange={e => updateMember(member.id, 'role', e.target.value)}>
              {ROLE_OPTIONS.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <TextField
            label="Email"
            size="small"
            value={member.email}
            onChange={e => updateMember(member.id, 'email', e.target.value)}
            fullWidth
            sx={{ '& .MuiInputBase-root': { bgcolor: 'rgba(0,0,0,0.3)', color: '#fff', borderRadius: 1.5, fontSize: 13 }, '& .MuiInputLabel-root': { color: '#64748b', fontSize: 13 } }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Phone"
            size="small"
            value={member.phone}
            onChange={e => updateMember(member.id, 'phone', e.target.value)}
            fullWidth
            sx={{ '& .MuiInputBase-root': { bgcolor: 'rgba(0,0,0,0.3)', color: '#fff', borderRadius: 1.5, fontSize: 13 }, '& .MuiInputLabel-root': { color: '#64748b', fontSize: 13 } }}
          />
        </Grid>
      </Grid>
      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
        {renderUploadBtn(member.id, 'idFront', 'ID Front', member.docs.idFront)}
        {renderUploadBtn(member.id, 'idBack', 'ID Back', member.docs.idBack)}
        {renderUploadBtn(member.id, 'signature', 'Signature', member.docs.signature)}
      </Box>
    </Paper>
  );

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
      <DialogTitle sx={{ color: '#fff', fontSize: 24, fontWeight: 800, pb: 1, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        Register Your Business
      </DialogTitle>

      <DialogContent sx={{ pt: 3, pb: 4 }}>
        <Stepper activeStep={activeStep} sx={{
          mb: 4,
          '& .MuiStepLabel-label': { color: '#64748b', fontSize: 12 },
          '& .MuiStepLabel-label.Mui-active': { color: '#10b981' },
          '& .MuiStepLabel-label.Mui-completed': { color: '#059669' },
          '& .MuiSvgIcon-root': { color: '#1f2937' },
          '& .MuiSvgIcon-root.Mui-active': { color: '#10b981' },
          '& .MuiSvgIcon-root.Mui-completed': { color: '#059669' },
        }}>
          {STEPS.map(label => (
            <Step key={label}><StepLabel>{label}</StepLabel></Step>
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
                {businesses.map(b => (
                  <Grid size={{ xs: 12, md: 6 }} key={b.id}>
                    <Paper
                      onClick={() => handleBusinessSelect(b.id)}
                      sx={{
                        p: 3, cursor: 'pointer',
                        bgcolor: selectedBusinessId === b.id ? 'rgba(16, 185, 129, 0.1)' : 'rgba(15, 23, 42, 0.6)',
                        border: '1px solid', borderColor: selectedBusinessId === b.id ? '#10b981' : 'rgba(255,255,255,0.1)',
                        borderRadius: 3, transition: 'all 0.3s',
                        '&:hover': { borderColor: '#10b981', transform: 'translateY(-2px)' },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{
                          width: 48, height: 48, borderRadius: 2,
                          background: `linear-gradient(135deg, ${b.brandKit.primaryColor} 0%, ${b.brandKit.secondaryColor} 100%)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Typography sx={{ fontSize: 20, fontWeight: 700, color: 'white' }}>{b.name[0]}</Typography>
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>{b.name}</Typography>
                          <Typography sx={{ color: '#64748b', fontSize: 12 }}>{b.industry} &bull; {b.location}</Typography>
                        </Box>
                        {selectedBusinessId === b.id && <CheckCircle size={22} color="#10b981" />}
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Stack>
          )}

          {/* Step 2: Business Type */}
          {activeStep === 1 && (
            <Stack spacing={3}>
              <Typography sx={{ color: '#94a3b8', fontSize: 16 }}>
                Choose the legal structure that best fits your business needs.
              </Typography>
              <Grid container spacing={2}>
                {BUSINESS_TYPES.map(type => {
                  const Icon = type.icon;
                  return (
                    <Grid size={{ xs: 12, md: 6 }} key={type.value}>
                      <Paper
                        onClick={() => setSelectedType(type.value)}
                        sx={{
                          p: 3, cursor: 'pointer',
                          bgcolor: selectedType === type.value ? 'rgba(16, 185, 129, 0.1)' : 'rgba(15, 23, 42, 0.6)',
                          border: '1px solid', borderColor: selectedType === type.value ? '#10b981' : 'rgba(255,255,255,0.1)',
                          borderRadius: 3, transition: 'all 0.3s', height: '100%',
                          '&:hover': { borderColor: '#10b981', transform: 'translateY(-2px)' },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                          <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Icon size={22} color="#10b981" />
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: 15, mb: 0.5 }}>{type.label}</Typography>
                            <Typography sx={{ color: '#64748b', fontSize: 13 }}>{type.description}</Typography>
                          </Box>
                          {selectedType === type.value && <CheckCircle size={22} color="#10b981" />}
                        </Box>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            </Stack>
          )}

          {/* Step 3: Owner Info */}
          {activeStep === 2 && (
            <Stack spacing={4}>
              <Box>
                <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: 18, mb: 3 }}>
                  Owner Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Full Legal Name"
                      value={ownerName}
                      onChange={e => setOwnerName(e.target.value)}
                      fullWidth
                      sx={{ '& .MuiInputBase-root': { bgcolor: 'rgba(15, 23, 42, 0.6)', color: '#fff', borderRadius: 2 }, '& .MuiInputLabel-root': { color: '#64748b' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <DatePicker
                      label="Date of Birth"
                      value={ownerDob ? new Date(ownerDob) : null}
                      onChange={date => setOwnerDob(date ? date.toISOString().split('T')[0] : '')}
                      slotProps={{ textField: { fullWidth: true, sx: { '& .MuiInputBase-root': { bgcolor: 'rgba(15, 23, 42, 0.6)', color: '#fff', borderRadius: 2 }, '& .MuiInputLabel-root': { color: '#64748b' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' } } } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      label="SSN (Last 4)"
                      value={ownerSsn}
                      onChange={e => setOwnerSsn(e.target.value)}
                      placeholder="XXX-XX-XXXX"
                      fullWidth
                      sx={{ '& .MuiInputBase-root': { bgcolor: 'rgba(15, 23, 42, 0.6)', color: '#fff', borderRadius: 2 }, '& .MuiInputLabel-root': { color: '#64748b' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      label="Email"
                      value={ownerEmail}
                      onChange={e => setOwnerEmail(e.target.value)}
                      fullWidth
                      sx={{ '& .MuiInputBase-root': { bgcolor: 'rgba(15, 23, 42, 0.6)', color: '#fff', borderRadius: 2 }, '& .MuiInputLabel-root': { color: '#64748b' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      label="Phone"
                      value={ownerPhone}
                      onChange={e => setOwnerPhone(e.target.value)}
                      fullWidth
                      sx={{ '& .MuiInputBase-root': { bgcolor: 'rgba(15, 23, 42, 0.6)', color: '#fff', borderRadius: 2 }, '& .MuiInputLabel-root': { color: '#64748b' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' } }}
                    />
                  </Grid>
                </Grid>
              </Box>

              <Box>
                <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: 18, mb: 3 }}>
                  Owner Documents
                </Typography>
                <Typography sx={{ color: '#64748b', fontSize: 13, mb: 2 }}>
                  Upload ID card (front & back) and signature for the owner.
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  {renderUploadBtn('__owner__', 'idFront', 'ID Front', ownerDocs.idFront)}
                  {renderUploadBtn('__owner__', 'idBack', 'ID Back', ownerDocs.idBack)}
                  {renderUploadBtn('__owner__', 'signature', 'Signature', ownerDocs.signature)}
                </Box>
              </Box>

              <Box>
                <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: 18, mb: 3 }}>
                  Business Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Legal Business Name"
                      value={legalName}
                      onChange={e => setLegalName(e.target.value)}
                      fullWidth
                      sx={{ '& .MuiInputBase-root': { bgcolor: 'rgba(15, 23, 42, 0.6)', color: '#fff', borderRadius: 2 }, '& .MuiInputLabel-root': { color: '#64748b' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Tax ID (EIN)"
                      value={taxId}
                      onChange={e => setTaxId(e.target.value)}
                      placeholder="XX-XXXXXXX"
                      fullWidth
                      sx={{ '& .MuiInputBase-root': { bgcolor: 'rgba(15, 23, 42, 0.6)', color: '#fff', borderRadius: 2 }, '& .MuiInputLabel-root': { color: '#64748b' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      label="Street Address"
                      value={addressStreet}
                      onChange={e => setAddressStreet(e.target.value)}
                      fullWidth
                      sx={{ '& .MuiInputBase-root': { bgcolor: 'rgba(15, 23, 42, 0.6)', color: '#fff', borderRadius: 2 }, '& .MuiInputLabel-root': { color: '#64748b' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <TextField
                      label="City"
                      value={addressCity}
                      onChange={e => setAddressCity(e.target.value)}
                      fullWidth
                      sx={{ '& .MuiInputBase-root': { bgcolor: 'rgba(15, 23, 42, 0.6)', color: '#fff', borderRadius: 2 }, '& .MuiInputLabel-root': { color: '#64748b' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <TextField
                      label="State"
                      value={addressState}
                      onChange={e => setAddressState(e.target.value)}
                      fullWidth
                      sx={{ '& .MuiInputBase-root': { bgcolor: 'rgba(15, 23, 42, 0.6)', color: '#fff', borderRadius: 2 }, '& .MuiInputLabel-root': { color: '#64748b' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <TextField
                      label="ZIP Code"
                      value={addressZip}
                      onChange={e => setAddressZip(e.target.value)}
                      fullWidth
                      sx={{ '& .MuiInputBase-root': { bgcolor: 'rgba(15, 23, 42, 0.6)', color: '#fff', borderRadius: 2 }, '& .MuiInputLabel-root': { color: '#64748b' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <TextField
                      label="Country"
                      value={addressCountry}
                      onChange={e => setAddressCountry(e.target.value)}
                      fullWidth
                      sx={{ '& .MuiInputBase-root': { bgcolor: 'rgba(15, 23, 42, 0.6)', color: '#fff', borderRadius: 2 }, '& .MuiInputLabel-root': { color: '#64748b' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' } }}
                    />
                  </Grid>
                </Grid>
              </Box>
            </Stack>
          )}

          {/* Step 4: Members & Docs */}
          {activeStep === 3 && (
            <Stack spacing={3}>
              {selectedType === 'llc' ? (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: 18 }}>
                      Directors / Members
                    </Typography>
                    <GradientButton variant="outline" size="sm" onClick={addMember}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Plus size={14} /> Add Member
                      </Box>
                    </GradientButton>
                  </Box>
                  <Typography sx={{ color: '#64748b', fontSize: 13 }}>
                    Add at least one director or member. Each person needs ID front, ID back, and signature.
                  </Typography>
                  {members.length === 0 ? (
                    <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'rgba(15, 23, 42, 0.6)', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: 2 }}>
                      <Users size={32} color="#64748b" />
                      <Typography sx={{ color: '#64748b', mt: 1, fontSize: 13 }}>No members added yet. Click "Add Member" above.</Typography>
                    </Paper>
                  ) : (
                    members.map((m, i) => renderMemberCard(m, i))
                  )}
                </>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <User size={40} color="#10b981" />
                  <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: 16, mt: 2 }}>
                    Sole Proprietor
                  </Typography>
                  <Typography sx={{ color: '#64748b', fontSize: 13, mt: 1 }}>
                    As a sole proprietor, you are the only owner. Your ID and signature were collected in the previous step.
                  </Typography>
                </Box>
              )}
            </Stack>
          )}

          {/* Step 5: Review */}
          {activeStep === 4 && (
            <Stack spacing={3}>
              <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: 20, textAlign: 'center' }}>
                Review Your Registration
              </Typography>
              <Paper sx={{ p: 4, bgcolor: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3 }}>
                <Stack spacing={2}>
                  <Box>
                    <Typography sx={{ color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Business</Typography>
                    <Typography sx={{ color: '#fff', fontWeight: 600 }}>{selectedBusiness?.name}</Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Registration Type</Typography>
                    <Typography sx={{ color: '#fff', fontWeight: 600 }}>{BUSINESS_TYPES.find(t => t.value === selectedType)?.label}</Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Legal Name</Typography>
                    <Typography sx={{ color: '#fff', fontWeight: 600 }}>{legalName}</Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Owner</Typography>
                    <Typography sx={{ color: '#fff', fontWeight: 600 }}>{ownerName}</Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Documents Uploaded</Typography>
                    <Typography sx={{ color: '#10b981', fontWeight: 600 }}>
                      {[ownerDocs.idFront, ownerDocs.idBack, ownerDocs.signature, ...members.flatMap(m => [m.docs.idFront, m.docs.idBack, m.docs.signature])].filter(Boolean).length} files
                    </Typography>
                  </Box>
                  {selectedType === 'llc' && members.length > 0 && (
                    <Box>
                      <Typography sx={{ color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, mb: 1 }}>Members ({members.length})</Typography>
                      {members.map((m, i) => (
                        <Typography key={m.id} sx={{ color: '#fff', fontSize: 13 }}>{i + 1}. {m.fullName} &mdash; {m.role}</Typography>
                      ))}
                    </Box>
                  )}
                </Stack>
              </Paper>
              <Paper sx={{ p: 3, bgcolor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 2 }}>
                <Typography sx={{ color: '#f59e0b', fontSize: 13 }}>
                  By submitting, you confirm that all information provided is accurate and you have the authority to register this business.
                </Typography>
              </Paper>
            </Stack>
          )}
        </Box>

        {/* Navigation */}
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 4, pt: 3, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          {submitError && (
            <Typography sx={{ color: '#ef4444', fontSize: 13, textAlign: 'center', mb: 2, width: '100%' }}>
              {submitError}
            </Typography>
          )}
          <GradientButton variant="outline" size="md" onClick={activeStep === 0 ? onClose : handleBack} disabled={submitting}>
            {activeStep === 0 ? 'Cancel' : 'Back'}
          </GradientButton>
          <GradientButton variant="primary" size="md" onClick={handleNext} disabled={!isStepValid() || submitting}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {submitting ? <CircularProgress size={18} sx={{ color: 'white' }} /> : activeStep === STEPS.length - 1 ? 'Register' : 'Continue'}
              {!submitting && <ArrowRight size={18} />}
            </Box>
          </GradientButton>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
