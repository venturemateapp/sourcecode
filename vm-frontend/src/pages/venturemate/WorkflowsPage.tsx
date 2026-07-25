import { CardSkeleton } from '../../components/shared/Skeleton';
import { useCallback, useEffect, useState } from 'react';
import { Box, Typography, Card, Chip, TextField, IconButton, CircularProgress, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { GradientButton } from '../../components/shared/buttons';
import { Modal } from '../../components/shared/Modal';
import { graphqlRequest } from '../../lib/api';
import { useBusiness } from '../../contexts/BusinessContext';
import { Workflow, Plus, Trash2, ToggleLeft, ToggleRight, Building2, Play, Zap } from 'lucide-react';

interface WorkflowItem {
  id: string; name: string; description: string; isActive: boolean;
  triggerType: string; targetObject: string; conditions: string;
  actionType: string; actionConfig: string; createdAt: string;
}

const TRIGGER_TYPES = [
  { value: 'record_created', label: 'Record Created', icon: 'Plus' },
  { value: 'record_updated', label: 'Record Updated', icon: 'Database' },
  { value: 'deal_stage_changed', label: 'Deal Stage Changed', icon: 'Zap' },
];

const ACTION_TYPES = [
  { value: 'send_email', label: 'Send Email', icon: 'Mail' },
  { value: 'update_record', label: 'Update Record', icon: 'Database' },
  { value: 'webhook', label: 'Webhook', icon: 'Globe' },
];

const OBJECT_TYPES = ['crm_contacts', 'crm_deals', 'crm_tasks', 'crm_companies'];

export function WorkflowsPage() {
  const { selectedBusiness } = useBusiness();
  const bizId = selectedBusiness?.id;
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', description: '',
    triggerType: 'record_created', targetObject: 'crm_deals', conditions: '',
    actionType: 'send_email', actionConfig: '{"to":"","subject":"","body":""}',
  });

  const q = useCallback(async <T,>(query: string, vars?: Record<string, unknown>) => graphqlRequest<T>(query, vars), []);

  const load = useCallback(async () => {
    if (!bizId) return;
    setLoading(true);
    try {
      const d = await q<{ workflows: WorkflowItem[] }>('query Q($b:ID!){workflows(businessId:$b){id name description isActive triggerType targetObject conditions actionType actionConfig createdAt}}', { b: bizId });
      setWorkflows(d.workflows);
    } catch { /* ignore */ }
    setLoading(false);
  }, [bizId, q]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!bizId || !form.name) return;
    setSaving(true);
    try {
      await q('mutation M($b:ID!,$n:String!,$d:String,$t:String!,$o:String!,$c:String,$a:String!,$g:String!){createWorkflow(businessId:$b name:$n description:$d triggerType:$t targetObject:$o conditions:$c actionType:$a actionConfig:$g){id}}', {
        b: bizId, n: form.name, d: form.description || '',
        t: form.triggerType, o: form.targetObject, c: form.conditions,
        a: form.actionType, g: form.actionConfig,
      });
      setShowForm(false);
      setForm({ name: '', description: '', triggerType: 'record_created', targetObject: 'crm_deals', conditions: '', actionType: 'send_email', actionConfig: '{"to":"","subject":"","body":""}' });
      await load();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const testRun = async (id: string) => {
    const data = JSON.stringify({ stage: 'closed_won', amount: 50000, customerName: 'Test' });
    await q('mutation M($w:ID!,$d:String!){executeWorkflow(workflowId:$w triggerData:$d)}', { w: id, d: data });
  };

  const toggle = async (id: string, active: boolean) => {
    await q('mutation M($i:ID!,$a:Boolean!){toggleWorkflow(id:$i active:$a)}', { i: id, a: active });
    await load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this workflow?')) return;
    await q('mutation M($i:ID!){deleteWorkflow(id:$i)}', { i: id });
    await load();
  };

  const getActionLabel = (type: string, config: string) => {
    try {
      const c = JSON.parse(config);
      switch (type) {
        case 'send_email': return `Email → ${c.to || '...'}`;
        case 'update_record': return `Update → ${c.objectName || '...'}`;
        case 'webhook': return `Webhook → ${c.url || '...'}`;
        default: return type;
      }
    } catch { return type; }
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

      {loading ? <CardSkeleton count={4} type='card' /> : workflows.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6, color: 'var(--vm-text-muted)' }}><Workflow size={36} /><Typography sx={{ mt: 1, fontSize: 14 }}>No workflows yet. Create automation rules with triggers and actions!</Typography></Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {workflows.map(w => (
            <Card key={w.id} sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 2.5, overflow: 'hidden' }}>
              <Box sx={{ p: { xs: 1.5, sm: 2 }, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: w.isActive ? 'rgba(52,211,153,.12)' : 'rgba(148,163,184,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Zap size={16} color={w.isActive ? '#22c55e' : '#94a3b8'} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }} onClick={() => setExpandedId(expandedId === w.id ? null : w.id)} style={{ cursor: 'pointer' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'var(--vm-text-primary)' }}>{w.name}</Typography>
                    <Chip label={w.isActive ? 'Active' : 'Inactive'} size="small" sx={{ bgcolor: w.isActive ? 'rgba(52,211,153,.12)' : 'rgba(148,163,184,.12)', color: w.isActive ? '#22c55e' : '#94a3b8', fontSize: 9, height: 18 }} />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, mt: 0.25, flexWrap: 'wrap' }}>
                    {w.triggerType && <Chip label={`When: ${w.triggerType.replace('_', ' ')}`} size="small" sx={{ bgcolor: 'rgba(59,130,246,.12)', color: '#3b82f6', fontSize: 9, height: 18 }} />}
                    {w.actionType && <Chip label={`Do: ${getActionLabel(w.actionType, w.actionConfig)}`} size="small" sx={{ bgcolor: 'rgba(16,185,129,.12)', color: '#10b981', fontSize: 9, height: 18 }} />}
                  </Box>
                </Box>
                <IconButton size="small" sx={{ color: '#3b82f6' }} onClick={() => testRun(w.id)} title="Test Run"><Play size={15} /></IconButton>
                <IconButton size="small" sx={{ color: w.isActive ? '#f59e0b' : 'var(--vm-text-muted)' }} onClick={() => toggle(w.id, !w.isActive)}>
                  {w.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                </IconButton>
                <IconButton size="small" sx={{ color: '#ef444488' }} onClick={() => remove(w.id)}><Trash2 size={15} /></IconButton>
              </Box>
              {expandedId === w.id && (
                <Box sx={{ px: { xs: 1.5, sm: 2 }, pb: 2, borderTop: '1px solid var(--vm-border-subtle)', pt: 1.5 }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                    <Box>
                      <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'var(--vm-text-muted)', mb: 0.5, textTransform: 'uppercase' }}>Trigger</Typography>
                      <Chip label={w.triggerType?.replace('_', ' ') || '—'} size="small" sx={{ bgcolor: 'rgba(59,130,246,.12)', color: '#3b82f6', fontSize: 10 }} />
                      {w.targetObject && <Chip label={w.targetObject} size="small" sx={{ ml: 0.5, bgcolor: 'rgba(139,92,246,.12)', color: '#a78bfa', fontSize: 10 }} />}
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'var(--vm-text-muted)', mb: 0.5, textTransform: 'uppercase' }}>Action</Typography>
                      <Chip label={w.actionType?.replace('_', ' ') || '—'} size="small" sx={{ bgcolor: 'rgba(16,185,129,.12)', color: '#10b981', fontSize: 10 }} />
                    </Box>
                    {w.description && (
                      <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
                        <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>{w.description}</Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              )}
            </Card>
          ))}
        </Box>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Automation Workflow" icon={<Workflow size={20} />}
        actions={<><GradientButton variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</GradientButton>
          <GradientButton variant="primary" size="sm" disabled={saving || !form.name || !form.actionType || !form.triggerType} onClick={save}>
            {saving ? <CircularProgress size={14} /> : 'Create Workflow'}
          </GradientButton></>}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <TextField size="small" label="Workflow Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            inputProps={{ style: { color: 'var(--vm-text-primary)' } }} sx={{ '& label': { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
          <TextField size="small" label="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} multiline rows={2}
            inputProps={{ style: { color: 'var(--vm-text-primary)' } }} sx={{ '& label': { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'var(--vm-text-primary)' }}>1. When should this trigger?</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
            <FormControl size="small" fullWidth><InputLabel sx={{ color: 'var(--vm-text-muted)' }}>Trigger Type</InputLabel>
              <Select value={form.triggerType} label="Trigger Type" onChange={e => setForm({ ...form, triggerType: e.target.value })}
                sx={{ color: 'var(--vm-text-primary)', '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }}>
                {TRIGGER_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth><InputLabel sx={{ color: 'var(--vm-text-muted)' }}>Target Object</InputLabel>
              <Select value={form.targetObject} label="Target Object" onChange={e => setForm({ ...form, targetObject: e.target.value })}
                sx={{ color: 'var(--vm-text-primary)', '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }}>
                {OBJECT_TYPES.map(o => <MenuItem key={o} value={o}>{o.replace('crm_', '').replace('_', ' ')}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'var(--vm-text-primary)' }}>2. What should it do?</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
            <FormControl size="small" fullWidth><InputLabel sx={{ color: 'var(--vm-text-muted)' }}>Action Type</InputLabel>
              <Select value={form.actionType} label="Action Type" onChange={e => {
                let config = '{}';
                if (e.target.value === 'send_email') config = '{"to":"","subject":"","body":""}';
                if (e.target.value === 'webhook') config = '{"url":"","method":"POST","fields":{}}';
                if (e.target.value === 'update_record') config = '{"objectName":"crm_deals","recordId":"","fields":{}}';
                setForm({ ...form, actionType: e.target.value, actionConfig: config });
              }}
                sx={{ color: 'var(--vm-text-primary)', '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }}>
                {ACTION_TYPES.map(a => <MenuItem key={a.value} value={a.value}>{a.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
          {form.actionType === 'send_email' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <TextField size="small" label="Send To" value={(() => { try { return JSON.parse(form.actionConfig).to; } catch { return ''; } })()} onChange={e => setForm({ ...form, actionConfig: JSON.stringify({ ...JSON.parse(form.actionConfig), to: e.target.value }) })}
                inputProps={{ style: { color: 'var(--vm-text-primary)' } }} sx={{ '& label': { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
              <TextField size="small" label="Subject" value={(() => { try { return JSON.parse(form.actionConfig).subject; } catch { return ''; } })()} onChange={e => setForm({ ...form, actionConfig: JSON.stringify({ ...JSON.parse(form.actionConfig), subject: e.target.value }) })}
                inputProps={{ style: { color: 'var(--vm-text-primary)' } }} sx={{ '& label': { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
              <TextField size="small" label="Email Body" multiline rows={3} value={(() => { try { return JSON.parse(form.actionConfig).body; } catch { return ''; } })()} onChange={e => setForm({ ...form, actionConfig: JSON.stringify({ ...JSON.parse(form.actionConfig), body: e.target.value }) })}
                inputProps={{ style: { color: 'var(--vm-text-primary)' } }} sx={{ '& label': { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
            </Box>
          )}
          {form.actionType === 'webhook' && (
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
              <TextField size="small" label="Webhook URL" value={(() => { try { return JSON.parse(form.actionConfig).url; } catch { return ''; } })()} onChange={e => setForm({ ...form, actionConfig: JSON.stringify({ ...JSON.parse(form.actionConfig), url: e.target.value }) })}
                sx={{ gridColumn: '1 / -1', input: { color: 'var(--vm-text-primary)' }, '& label': { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
              <FormControl size="small" fullWidth><InputLabel sx={{ color: 'var(--vm-text-muted)' }}>Method</InputLabel>
                <Select value={(() => { try { return JSON.parse(form.actionConfig).method; } catch { return 'POST'; } })()} label="Method" onChange={e => setForm({ ...form, actionConfig: JSON.stringify({ ...JSON.parse(form.actionConfig), method: e.target.value }) })}
                  sx={{ color: 'var(--vm-text-primary)', '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }}>
                  <MenuItem value="POST">POST</MenuItem><MenuItem value="GET">GET</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
          {form.actionType === 'update_record' && (
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
              <TextField size="small" label="Object Name" value={(() => { try { return JSON.parse(form.actionConfig).objectName; } catch { return ''; } })()} onChange={e => setForm({ ...form, actionConfig: JSON.stringify({ ...JSON.parse(form.actionConfig), objectName: e.target.value }) })}
                inputProps={{ style: { color: 'var(--vm-text-primary)' } }} sx={{ '& label': { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
              <TextField size="small" label="Record ID (or use trigger)" value={(() => { try { return JSON.parse(form.actionConfig).recordId; } catch { return ''; } })()} onChange={e => setForm({ ...form, actionConfig: JSON.stringify({ ...JSON.parse(form.actionConfig), recordId: e.target.value }) })}
                inputProps={{ style: { color: 'var(--vm-text-primary)' } }} sx={{ '& label': { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
            </Box>
          )}
        </Box>
      </Modal>
    </Box>
  );
}
