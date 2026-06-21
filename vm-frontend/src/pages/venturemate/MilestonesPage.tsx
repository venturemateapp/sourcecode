import { useState } from 'react';
import {
  Box, Typography, Card, Chip, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Button, Select, MenuItem,
  FormControl, InputLabel,
} from '@mui/material';
import { Plus, Edit2, Trash2, Target, Calendar, User, ArrowUp } from 'lucide-react';
import { DatePicker } from '@mui/x-date-pickers';
import type { Milestone } from '../../types/venturemate';
import { useBusiness } from '../../contexts/BusinessContext';
import { GradientButton } from '../../components/shared/buttons';
import { NoBusinessSelected } from '../../components/venturemate/NoBusinessSelected';

const STATUS_OPTIONS: Milestone['status'][] = ['pending', 'in-progress', 'completed', 'overdue'];
const PRIORITY_OPTIONS: Milestone['priority'][] = ['low', 'medium', 'high', 'critical'];
const CATEGORY_OPTIONS: Milestone['category'][] = ['product', 'marketing', 'funding', 'team', 'legal', 'operations'];

const STATUS_COLORS: Record<Milestone['status'], string> = {
  'pending': '#6b7280',
  'in-progress': '#3b82f6',
  'completed': '#22c55e',
  'overdue': '#ef4444',
};

const PRIORITY_COLORS: Record<Milestone['priority'], string> = {
  low: '#6b7280',
  medium: '#fbbf24',
  high: '#f97316',
  critical: '#ef4444',
};

