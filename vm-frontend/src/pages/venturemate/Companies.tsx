import { useCallback, useEffect, useState } from 'react';
import { Box, Typography, Card, Chip, Dialog, DialogTitle, DialogContent, TextField, IconButton, Tooltip, CircularProgress, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { GradientButton } from '../../components/shared/buttons';
import { graphqlRequest } from '../../lib/api';
import { useBusiness } from '../../contexts/BusinessContext';
import { Building2, Plus, Trash2, Edit3, X, Globe, Users, DollarSign, MapPin } from 'lucide-react';

interface Company {
  id: string;
  businessId: string;
  name: string;
  domain: string;
  industry: string;
  employeeCount: number;
  revenue: number;
  website: string;
  phone: string;
  email: string;
  addressCity: string;
  addressCountry: string;
  description: string;
  logoUrl: string;
  createdAt: string;
}

const INDUSTRIES = ['Technology', 'Healthcare', 'Finance', 'Education', 'E-commerce', 'Manufacturing', 'Media', 'Consulting', 'Real Estate', 'Energy', 'Transportation', 'Food & Beverage', 'Nonprofit', 'Other'];

export function CompaniesPage() {
  const { selectedBusiness } = useBusiness();
  const bizId = selectedBusiness?.id;

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Partial<Company> | null>(null);
  const [saving, setSaving] = useState(false);

  const q = useCallback(async <T,>(query: string, vars?: Record<string, unknown>) => graphqlRequest<T>(query, vars), []);

  const load = useCallback(async () => {
    if (!bizId) return;
    setLoading(true);
    try {
      const d = await q<{ crmCompanies: Company[] }>('query Q($b:ID!){crmCompanies(businessId:$b){id businessId name domain industry employeeCount revenue website phone email addressCity addressCountry description logoUrl createdAt}}', { b: bizId });
      setCompanies(d.crmCompanies);
    } catch { /* ignore */ }
    setLoading(false);
  }, [bizId, q]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!bizId || !form?.name) return;
    setSaving(true);
    try {
      if (form.id) {
        await q('mutation M($id:ID!,$b:ID!,$n:String!,$d:String,$i:String,$e:Int,$r:Float,$w:String,$p:String,$m:String,$c:String,$s:String,$z:String,$o:String,$desc:String){updateCrmCompany(id:$id businessId:$b name:$n domain:$d industry:$i employeeCount:$e revenue:$r website:$w phone:$p email:$m addressCity:$c addressState:$s addressZip:$z addressCountry:$o description:$desc){id}}', {
          id: form.id, b: bizId, n: form.name,
          d: form.domain || '', i: form.industry || '', e: form.employeeCount || 0, r: form.revenue || 0,
          w: form.website || '', p: form.phone || '', m: form.email || '',
          c: form.addressCity || '', s: '', z: '', o: form.addressCountry || '', desc: form.description || '',
        });
      } else {
        await q('mutation M($b:ID!,$n:String!,$d:String,$i:String,$e:Int,$r:Float,$w:String,$p:String,$m:String,$c:String,$o:String,$desc:String){createCrmCompany(businessId:$b name:$n domain:$d industry:$i employeeCount:$e revenue:$r website:$w phone:$p email:$m addressCity:$c addressCountry:$o description:$desc){id}}', {
          b: bizId, n: form.name,
          d: form.domain || '', i: form.industry || '', e: form.employeeCount || 0, r: form.revenue || 0,
          w: form.website || '', p: form.phone || '', m: form.email || '',
          c: form.addressCity || '', o: form.addressCountry || '', desc: form.description || '',
        });
      }
      setForm(null);
      load();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const deleteCompany = async (id: string) => {
    if (!bizId || !confirm('Delete this company?')) return;
    await q('mutation M($id:ID!,$b:ID!){deleteCrmCompany(id:$id businessId:$b)}', { id, b: bizId });
    load();
  };

  if (!bizId) return <Box sx={{ p: 4, textAlign: 'center', color: 'var(--vm-text-muted)' }}><Building2 size={40} /><Typography sx={{ mt: 1 }}>Select a business</Typography></Box>;

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', mb: 3, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1.5, sm: 0 } }}>
        <Box>
          <Typography sx={{ fontSize: { xs: 20, sm: 24, md: 28 }, fontWeight: 800, color: 'var(--vm-text-primary)' }}>Companies</Typography>
          <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)' }}>{companies.length} companies</Typography>
        </Box>
        <GradientButton variant="primary" size="sm" startIcon={<Plus size={14} />} onClick={() => setForm({ name: '', industry: '' })}>Add Company</GradientButton>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2,1fr)', lg: 'repeat(3,1fr)' }, gap: 2 }}>
        {loading ? <Box sx={{ gridColumn: '1 / -1', textAlign: 'center', py: 6 }}><CircularProgress size={20} sx={{ color: 'var(--vm-primary-400)' }} /></Box> : companies.length === 0 ? (
          <Box sx={{ gridColumn: '1 / -1', textAlign: 'center', py: 6, color: 'var(--vm-text-muted)' }}><Building2 size={36} /><Typography sx={{ mt: 1, fontSize: 14 }}>No companies yet</Typography></Box>
        ) : companies.map(c => (
          <Card key={c.id} sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
              <Box sx={{ width: 44, height: 44, borderRadius: 1.5, bgcolor: 'rgba(16,185,129,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Building2 size={20} color="#10b981" />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'var(--vm-text-primary)' }}>{c.name}</Typography>
                {c.industry && <Chip label={c.industry} size="small" sx={{ mt: 0.25, bgcolor: 'rgba(139,92,246,.12)', color: '#a78bfa', fontSize: 9, height: 18 }} />}
              </Box>
              <Box sx={{ display: 'flex', gap: 0.25, flexShrink: 0 }}>
                <Tooltip title="Edit"><IconButton size="small" sx={{ color: 'var(--vm-text-muted)' }} onClick={() => setForm(c)}><Edit3 size={13} /></IconButton></Tooltip>
                <Tooltip title="Delete"><IconButton size="small" sx={{ color: '#ef444488' }} onClick={() => deleteCompany(c.id)}><Trash2 size={13} /></IconButton></Tooltip>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 1.5 }}>
              {c.domain && <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Globe size={12} color="var(--vm-text-muted)" /><Typography sx={{ fontSize: 12, color: 'var(--vm-text-secondary)' }}>{c.domain}</Typography></Box>}
              {c.employeeCount > 0 && <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Users size={12} color="var(--vm-text-muted)" /><Typography sx={{ fontSize: 12, color: 'var(--vm-text-secondary)' }}>{c.employeeCount} employees</Typography></Box>}
              {c.revenue > 0 && <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><DollarSign size={12} color="var(--vm-text-muted)" /><Typography sx={{ fontSize: 12, color: 'var(--vm-text-secondary)' }}>{formatCurrency(c.revenue)} revenue</Typography></Box>}
              {c.addressCity && <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><MapPin size={12} color="var(--vm-text-muted)" /><Typography sx={{ fontSize: 12, color: 'var(--vm-text-secondary)' }}>{c.addressCity}{c.addressCountry ? `, ${c.addressCountry}` : ''}</Typography></Box>}
            </Box>

            {c.description && <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{c.description}</Typography>}
          </Card>
        ))}
      </Box>

      <Dialog open={!!form} onClose={() => setForm(null)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: 'var(--vm-bg-secondary)', borderRadius: 3, border: '1px solid var(--vm-border-subtle)' } }}>
        <DialogTitle sx={{ borderBottom: '1px solid var(--vm-border-subtle)', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Building2 size={20} color="var(--vm-primary-400)" />
          <Typography sx={{ fontWeight: 700 }}>{form?.id ? 'Edit' : 'Add'} Company</Typography>
          <IconButton size="small" onClick={() => setForm(null)} sx={{ ml: 'auto', color: 'var(--vm-text-muted)' }}><X size={18} /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3.5 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <TextField size="small" label="Company Name" value={form?.name || ''} onChange={e => setForm({ ...form, name: e.target.value })}
              sx={{ gridColumn: { xs: '1', sm: '1 / -1' }, input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
            <TextField size="small" label="Domain" value={form?.domain || ''} onChange={e => setForm({ ...form, domain: e.target.value })}
              sx={{ input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
            <FormControl size="small">
              <InputLabel sx={{ color: 'var(--vm-text-muted)' }}>Industry</InputLabel>
              <Select value={form?.industry || ''} label="Industry" onChange={e => setForm({ ...form, industry: e.target.value })}
                sx={{ color: 'var(--vm-text-primary)', '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }}>
                {INDUSTRIES.map(i => <MenuItem key={i} value={i}>{i}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField size="small" label="Employees" type="number" value={form?.employeeCount || ''} onChange={e => setForm({ ...form, employeeCount: parseInt(e.target.value) || 0 })}
              sx={{ input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
            <TextField size="small" label="Revenue" type="number" value={form?.revenue || ''} onChange={e => setForm({ ...form, revenue: parseFloat(e.target.value) || 0 })}
              sx={{ input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
            <TextField size="small" label="Website" value={form?.website || ''} onChange={e => setForm({ ...form, website: e.target.value })}
              sx={{ input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
            <TextField size="small" label="Phone" value={form?.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })}
              sx={{ input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
            <TextField size="small" label="Email" value={form?.email || ''} onChange={e => setForm({ ...form, email: e.target.value })}
              sx={{ input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
            <TextField size="small" label="City" value={form?.addressCity || ''} onChange={e => setForm({ ...form, addressCity: e.target.value })}
              sx={{ input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
            <TextField size="small" label="Country" value={form?.addressCountry || ''} onChange={e => setForm({ ...form, addressCountry: e.target.value })}
              sx={{ input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
            <TextField size="small" label="Description" multiline rows={2} value={form?.description || ''} onChange={e => setForm({ ...form, description: e.target.value })}
              sx={{ gridColumn: { xs: '1', sm: '1 / -1' }, textarea: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
          </Box>
        </DialogContent>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, p: 2.5, pt: 0 }}>
          <GradientButton variant="ghost" size="sm" onClick={() => setForm(null)}>Cancel</GradientButton>
          <GradientButton variant="primary" size="sm" disabled={saving || !form?.name} onClick={save}>
            {saving ? <CircularProgress size={14} /> : form?.id ? 'Update' : 'Create'}
          </GradientButton>
        </Box>
      </Dialog>
    </Box>
  );
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
}
