import { useState } from 'react';
import { Box, Typography, Card, Chip, Avatar, IconButton, Menu, MenuItem, Dialog, DialogTitle, DialogContent, TextField, Stack } from '@mui/material';
import { Plus, MoreVertical, Edit2, Trash2, Mail, Briefcase, PieChart } from 'lucide-react';
import type { TeamMember } from '../../types/venturemate';
import { useBusiness } from '../../contexts/BusinessContext';
import { DomainChat } from '../../components/venturemate/DomainChat';

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
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(() => business?.team || []);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState<Partial<TeamMember>>({
    name: '',
    email: '',
    role: '',
    title: '',
    equity: 0,
    status: 'active',
    responsibilities: [],
  });

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, member: TeamMember) => {
    setAnchorEl(event.currentTarget);
    setSelectedMember(member);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedMember(null);
  };

  const handleAddNew = () => {
    setIsEditing(false);
    setFormData({
      name: '',
      email: '',
      role: '',
      title: '',
      equity: 0,
      status: 'active',
      responsibilities: [],
    });
    setModalOpen(true);
  };

  const handleEdit = () => {
    if (selectedMember) {
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

    if (isEditing && selectedMember) {
      // Update existing member
      updatedTeam = teamMembers.map(m =>
        m.id === selectedMember.id
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
        avatar: `https://i.pravatar.cc/150?u=${Date.now()}`,
        equity: formData.equity || 0,
        status: (formData.status as TeamMember['status']) || 'active',
        joinedDate: new Date().toISOString().split('T')[0],
        responsibilities: formData.responsibilities || [],
      };
      updatedTeam = [...teamMembers, newMember];
    }

    setTeamMembers(updatedTeam);
    updateBusiness(business.id, { team: updatedTeam });
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
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography sx={{ color: 'var(--vm-text-muted)' }}>
          Please select a business to view team members
        </Typography>
      </Box>
    );
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
            cursor: 'pointer',
            width: { xs: '100%', sm: 'auto' },
            transition: 'all 0.2s',
            '&:hover': { bgcolor: 'var(--vm-primary-500)' },
          }}
        >
          <Plus size={18} />
          Add Team Member
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
<Typography sx={{ fontSize: { xs: 16, sm: 20 }, fontWeight: 700, color: 'var(--vm-text-primary)' }}>
               {stat.value}
             </Typography>
             <Typography sx={{ fontSize: { xs: 11, sm: 13 }, color: 'var(--vm-text-muted)' }}>
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
                <Avatar src={member.avatar} sx={{ width: 56, height: 56 }} />
                <Box>
                  <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'var(--vm-text-primary)' }}>
                    {member.name}
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: 'var(--vm-primary-400)' }}>
                    {member.title}
                  </Typography>
                </Box>
              </Box>
              <IconButton
                onClick={(e) => handleMenuOpen(e, member)}
                sx={{ color: 'var(--vm-text-muted)' }}
              >
                <MoreVertical size={18} />
              </IconButton>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Mail size={14} color="#6ee7b7" />
                <Typography sx={{ fontSize: 13, color: 'var(--vm-text-secondary)' }}>
                  {member.email}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Briefcase size={14} color="#6ee7b7" />
                <Typography sx={{ fontSize: 13, color: 'var(--vm-text-secondary)' }}>
                  {member.role}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <PieChart size={14} color="#6ee7b7" />
              <Typography sx={{ fontSize: 13, color: 'var(--vm-text-secondary)' }}>
                {member.equity}% equity
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
              {member.responsibilities.slice(0, 3).map((resp) => (
                <Chip
                  key={resp}
                  size="small"
                  label={resp}
                  sx={{
                    bgcolor: 'var(--vm-bg-tertiary)',
                    color: 'var(--vm-text-secondary)',
                    fontSize: 11,
                  }}
                />
              ))}
              {member.responsibilities.length > 3 && (
                <Chip
                  size="small"
                  label={`+${member.responsibilities.length - 3}`}
                  sx={{
                    bgcolor: 'var(--vm-bg-tertiary)',
                    color: 'var(--vm-text-muted)',
                    fontSize: 11,
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
                Joined {new Date(member.joinedDate).toLocaleDateString()}
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
              value={formData.equity}
              onChange={(e) => setFormData(prev => ({ ...prev, equity: parseFloat(e.target.value) || 0 }))}
              fullWidth
              inputProps={{ min: 0, max: 100, step: 0.1 }}
              helperText={`Total allocated: ${totalEquity}%${formData.equity ? ` → ${isEditing ? totalEquity : totalEquity + formData.equity}%` : ''}`}
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
      <DomainChat domain="team" placeholder="Ask me to help manage your team..." />
    </Box>
  );
}