export function MilestonesPage() {
  const { selectedBusiness: business, updateBusiness } = useBusiness();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Milestone>>({
    title: '',
    description: '',
    status: 'pending',
    priority: 'medium',
    dueDate: '',
    assignee: '',
    category: 'product',
  });

  if (!business) return <NoBusinessSelected message="Select a business to view milestones" />;

  const milestones = business.milestones;

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      status: 'pending',
      priority: 'medium',
      dueDate: '',
      assignee: '',
      category: 'product',
    });
    setEditingId(null);
  };

  const handleAdd = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleEdit = (ms: Milestone) => {
    setFormData({
      title: ms.title,
      description: ms.description,
      status: ms.status,
      priority: ms.priority,
      dueDate: ms.dueDate,
      assignee: ms.assignee || '',
      category: ms.category,
    });
    setEditingId(ms.id);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    const updated = milestones.filter(m => m.id !== id);
    updateBusiness(business.id, { milestones: updated });
  };

  const handleSave = () => {
    if (!formData.title || !formData.dueDate) return;
    let updated: Milestone[];
    if (editingId) {
      updated = milestones.map(m =>
        m.id === editingId
          ? { ...m, ...formData, id: m.id } as Milestone
          : m
      );
    } else {
      const newMs: Milestone = {
        id: `ms_${Date.now()}`,
        title: formData.title || '',
        description: formData.description || '',
        status: (formData.status as Milestone['status']) || 'pending',
        priority: (formData.priority as Milestone['priority']) || 'medium',
        dueDate: formData.dueDate || '',
        assignee: formData.assignee || undefined,
        category: (formData.category as Milestone['category']) || 'product',
      };
      updated = [...milestones, newMs];
    }
    updateBusiness(business.id, { milestones: updated });
    setDialogOpen(false);
    resetForm();
  };

  const getStatusColor = (status: string) => STATUS_COLORS[status as Milestone['status']] || '#6b7280';
  const getPriorityColor = (priority: string) => PRIORITY_COLORS[priority as Milestone['priority']] || '#6b7280';

  const activeCount = milestones.filter(m => m.status === 'in-progress').length;
  const completedCount = milestones.filter(m => m.status === 'completed').length;
  const overdueCount = milestones.filter(m => m.status === 'overdue').length;

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', mb: { xs: 3, md: 4 }, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 2, sm: 0 } }}>
        <Box>
          <Typography sx={{ fontSize: { xs: 20, md: 24 }, fontWeight: 700, color: 'var(--vm-text-primary)', mb: 1 }}>
            Milestones
          </Typography>
          <Typography sx={{ fontSize: 14, color: 'var(--vm-text-muted)' }}>
            {business.name} • {milestones.length} milestones
          </Typography>
        </Box>
        <GradientButton variant="primary" size="sm" onClick={handleAdd} startIcon={<Plus size={18} />}>
          Add Milestone
        </GradientButton>
      </Box>

      {/* Stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: { xs: 2, md: 3 }, mb: { xs: 3, md: 4 } }}>
        {[
          { label: 'Total', value: milestones.length, color: 'var(--vm-text-primary)' },
          { label: 'In Progress', value: activeCount, color: '#3b82f6' },
          { label: 'Completed', value: completedCount, color: '#22c55e' },
          { label: 'Overdue', value: overdueCount, color: '#ef4444' },
        ].map((stat) => (
          <Card key={stat.label} sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, p: { xs: 2, sm: 3 } }}>
            <Typography sx={{ fontSize: { xs: 16, sm: 20 }, fontWeight: 700, color: stat.color }}>
              {stat.value}
            </Typography>
            <Typography sx={{ fontSize: { xs: 11, sm: 13 }, color: 'var(--vm-text-muted)' }}>
              {stat.label}
            </Typography>
          </Card>
        ))}
      </Box>

      {/* Milestones Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: { xs: 2, md: 3 } }}>
        {milestones.length > 0 ? milestones.map((milestone) => (
          <Card key={milestone.id} sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, p: { xs: 2, md: 3 } }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2, gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
                <Target size={18} color={getStatusColor(milestone.status)} />
                <Typography sx={{ fontSize: { xs: 14, md: 16 }, fontWeight: 600, color: 'var(--vm-text-primary)', wordBreak: 'break-word' }}>
                  {milestone.title}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                <IconButton size="small" onClick={() => handleEdit(milestone)} sx={{ color: 'var(--vm-text-muted)' }}>
                  <Edit2 size={14} />
                </IconButton>
                <IconButton size="small" onClick={() => handleDelete(milestone.id)} sx={{ color: '#ef4444' }}>
                  <Trash2 size={14} />
                </IconButton>
              </Box>
            </Box>

            <Typography sx={{ fontSize: 13, color: 'var(--vm-text-secondary)', mb: 2, lineHeight: 1.5 }}>
              {milestone.description}
            </Typography>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              <Chip size="small" label={milestone.status} sx={{ bgcolor: `${getStatusColor(milestone.status)}20`, color: getStatusColor(milestone.status), fontWeight: 600, textTransform: 'capitalize', '& .MuiChip-label': { whiteSpace: 'normal', py: 0.5 } }} />
              <Chip size="small" label={milestone.priority} sx={{ bgcolor: `${getPriorityColor(milestone.priority)}20`, color: getPriorityColor(milestone.priority), fontWeight: 600, textTransform: 'capitalize', '& .MuiChip-label': { whiteSpace: 'normal', py: 0.5 } }} />
              <Chip size="small" label={milestone.category} sx={{ bgcolor: 'var(--vm-bg-tertiary)', color: 'var(--vm-text-secondary)', fontWeight: 600, textTransform: 'capitalize', '& .MuiChip-label': { whiteSpace: 'normal', py: 0.5 } }} />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, pt: 2, borderTop: '1px solid var(--vm-border-subtle)' }}>
              <Calendar size={14} color="var(--vm-text-muted)" />
              <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>
                Due {new Date(milestone.dueDate).toLocaleDateString('en-GB')}
              </Typography>
              {milestone.assignee && (
                <>
                  <User size={14} color="var(--vm-text-muted)" />
                  <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>
                    {milestone.assignee}
                  </Typography>
                </>
              )}
              {milestone.dependencies && milestone.dependencies.length > 0 && (
                <>
                  <ArrowUp size={14} color="var(--vm-text-muted)" />
                  <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>
                    {milestone.dependencies.length} dep.
                  </Typography>
                </>
              )}
            </Box>
          </Card>
        )) : (
          <Box sx={{ gridColumn: '1 / -1', textAlign: 'center', py: 8 }}>
            <Typography sx={{ fontSize: 18, color: 'var(--vm-text-muted)', mb: 2 }}>
              No milestones yet
            </Typography>
            <Typography sx={{ fontSize: 14, color: 'var(--vm-text-muted)' }}>
              Add your first milestone to start tracking progress
            </Typography>
          </Box>
        )}
      </Box>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3 } }}>
        <DialogTitle sx={{ color: 'var(--vm-text-primary)', fontSize: 20, fontWeight: 700 }}>
          {editingId ? 'Edit Milestone' : 'Add Milestone'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
            <TextField
              label="Title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              fullWidth
              sx={{
                '& .MuiInputBase-root': { bgcolor: 'var(--vm-bg-primary)', color: 'var(--vm-text-primary)' },
                '& .MuiInputLabel-root': { color: 'var(--vm-text-muted)' },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' },
              }}
            />
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              multiline
              rows={3}
              fullWidth
              sx={{
                '& .MuiInputBase-root': { bgcolor: 'var(--vm-bg-primary)', color: 'var(--vm-text-primary)' },
                '& .MuiInputLabel-root': { color: 'var(--vm-text-muted)' },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' },
              }}
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: 'var(--vm-text-muted)' }}>Status</InputLabel>
                <Select
                  value={formData.status}
                  label="Status"
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  sx={{ color: 'var(--vm-text-primary)', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' } }}
                >
                  {STATUS_OPTIONS.map(s => (
                    <MenuItem key={s} value={s} sx={{ color: 'var(--vm-text-primary)', textTransform: 'capitalize' }}>{s}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: 'var(--vm-text-muted)' }}>Priority</InputLabel>
                <Select
                  value={formData.priority}
                  label="Priority"
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                  sx={{ color: 'var(--vm-text-primary)', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' } }}
                >
                  {PRIORITY_OPTIONS.map(p => (
                    <MenuItem key={p} value={p} sx={{ color: 'var(--vm-text-primary)', textTransform: 'capitalize' }}>{p}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: 'var(--vm-text-muted)' }}>Category</InputLabel>
                <Select
                  value={formData.category}
                  label="Category"
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  sx={{ color: 'var(--vm-text-primary)', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' } }}
                >
                  {CATEGORY_OPTIONS.map(c => (
                    <MenuItem key={c} value={c} sx={{ color: 'var(--vm-text-primary)', textTransform: 'capitalize' }}>{c}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Assignee"
                value={formData.assignee}
                onChange={(e) => setFormData(prev => ({ ...prev, assignee: e.target.value }))}
                size="small"
                sx={{
                  '& .MuiInputBase-root': { bgcolor: 'var(--vm-bg-primary)', color: 'var(--vm-text-primary)' },
                  '& .MuiInputLabel-root': { color: 'var(--vm-text-muted)' },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' },
                }}
              />
            </Box>
            <DatePicker
              label="Due Date"
              value={formData.dueDate ? new Date(formData.dueDate) : null}
              onChange={(date) => setFormData({ ...formData, dueDate: date ? date.toISOString().split('T')[0] : '' })}
              format="dd/MM/yyyy"
              slotProps={{
                textField: {
                  fullWidth: true,
                  size: 'small',
                  sx: {
                    '& .MuiInputBase-root': { bgcolor: 'var(--vm-bg-primary)', color: 'var(--vm-text-primary)' },
                    '& .MuiInputLabel-root': { color: 'var(--vm-text-muted)' },
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' },
                  },
                },
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 0 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: 'var(--vm-text-muted)' }}>Cancel</Button>
          <GradientButton variant="primary" size="sm" onClick={handleSave} disabled={!formData.title || !formData.dueDate}>
            {editingId ? 'Save Changes' : 'Add Milestone'}
          </GradientButton>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
