import { useState, useRef } from 'react';
import { Box, Typography, Card, Chip, Avatar, IconButton, Menu, MenuItem, Dialog, DialogTitle, DialogContent, TextField, Stack } from '@mui/material';
import { Person } from '@mui/icons-material';
import { Plus, MoreVertical, Edit2, Trash2, Mail, Briefcase, PieChart, Camera } from 'lucide-react';
import type { TeamMember } from '../../types/venturemate';
import { useBusiness } from '../../contexts/BusinessContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { useToast } from '../../components/shared/toast';
import { NoBusinessSelected } from '../../components/venturemate/NoBusinessSelected';

const ROLE_OPTIONS = [
  'Founder & CEO',
  'Co-founder',
  'Chief Technology Officer',
  'Chief Operating Officer',
  'Chief Financial Officer',
  'VP of Engineering',
  'VP of Product',
  'VP of Marketing',
  'Product Manager',
  'Engineering Manager',
  'Senior Developer',
  'Developer',
  'Designer',
  'Marketing Manager',
  'Sales Lead',
  'Operations Manager',
  'Advisor',
  'Investor',
  'Other',
];

const RESPONSIBILITY_OPTIONS = [
  'Strategy',
  'Fundraising',
  'Hiring',
  'Product Vision',
  'Engineering',
  'AI/ML',
  'Technical Architecture',
  'Product Management',
  'Design',
  'Marketing',
  'Sales',
  'Operations',
  'Finance',
  'Legal',
  'Partnerships',
  'Customer Success',
  'Platform',
  'Integrations',
  'Growth',
];

