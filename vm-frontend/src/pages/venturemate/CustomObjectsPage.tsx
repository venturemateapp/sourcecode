import { useCallback, useEffect, useState } from 'react';
import { Box, Typography, Card, Chip, Dialog, DialogTitle, DialogContent, TextField, IconButton, CircularProgress, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { GradientButton } from '../../components/shared/buttons';
import { graphqlRequest } from '../../lib/api';
import { useBusiness } from '../../contexts/BusinessContext';
import { Grid3x3, Plus, X, Building2, FileText } from 'lucide-react';

interface CustomObject { id: string; nameSingular: string; namePlural: string; labelSingular: string; labelPlural: string; icon: string; description: string; }
interface CustomField { id: string; objectId: string; name: string; label: string; fieldType: string; isRequired: boolean; defaultValue: string; options: string; sortOrder: number; }

const FIELD_TYPES = ['text', 'number', 'date', 'boolean', 'select', 'multi_select', 'email', 'phone', 'url', 'long_text'];

export function CustomObjectsPage() {
  const { selectedBusiness } = useBusiness();
  const bizId = selectedBusiness?.id;
  const [objects, setObjects] = useState<CustomObject[]>([]);
  const [fields, setFields] = useState<Record<string, CustomField[]>>({});
  const [loading, setLoading] = useState(true);
  const [objForm, setObjForm] = useState(false);
  const [fieldForm, setFieldForm] = useState<{ open: boolean; objectId: string }>({ open: false, objectId: '' });
  const [saving, setSaving] = useState(false);
  const [expandedObj, setExpandedObj] = useState<string | null>(null);

  const q = useCallback(async <T,>(query: string, vars?: Record<string, unknown>) => graphqlRequest<T>(query, vars), []);

  const load = useCallback(async () => {
    if (!bizId) return;
    setLoading(true);
    try {
      const d = await q<{ customObjects: CustomObject[] }>('query Q($b:ID!){customObjects(businessId:$b){id nameSingular namePlural labelSingular labelPlural icon description}}', { b: bizId });
      setObjects(d.customObjects);
    } catch { /* ignore */ }
    setLoading(false);
  }, [bizId, q]);

  useEffect(() => { load(); }, [load]);

  const loadFields = async (objId: string) => {
    if (fields[objId]) return;
    try {
      const d = await q<{ customFields: CustomField[] }>('query Q($o:ID!){customFields(objectId:$o){id objectId name label fieldType isRequired defaultValue options sortOrder}}', { o: objId });
      setFields(prev => ({ ...prev, [objId]: d.customFields }));
    } catch { /* ignore */ }
  };

  const toggleExpand = (objId: string) => {
    if (expandedObj === objId) { setExpandedObj(null); return; }
    setExpandedObj(objId);
    loadFields(objId);
  };

  const createObject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!bizId) return;
    const data = new FormData(e.currentTarget);
    setSaving(true);
    try {
      await q('mutation M($b:ID!,$s:String!,$p:String!,$l:String!,$u:String!,$i:String,$d:String){createCustomObject(businessId:$b nameSingular:$s namePlural:$p labelSingular:$l labelPlural:$u icon:$i description:$d){id}}', {
        b: bizId, s: data.get('singular'), p: data.get('plural'), l: data.get('labelSingular'), u: data.get('labelPlural'), i: data.get('icon') || 'FileText', d: data.get('description') || '',
      });
      setObjForm(false);
      load();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const createField = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setSaving(true);
    try {
      await q('mutation M($o:ID!,$n:String!,$l:String!,$t:String!,$r:Boolean,$p:String,$s:Int){createCustomField(objectId:$o name:$n label:$l fieldType:$t isRequired:$r options:$p sortOrder:$s){id}}', {
        o: fieldForm.objectId, n: data.get('name'), l: data.get('label'), t: data.get('fieldType') || 'text', r: data.get('required') === 'true', p: data.get('options') || '', s: parseInt(data.get('sortOrder') as string) || 0,
      });
      setFieldForm({ open: false, objectId: '' });
      setFields(prev => ({ ...prev, [fieldForm.objectId]: [] }));
      loadFields(fieldForm.objectId);
    } catch { /* ignore */ }
    setSaving(false);
  };

  if (!bizId) return <Box sx={{ p: 4, textAlign: 'center', color: 'var(--vm-text-muted)' }}><Building2 size={40} /><Typography sx={{ mt: 1 }}>Select a business</Typography></Box>;

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography sx={{ fontSize: { xs: 20, sm: 24, md: 28 }, fontWeight: 800, color: 'var(--vm-text-primary)' }}>Custom Objects</Typography>
          <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)' }}>Define custom data types for your business</Typography>
        </Box>
        <GradientButton variant="primary" size="sm" startIcon={<Plus size={14} />} onClick={() => setObjForm(true)}>New Object</GradientButton>
      </Box>

      {loading ? <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress size={20} sx={{ color: 'var(--vm-primary-400)' }} /></Box> : objects.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6, color: 'var(--vm-text-muted)' }}><Grid3x3 size={36} /><Typography sx={{ mt: 1, fontSize: 14 }}>No custom objects yet. Create your first one!</Typography></Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {objects.map(obj => (
            <Card key={obj.id} sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 2.5, overflow: 'hidden' }}>
              <Box sx={{ p: { xs: 1.5, sm: 2 }, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1.5 }} onClick={() => toggleExpand(obj.id)}>
                <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: 'rgba(139,92,246,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={18} color="#8b5cf6" />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'var(--vm-text-primary)' }}>{obj.labelPlural}</Typography>
                  <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>{obj.nameSingular} · {obj.description || 'No description'}</Typography>
                </Box>
                <Chip label={fields[obj.id]?.length || 0} size="small" sx={{ bgcolor: 'rgba(139,92,246,.12)', color: '#8b5cf6', fontSize: 11 }} />
              </Box>
              {expandedObj === obj.id && (
                <Box sx={{ px: { xs: 1.5, sm: 2 }, pb: 2, borderTop: '1px solid var(--vm-border-subtle)', pt: 1 }}>
                  {(fields[obj.id] || []).map(f => (
                    <Box key={f.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.75, borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'var(--vm-text-primary)', flex: 1 }}>{f.label}</Typography>
                      <Chip label={f.fieldType} size="small" sx={{ bgcolor: 'rgba(16,185,129,.1)', color: '#10b981', fontSize: 9, height: 18 }} />
                      {f.isRequired && <Chip label="Required" size="small" sx={{ bgcolor: 'rgba(245,158,11,.12)', color: '#f59e0b', fontSize: 9, height: 18 }} />}
                    </Box>
                  ))}
                  <GradientButton variant="ghost" size="sm" startIcon={<Plus size={12} />} sx={{ mt: 1 }} onClick={() => setFieldForm({ open: true, objectId: obj.id })}>Add Field</GradientButton>
                </Box>
              )}
            </Card>
          ))}
        </Box>
      )}

      <Dialog open={objForm} onClose={() => setObjForm(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: 'var(--vm-bg-secondary)', borderRadius: 3, border: '1px solid var(--vm-border-subtle)' } }}>
        <DialogTitle sx={{ borderBottom: '1px solid var(--vm-border-subtle)', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Grid3x3 size={20} color="var(--vm-primary-400)" /><Typography sx={{ fontWeight: 700 }}>New Custom Object</Typography>
          <IconButton size="small" onClick={() => setObjForm(false)} sx={{ ml: 'auto', color: 'var(--vm-text-muted)' }}><X size={18} /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <Box component="form" onSubmit={createObject} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField size="small" name="singular" label="Singular Name (e.g. project)" required inputProps={{ style: { color: 'var(--vm-text-primary)' } }} sx={{ '& label': { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
            <TextField size="small" name="plural" label="Plural Name (e.g. projects)" required inputProps={{ style: { color: 'var(--vm-text-primary)' } }} sx={{ '& label': { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
            <TextField size="small" name="labelSingular" label="Label (Singular)" required inputProps={{ style: { color: 'var(--vm-text-primary)' } }} sx={{ '& label': { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
            <TextField size="small" name="labelPlural" label="Label (Plural)" required inputProps={{ style: { color: 'var(--vm-text-primary)' } }} sx={{ '& label': { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
            <TextField size="small" name="description" label="Description" inputProps={{ style: { color: 'var(--vm-text-primary)' } }} sx={{ '& label': { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
              <GradientButton variant="ghost" size="sm" type="button" onClick={() => setObjForm(false)}>Cancel</GradientButton>
              <GradientButton variant="primary" size="sm" type="submit" disabled={saving}>{saving ? <CircularProgress size={14} /> : 'Create'}</GradientButton>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      <Dialog open={fieldForm.open} onClose={() => setFieldForm({ open: false, objectId: '' })} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: 'var(--vm-bg-secondary)', borderRadius: 3, border: '1px solid var(--vm-border-subtle)' } }}>
        <DialogTitle sx={{ borderBottom: '1px solid var(--vm-border-subtle)', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Grid3x3 size={20} color="var(--vm-primary-400)" /><Typography sx={{ fontWeight: 700 }}>Add Field</Typography>
          <IconButton size="small" onClick={() => setFieldForm({ open: false, objectId: '' })} sx={{ ml: 'auto', color: 'var(--vm-text-muted)' }}><X size={18} /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <Box component="form" onSubmit={createField} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField size="small" name="name" label="Field Name (e.g. due_date)" required inputProps={{ style: { color: 'var(--vm-text-primary)' } }} sx={{ '& label': { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
            <TextField size="small" name="label" label="Display Label" required inputProps={{ style: { color: 'var(--vm-text-primary)' } }} sx={{ '& label': { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
            <FormControl size="small" fullWidth><InputLabel sx={{ color: 'var(--vm-text-muted)' }}>Type</InputLabel>
              <Select name="fieldType" defaultValue="text" label="Type" sx={{ color: 'var(--vm-text-primary)', '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }}>
                {FIELD_TYPES.map(t => <MenuItem key={t} value={t} sx={{ textTransform: 'capitalize' }}>{t.replace('_', ' ')}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth><InputLabel sx={{ color: 'var(--vm-text-muted)' }}>Required</InputLabel>
              <Select name="required" defaultValue="false" label="Required" sx={{ color: 'var(--vm-text-primary)', '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }}>
                <MenuItem value="false">No</MenuItem><MenuItem value="true">Yes</MenuItem>
              </Select>
            </FormControl>
            <TextField size="small" name="options" label="Options (JSON array for select types)" inputProps={{ style: { color: 'var(--vm-text-primary)' } }} sx={{ '& label': { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
            <TextField size="small" name="sortOrder" label="Sort Order" type="number" defaultValue={0} inputProps={{ style: { color: 'var(--vm-text-primary)' } }} sx={{ '& label': { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
              <GradientButton variant="ghost" size="sm" type="button" onClick={() => setFieldForm({ open: false, objectId: '' })}>Cancel</GradientButton>
              <GradientButton variant="primary" size="sm" type="submit" disabled={saving}>{saving ? <CircularProgress size={14} /> : 'Add'}</GradientButton>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
