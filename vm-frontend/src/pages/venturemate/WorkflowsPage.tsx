import { useCallback, useEffect, useState } from 'react';
import { Box, Typography, Card, Chip, Dialog, DialogTitle, DialogContent, TextField, IconButton, CircularProgress } from '@mui/material';
import { GradientButton } from '../../components/shared/buttons';
import { graphqlRequest } from '../../lib/api';
import { useBusiness } from '../../contexts/BusinessContext';
import { Workflow, Plus, Trash2, ToggleLeft, ToggleRight, X, Building2, Play } from 'lucide-react';

interface WorkflowItem { id: string; name: string; description: string; isActive: boolean; createdAt: string; }

export function WorkflowsPage() {
  const { selectedBusiness } = useBusiness();
  const bizId = selectedBusiness?.id;
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const q = useCallback(async <T,>(query: string, vars?: Record<string, unknown>) => graphqlRequest<T>(query, vars), []);

  const load = useCallback(async () => {
    if (!bizId) return;
    setLoading(true);
    try {
      const d = await q<{ workflows: WorkflowItem[] }>('query Q($b:ID!){workflows(businessId:$b){id name description isActive createdAt}}', { b: bizId });
      setWorkflows(d.workflows);
    } catch { /* ignore */ }
    setLoading(false);
  }, [bizId, q]);

  useEffect(() => { load(); }, [load]);

  const createWorkflow = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!bizId) return;
    const data = new FormData(e.currentTarget);
    setSaving(true);
    try {
      await q('mutation M($b:ID!,$n:String!,$d:String){createWorkflow(businessId:$b name:$n description:$d){id}}', { b: bizId, n: data.get('name'), d: data.get('description') || '' });
      setShowForm(false);
      load();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const toggle = async (id: string, active: boolean) => {
    await q('mutation M($i:ID!,$a:Boolean!){toggleWorkflow(id:$i active:$a)}', { i: id, a: active });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this workflow?')) return;
    await q('mutation M($i:ID!){deleteWorkflow(id:$i)}', { i: id });
    load();
  };

  if (!bizId) return <Box sx={{ p: 4, textAlign: 'center', color: 'var(--vm-text-muted)' }}><Building2 size={40} /><Typography sx={{ mt: 1 }}>Select a business</Typography></Box>;

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography sx={{ fontSize: { xs: 20, sm: 24, md: 28 }, fontWeight: 800, color: 'var(--vm-text-primary)' }}>Workflows</Typography>
          <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)' }}>{workflows.filter(w => w.isActive).length} active · {workflows.length} total</Typography>
        </Box>
        <GradientButton variant="primary" size="sm" startIcon={<Plus size={14} />} onClick={() => setShowForm(true)}>New Workflow</GradientButton>
      </Box>

      {loading ? <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress size={20} sx={{ color: 'var(--vm-primary-400)' }} /></Box> : workflows.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6, color: 'var(--vm-text-muted)' }}><Workflow size={36} /><Typography sx={{ mt: 1, fontSize: 14 }}>No workflows yet. Create automation rules!</Typography></Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {workflows.map(w => (
            <Card key={w.id} sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 2.5, p: { xs: 1.5, sm: 2 }, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: w.isActive ? 'rgba(52,211,153,.12)' : 'rgba(148,163,184,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Play size={16} color={w.isActive ? '#22c55e' : '#94a3b8'} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'var(--vm-text-primary)' }}>{w.name}</Typography>
                  <Chip label={w.isActive ? 'Active' : 'Inactive'} size="small" sx={{ bgcolor: w.isActive ? 'rgba(52,211,153,.12)' : 'rgba(148,163,184,.12)', color: w.isActive ? '#22c55e' : '#94a3b8', fontSize: 9, height: 18 }} />
                </Box>
                {w.description && <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>{w.description}</Typography>}
              </Box>
              <IconButton size="small" sx={{ color: w.isActive ? '#f59e0b' : 'var(--vm-text-muted)' }} onClick={() => toggle(w.id, !w.isActive)}>
                {w.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
              </IconButton>
              <IconButton size="small" sx={{ color: '#ef444488' }} onClick={() => remove(w.id)}><Trash2 size={15} /></IconButton>
            </Card>
          ))}
        </Box>
      )}

      <Dialog open={showForm} onClose={() => setShowForm(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: 'var(--vm-bg-secondary)', borderRadius: 3, border: '1px solid var(--vm-border-subtle)' } }}>
        <DialogTitle sx={{ borderBottom: '1px solid var(--vm-border-subtle)', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Workflow size={20} color="var(--vm-primary-400)" /><Typography sx={{ fontWeight: 700 }}>New Workflow</Typography>
          <IconButton size="small" onClick={() => setShowForm(false)} sx={{ ml: 'auto', color: 'var(--vm-text-muted)' }}><X size={18} /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3.5 }}>
          <Box component="form" onSubmit={createWorkflow} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField size="small" name="name" label="Workflow Name" required inputProps={{ style: { color: 'var(--vm-text-primary)' } }} sx={{ '& label': { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
            <TextField size="small" name="description" label="Description" multiline rows={2} inputProps={{ style: { color: 'var(--vm-text-primary)' } }} sx={{ '& label': { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <GradientButton variant="ghost" size="sm" type="button" onClick={() => setShowForm(false)}>Cancel</GradientButton>
              <GradientButton variant="primary" size="sm" type="submit" disabled={saving}>{saving ? <CircularProgress size={14} /> : 'Create'}</GradientButton>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