export function TeamPage() {
  const { selectedBusiness: business, updateBusiness } = useBusiness();
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const toast = useToast();
  const currentUserMember: TeamMember = {
    id: '__self__',
    name: user ? `${user.firstName} ${user.lastName}`.trim() || user.email : '',
    email: user?.email || '',
    role: 'Founder & CEO',
    title: 'Account Owner',
    avatar: user?.avatar || '',
    equity: 0,
    status: 'active',
    joinedDate: user?.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
    responsibilities: ['Strategy'],
  };
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(() => {
    const existing = business?.team || [];
    const hasSelf = existing.some(m => m.email === user?.email || m.id === '__self__');
    return hasSelf ? existing : [currentUserMember, ...existing];
  });
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const maxTeamMembers = subscription?.plan?.limits?.maxTeamMembers;
  const limitReached = maxTeamMembers !== -1 && teamMembers.length >= (maxTeamMembers ?? Infinity);

  const [formData, setFormData] = useState<Partial<TeamMember>>({
    name: '',
    email: '',
    role: '',
    title: '',
    avatar: '',
    equity: 0,
    status: 'active',
    responsibilities: [],
  });

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setFormData(prev => ({ ...prev, avatar: reader.result as string }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, member: TeamMember) => {
    setAnchorEl(event.currentTarget);
    setSelectedMember(member);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedMember(null);
  };

  const handleAddNew = () => {
    if (limitReached) {
      toast.warning('Upgrade required', {
        description: `You've reached the maximum of ${maxTeamMembers} team members on your ${subscription?.plan?.displayName || subscription?.plan?.name || 'current'} plan. Upgrade to add more.`,
      });
      return;
    }
    setIsEditing(false);
    setFormData({
      name: '',
      email: '',
      role: '',
      title: '',
      avatar: '',
      equity: 0,
      status: 'active',
      responsibilities: [],
    });
    setModalOpen(true);
  };

  const handleEdit = () => {
    if (selectedMember) {
      setEditingMemberId(selectedMember.id);
      setIsEditing(true);
      setFormData({ ...selectedMember });
      setModalOpen(true);
      handleMenuClose();
    }
  };

  const handleDelete = () => {
    if (selectedMember && business) {
      const updatedTeam = teamMembers.filter(m => m.id !== selectedMember.id);
      setTeamMembers(updatedTeam);
      updateBusiness(business!.id, { team: updatedTeam });
      handleMenuClose();
    }
  };

  const handleSubmit = () => {
    if (!business) return;

    let updatedTeam: TeamMember[];

    if (isEditing && editingMemberId) {
      // Update existing member
      updatedTeam = teamMembers.map(m =>
        m.id === editingMemberId
          ? { ...m, ...formData } as TeamMember
          : m
      );
    } else {
      // Add new member
      const newMember: TeamMember = {
        id: `tm_${Date.now()}`,
        name: formData.name || '',
        email: formData.email || '',
        role: formData.role || '',
        title: formData.title || '',
        avatar: formData.avatar || '',
        equity: formData.equity || 0,
        status: (formData.status as TeamMember['status']) || 'active',
        joinedDate: new Date().toISOString().split('T')[0],
        responsibilities: formData.responsibilities || [],
      };
      updatedTeam = [...teamMembers, newMember];
    }

    setTeamMembers(updatedTeam);
    updateBusiness(business.id, { team: updatedTeam });
    setEditingMemberId(null);
    setModalOpen(false);
  };

  const toggleResponsibility = (resp: string) => {
    setFormData(prev => {
      const current = prev.responsibilities || [];
      const updated = current.includes(resp)
        ? current.filter(r => r !== resp)
        : [...current, resp];
      return { ...prev, responsibilities: updated };
    });
  };

  const totalEquity = teamMembers.reduce((acc, m) => acc + m.equity, 0);

  if (!business) {
    return <NoBusinessSelected message="Select a business to view team members" />;
  }

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', mb: { xs: 3, md: 4 }, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 2, sm: 0 } }}>
        <Box>
          <Typography sx={{ fontSize: { xs: 18, sm: 20, md: 24 }, fontWeight: 700, color: 'var(--vm-text-primary)', mb: 1 }}>
            Team
          </Typography>
          <Typography sx={{ fontSize: { xs: 13, sm: 14, md: 15 }, color: 'var(--vm-text-muted)' }}>
            {business.name} • {teamMembers.length} members • {totalEquity}% equity allocated
          </Typography>
        </Box>
        <Box
          component="button"
          onClick={handleAddNew}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            py: 1.5,
            px: { xs: 2, sm: 3 },
            borderRadius: 2,
            border: 'none',
            bgcolor: 'var(--vm-primary-600)',
            color: 'white',
            fontSize: { xs: 13, sm: 14 },
            fontWeight: 600,
            cursor: limitReached ? 'not-allowed' : 'pointer',
            opacity: limitReached ? 0.5 : 1,
            width: { xs: '100%', sm: 'auto' },
            transition: 'all 0.2s',
            '&:hover': limitReached ? {} : { bgcolor: 'var(--vm-primary-500)' },
          }}
        >
          <Plus size={18} />
          {limitReached ? 'Limit Reached' : 'Add Team Member'}
        </Box>
      </Box>

      {/* Stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: { xs: 2, md: 3 }, mb: { xs: 3, md: 4 } }}>
        {[
          { label: 'Total Members', value: teamMembers.length },
          { label: 'Active', value: teamMembers.filter(m => m.status === 'active').length },
          { label: 'Pending', value: teamMembers.filter(m => m.status === 'pending').length },
          { label: 'Equity', value: `${totalEquity}%` },
        ].map((stat) => (
          <Card
            key={stat.label}
            sx={{
              bgcolor: 'var(--vm-bg-secondary)',
              border: '1px solid var(--vm-border-subtle)',
              borderRadius: 3,
              p: { xs: 2, sm: 3 },
            }}
          >
                <Typography sx={{ fontSize: { xs: 16, sm: 20 }, fontWeight: 700, color: 'var(--vm-text-primary)', overflowWrap: 'anywhere' }}>
               {stat.value}
             </Typography>
             <Typography sx={{ fontSize: { xs: 11, sm: 13 }, color: 'var(--vm-text-muted)', overflowWrap: 'anywhere' }}>
               {stat.label}
             </Typography>
          </Card>
        ))}
      </Box>

      {/* Team Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: { xs: 2, md: 3 } }}>
        {teamMembers.map((member) => (
          <Card
            key={member.id}
            sx={{
              bgcolor: 'var(--vm-bg-secondary)',
              border: '1px solid var(--vm-border-subtle)',
              borderRadius: 3,
              p: { xs: 2, sm: 3 },
              transition: 'all 0.3s',
              '&:hover': {
                borderColor: 'var(--vm-border-secondary)',
                transform: 'translateY(-2px)',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar
                  src={member.avatar || undefined}
                  sx={{
                    width: 56,
                    height: 56,
                    bgcolor: member.avatar ? 'transparent' : 'var(--vm-primary-600)',
                  }}
                >
                  {!member.avatar && <Person sx={{ fontSize: 28 }} />}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'var(--vm-text-primary)', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                    {member.name}
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: 'var(--vm-primary-400)', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                    {member.title}
                  </Typography>
                </Box>
              </Box>
              {member.id === '__self__' ? (
                <Chip label="You" size="small" sx={{ bgcolor: 'rgba(16,185,129,.15)', color: '#10b981', fontSize: 9, fontWeight: 700, height: 20 }} />
              ) : (
                <IconButton
                  onClick={(e) => handleMenuOpen(e, member)}
                  sx={{ color: 'var(--vm-text-muted)' }}
                >
                  <MoreVertical size={18} />
                </IconButton>
              )}
            </Box>

            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Mail size={14} color="#6ee7b7" />
                <Typography sx={{ fontSize: 13, color: 'var(--vm-text-secondary)', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                  {member.email}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Briefcase size={14} color="#6ee7b7" />
                <Typography sx={{ fontSize: 13, color: 'var(--vm-text-secondary)', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                  {member.role}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <PieChart size={14} color="#6ee7b7" />
              <Typography sx={{ fontSize: 13, color: 'var(--vm-text-secondary)', overflowWrap: 'anywhere' }}>
                {member.equity}% equity
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2, maxWidth: '100%' }}>
              {member.responsibilities.slice(0, 3).map((resp) => (
                <Chip
                  key={resp}
                  size="small"
                  label={resp}
                  sx={{
                    bgcolor: 'var(--vm-bg-tertiary)',
                    color: 'var(--vm-text-secondary)',
                    fontSize: 11,
                    '& .MuiChip-label': { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', py: 0.5 },
                    maxWidth: '100%',
                  }}
                />
              ))}
              {member.responsibilities.length > 3 && (
                <Chip
                  key={`+${member.responsibilities.length - 3}`}
                  size="small"
                  label={`+${member.responsibilities.length - 3}`}
                  sx={{
                    bgcolor: 'var(--vm-bg-tertiary)',
                    color: 'var(--vm-text-muted)',
                    fontSize: 11,
                    '& .MuiChip-label': { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', py: 0.5 },
                  }}
                />
              )}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 2, borderTop: '1px solid var(--vm-border-subtle)' }}>
              <Chip
                size="small"
                label={member.status}
                sx={{
                  bgcolor: member.status === 'active' ? 'rgba(34, 197, 94, 0.2)' : 
                           member.status === 'pending' ? 'rgba(245, 158, 11, 0.2)' : 'var(--vm-bg-tertiary)',
                  color: member.status === 'active' ? '#4ade80' : 
                         member.status === 'pending' ? '#fbbf24' : 'var(--vm-text-muted)',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                }}
              />
              <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>
                Joined {new Date(member.joinedDate).toLocaleDateString('en-GB')}
              </Typography>
            </Box>
          </Card>
        ))}
      </Box>

      {/* Empty State */}
      {teamMembers.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography sx={{ fontSize: 18, color: 'var(--vm-text-muted)', mb: 2 }}>
            No team members yet
          </Typography>
          <Typography sx={{ fontSize: 14, color: 'var(--vm-text-muted)' }}>
            Add your first team member to get started
          </Typography>
        </Box>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            bgcolor: 'var(--vm-bg-secondary)',
            border: '1px solid var(--vm-border-subtle)',
            borderRadius: 2,
          },
        }}
      >
        <MenuItem onClick={handleEdit} sx={{ color: 'var(--vm-text-primary)', fontSize: 14 }}>
          <Edit2 size={16} style={{ marginRight: 8 }} />
          Edit Member
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: '#ef4444', fontSize: 14 }}>
          <Trash2 size={16} style={{ marginRight: 8 }} />
          Remove Member
        </MenuItem>
      </Menu>

      {/* Add/Edit Modal */}
      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'var(--vm-bg-secondary)',
            border: '1px solid var(--vm-border-subtle)',
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle sx={{ color: 'var(--vm-text-primary)', fontSize: 20, fontWeight: 700 }}>
          {isEditing ? 'Edit Team Member' : 'Add Team Member'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar
                src={formData.avatar || undefined}
                sx={{
                  width: 64,
                  height: 64,
                  bgcolor: formData.avatar ? 'transparent' : 'var(--vm-primary-600)',
                }}
              >
                {!formData.avatar && <Person sx={{ fontSize: 32 }} />}
              </Avatar>
              <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
              <Box
                component="button"
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  py: 1,
                  px: 2,
                  borderRadius: 2,
                  border: '1px solid var(--vm-border-primary)',
                  bgcolor: 'transparent',
                  color: 'var(--vm-text-secondary)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'var(--vm-bg-hover)' },
                }}
              >
                <Camera size={16} />
                Upload Photo
              </Box>
            </Box>

            <TextField
              label="Full Name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              fullWidth
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
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              fullWidth
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
              select
              label="Role"
              value={formData.role}
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
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
              {ROLE_OPTIONS.map((role) => (
                <MenuItem key={role} value={role}>
                  {role}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Job Title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              fullWidth
              placeholder="e.g., Senior Product Manager"
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
              label="Equity (%)"
              type="number"
              value={formData.equity || ''}
              onChange={(e) => {
                const val = e.target.value;
                setFormData(prev => ({ ...prev, equity: val === '' ? 0 : parseFloat(val) || 0 }));
              }}
              fullWidth
              inputProps={{ min: 0, max: 100, step: 0.1 }}
              helperText={`Total allocated: ${totalEquity}%${formData.equity ? ` → ${isEditing && editingMemberId ? totalEquity - (teamMembers.find(m => m.id === editingMemberId)?.equity || 0) + formData.equity : totalEquity + formData.equity}%` : ''}`}
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
              select
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as TeamMember['status'] }))}
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
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="former">Former</MenuItem>
            </TextField>

            <Box>
              <Typography sx={{ color: 'var(--vm-text-primary)', fontSize: 14, mb: 1 }}>
                Responsibilities
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {RESPONSIBILITY_OPTIONS.map((resp) => {
                  const isSelected = formData.responsibilities?.includes(resp);
                  return (
                    <Chip
                      key={resp}
                      label={resp}
                      onClick={() => toggleResponsibility(resp)}
                      sx={{
                        bgcolor: isSelected ? 'var(--vm-primary-600)' : 'var(--vm-bg-tertiary)',
                        color: isSelected ? '#fff' : 'var(--vm-text-secondary)',
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: isSelected ? 'var(--vm-primary-500)' : 'var(--vm-bg-hover)',
                        },
                      }}
                    />
                  );
                })}
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: { xs: 1, sm: 2 }, pt: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
              <Box
                component="button"
                onClick={() => setModalOpen(false)}
                sx={{
                  flex: 1,
                  py: 1.5,
                  px: 2,
                  borderRadius: 2,
                  border: '1px solid var(--vm-border-primary)',
                  bgcolor: 'transparent',
                  color: 'var(--vm-text-secondary)',
                  fontSize: { xs: 13, sm: 14 },
                  fontWeight: 600,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'var(--vm-bg-hover)' },
                }}
              >
                Cancel
              </Box>
              <Box
                component="button"
                onClick={handleSubmit}
                disabled={!formData.name || !formData.email}
                sx={{
                  flex: 1,
                  py: 1.5,
                  px: 2,
                  borderRadius: 2,
                  border: 'none',
                  bgcolor: 'var(--vm-primary-600)',
                  color: 'white',
                  fontSize: { xs: 13, sm: 14 },
                  fontWeight: 600,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'var(--vm-primary-500)' },
                  '&:disabled': { opacity: 0.5, cursor: 'not-allowed' },
                }}
              >
                {isEditing ? 'Save Changes' : 'Add Member'}
              </Box>
            </Box>
          </Stack>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
