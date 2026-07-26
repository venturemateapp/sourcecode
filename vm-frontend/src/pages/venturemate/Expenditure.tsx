import { CardSkeleton } from '../../components/shared/Skeleton';
import { useCallback, useEffect, useState } from 'react';
import { Box, Typography, Card, Chip, TextField, IconButton, CircularProgress, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { GradientButton } from '../../components/shared/buttons';
import { Modal } from '../../components/shared/Modal';
import { graphqlRequest } from '../../lib/api';
import { useBusiness } from '../../contexts/BusinessContext';
import { Receipt, Plus, Trash2, Edit3, Building2, DollarSign, Tag, Download, X } from 'lucide-react';
import type { Expenditure, ExpenditureItem } from '../../types/venturemate';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useToast } from '../../components/shared/toast';
import { useConfirm } from '../../components/shared/useConfirm';

const EXPENSE_CATEGORIES = ['office', 'travel', 'software', 'marketing', 'legal', 'consulting', 'salary', 'equipment', 'utilities', 'rent', 'food', 'transport', 'other'];

const CATEGORY_COLORS: Record<string, string> = {
  office: '#3b82f6', travel: '#f59e0b', software: '#8b5cf6', marketing: '#ec4899',
  legal: '#10b981', consulting: '#06b6d4', salary: '#f97316', equipment: '#ef4444',
  utilities: '#6366f1', rent: '#d946ef', food: '#14b8a6', transport: '#eab308', other: '#94a3b8',
};

const EMPTY_ITEM: ExpenditureItem = { description: '', quantity: 1, unitPrice: 0 };

function calcTotal(items: ExpenditureItem[]): number {
  return items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
}

function parseItems(raw: string): ExpenditureItem[] {
  try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; }
}

const EXPENSE_FIELDS = `id businessId category description amount currency expenseDate vendor receiptUrl items itemsList { description quantity unitPrice } notes createdAt updatedAt`;

export function ExpenditurePage() {
  const { selectedBusiness } = useBusiness();
  const { format } = useCurrency();
  const toast = useToast();
  const { confirmAction, dialog } = useConfirm();
  const bizId = selectedBusiness?.id;

  const [items, setItems] = useState<Expenditure[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Partial<Expenditure> | null>(null);
  const [lineItems, setLineItems] = useState<ExpenditureItem[]>([{ ...EMPTY_ITEM }]);
  const [customCategory, setCustomCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const q = useCallback(async <T,>(query: string, vars?: Record<string, unknown>) => graphqlRequest<T>(query, vars), []);

  const load = useCallback(async () => {
    if (!bizId) return;
    setLoading(true);
    try {
      const vars: Record<string, unknown> = { b: bizId };
      if (startDate) vars.s = startDate;
      if (endDate) vars.e = endDate;
      const d = await q<{ expenditures: Expenditure[] }>(`query Q($b:ID!,$s:String,$e:String){expenditures(businessId:$b startDate:$s endDate:$e){${EXPENSE_FIELDS}}}`, vars);
      setItems(d.expenditures);
    } catch (err) {
      console.error('Failed to load expenses:', err);
    }
    setLoading(false);
  }, [bizId, q, startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setLineItems([{ ...EMPTY_ITEM }]);
    setCustomCategory('');
    setForm({ description: '', amount: 0, category: 'other', expenseDate: new Date().toISOString().split('T')[0], vendor: '', notes: '', items: '[]' });
  };

  const openEdit = (exp: Expenditure) => {
    const parsed = parseItems(exp.items);
    setLineItems(parsed.length > 0 ? parsed : [{ ...EMPTY_ITEM }]);
    const isOther = !EXPENSE_CATEGORIES.includes(exp.category);
    setCustomCategory(isOther ? exp.category : '');
    setForm({ ...exp, category: isOther ? 'other' : exp.category });
  };

  const updateLineItem = (idx: number, field: keyof ExpenditureItem, value: string | number) => {
    const next = [...lineItems];
    next[idx] = { ...next[idx], [field]: value };
    setLineItems(next);
  };

  const addLineItem = () => setLineItems([...lineItems, { ...EMPTY_ITEM }]);

  const removeLineItem = (idx: number) => {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((_, i) => i !== idx));
  };

  const save = async () => {
    if (!bizId || !form?.description) return;
    setSaving(true);
    try {
      const itemsJson = JSON.stringify(lineItems.filter(i => i.description.trim()));
      const total = calcTotal(lineItems);
      const effectiveCategory = form.category === 'other' && customCategory.trim() ? customCategory.trim() : (form.category || 'other');
      const vars: Record<string, unknown> = {
        b: bizId, c: effectiveCategory, d: form.description,
        a: total || form.amount || 0,
        e: form.expenseDate || new Date().toISOString().split('T')[0],
        v: form.vendor || '', n: form.notes || '', i: itemsJson,
      };
      if (form.id) {
        await q('mutation M($id:ID!,$b:ID!,$c:String!,$d:String!,$a:Float!,$e:String,$v:String,$n:String,$i:String){updateExpenditure(id:$id businessId:$b category:$c description:$d amount:$a expenseDate:$e vendor:$v notes:$n items:$i){id}}', { ...vars, id: form.id });
      } else {
        await q('mutation M($b:ID!,$c:String!,$d:String!,$a:Float!,$e:String,$v:String,$n:String,$i:String){createExpenditure(businessId:$b category:$c description:$d amount:$a expenseDate:$e vendor:$v notes:$n items:$i){id}}', vars);
      }
      setForm(null);
      await load();
      toast.success('Expense saved', { description: 'Expense has been saved.' });
    } catch (err) {
      console.error('Failed to save expense:', err);
      toast.error('Failed to save expense', { description: 'Please try again.' });
    }
    setSaving(false);
  };

  const deleteItem = async (id: string) => {
    if (!bizId) return;
    confirmAction({ title: 'Delete Expense', message: 'Are you sure you want to delete this expense? This cannot be undone.' }, async () => {
      try {
        await q('mutation M($id:ID!,$b:ID!){deleteExpenditure(id:$id businessId:$b)}', { id, b: bizId });
        await load();
        toast.success('Expense deleted', { description: 'Expense has been removed.' });
      } catch (err) {
        console.error('Failed to delete expense:', err);
        toast.error('Failed to delete expense', { description: 'Please try again.' });
      }
    });
  };

  const downloadPdf = async (exp: Expenditure) => {
    if (!bizId) return;
    try {
      const token = (await import('../../lib/auth')).getToken();
      await q<{ generateExpensePdf: string }>('mutation M($i:ID!,$b:ID!){generateExpensePdf(id:$i businessId:$b)}', { i: exp.id, b: bizId });
      window.open(`/api/pdf/download?type=expense&id=${exp.id}&token=${token}`, '_blank');
      toast.success('PDF generated', { description: 'Expense PDF has been created.' });
    } catch (err) {
      console.error('Failed to generate expense PDF:', err);
      toast.error('Failed to generate PDF', { description: 'Please try again.' });
    }
  };

  const totalByCategory = items.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);
  const grandTotal = items.reduce((s, e) => s + e.amount, 0);

  if (!bizId) return <Box sx={{ p: 4, textAlign: 'center', color: 'var(--vm-text-muted)' }}><Building2 size={40} /><Typography sx={{ mt: 1 }}>Select a business</Typography></Box>;

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', mb: 3, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1.5, sm: 0 } }}>
        <Box>
          <Typography sx={{ fontSize: { xs: 20, sm: 24, md: 28 }, fontWeight: 800, color: 'var(--vm-text-primary)' }}>Expenditure</Typography>
          <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)' }}>{items.length} expenses · {format(grandTotal)} total</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <DatePicker label="From" format="dd/MM/yyyy" value={startDate ? new Date(startDate) : null}
            onChange={(d) => setStartDate(d ? d.toISOString().split('T')[0] : '')}
            slotProps={{ textField: { size: 'small', sx: { width: 130, input: { color: 'var(--vm-text-primary)', fontSize: 13 }, label: { color: 'var(--vm-text-muted)', fontSize: 12 }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } } } }} />
          <DatePicker label="To" format="dd/MM/yyyy" value={endDate ? new Date(endDate) : null}
            onChange={(d) => setEndDate(d ? d.toISOString().split('T')[0] : '')}
            slotProps={{ textField: { size: 'small', sx: { width: 130, input: { color: 'var(--vm-text-primary)', fontSize: 13 }, label: { color: 'var(--vm-text-muted)', fontSize: 12 }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } } } }} />
          {(startDate || endDate) && <GradientButton variant="ghost" size="sm" onClick={() => { setStartDate(''); setEndDate(''); }}>Clear</GradientButton>}
          <GradientButton variant="primary" size="sm" startIcon={<Plus size={14} />} onClick={openCreate}>
            Add Expense
          </GradientButton>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', sm: 'repeat(4,1fr)' }, gap: { xs: 1.5, sm: 2 }, mb: 3 }}>
        <Card sx={{ p: 2, bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 2.5 }}>
          <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: 'rgba(239,68,68,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 0.75 }}>
            <DollarSign size={16} color="#ef4444" />
          </Box>
          <Typography sx={{ fontSize: 20, fontWeight: 800, color: 'var(--vm-text-primary)', overflowWrap: 'anywhere' }}>{format(grandTotal)}</Typography>
          <Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)' }}>Total Expenses</Typography>
        </Card>
        <Card sx={{ p: 2, bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 2.5 }}>
          <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: 'rgba(16,185,129,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 0.75 }}>
            <Receipt size={16} color="#10b981" />
          </Box>
          <Typography sx={{ fontSize: 20, fontWeight: 800, color: 'var(--vm-text-primary)', overflowWrap: 'anywhere' }}>{items.length}</Typography>
          <Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)' }}>Total Entries</Typography>
        </Card>
        <Card sx={{ p: 2, bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 2.5, gridColumn: { xs: '1 / -1', sm: 'auto' } }}>
          <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: 'rgba(139,92,246,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 0.75 }}>
            <Tag size={16} color="#8b5cf6" />
          </Box>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'var(--vm-text-primary)', mb: 0.5 }}>By Category</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {Object.entries(totalByCategory).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([cat, val]) => (
              <Chip key={cat} label={`${cat} ${format(val)}`} size="small"
                sx={{ bgcolor: `${CATEGORY_COLORS[cat] || '#94a3b8'}15`, color: CATEGORY_COLORS[cat] || '#94a3b8', fontSize: 9, height: 20 }} />
            ))}
          </Box>
        </Card>
      </Box>

      {loading ? <CardSkeleton count={4} type='card' /> : items.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6, color: 'var(--vm-text-muted)' }}><Receipt size={36} /><Typography sx={{ mt: 1, fontSize: 14 }}>No expenses recorded yet</Typography></Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {items.map(e => (
            <Card key={e.id} sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 2.5, p: { xs: 1.5, sm: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 6, height: 40, borderRadius: 1, bgcolor: CATEGORY_COLORS[e.category] || '#94a3b8', flexShrink: 0 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'var(--vm-text-primary)', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{e.description}</Typography>
                    <Chip label={e.category} size="small" sx={{ bgcolor: `${CATEGORY_COLORS[e.category] || '#94a3b8'}15`, color: CATEGORY_COLORS[e.category] || '#94a3b8', fontSize: 9, height: 18 }} />
                    {e.itemsList && e.itemsList.length > 0 && (
                      <Chip label={`${e.itemsList.length} item${e.itemsList.length !== 1 ? 's' : ''}`} size="small" sx={{ bgcolor: 'rgba(16,185,129,.12)', color: '#10b981', fontSize: 9, height: 18 }} />
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 0.25 }}>
                    {e.vendor && <Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{e.vendor}</Typography>}
                    <Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{new Date(e.expenseDate).toLocaleDateString('en-GB')}</Typography>
                  </Box>
                </Box>
                <Typography sx={{ fontSize: 16, fontWeight: 800, color: '#ef4444', flexShrink: 0, overflowWrap: 'anywhere' }}>-{format(e.amount)}</Typography>
                <IconButton size="small" sx={{ color: 'var(--vm-text-muted)' }} onClick={() => downloadPdf(e)}><Download size={14} /></IconButton>
                <IconButton size="small" sx={{ color: 'var(--vm-text-muted)' }} onClick={() => openEdit(e)}><Edit3 size={14} /></IconButton>
                <IconButton size="small" sx={{ color: '#ef444488' }} onClick={() => deleteItem(e.id)}><Trash2 size={14} /></IconButton>
              </Box>
            </Card>
          ))}
        </Box>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Edit Expense' : 'Add Expense'} icon={<Receipt size={20} />}
        actions={<><GradientButton variant="ghost" size="sm" onClick={() => setForm(null)}>Cancel</GradientButton>
          <GradientButton variant="primary" size="sm" disabled={saving || !form?.description} onClick={save}>
            {saving ? <CircularProgress size={14} /> : form?.id ? 'Update' : 'Add'}
          </GradientButton></>}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <TextField size="small" label="Description" value={form?.description || ''} onChange={e => setForm({ ...form, description: e.target.value })}
              sx={{ gridColumn: { xs: '1', sm: '1 / -1' }, input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
            <FormControl size="small">
              <InputLabel sx={{ color: 'var(--vm-text-muted)' }}>Category</InputLabel>
              <Select value={form?.category || 'other'} label="Category" onChange={e => setForm({ ...form, category: e.target.value })}
                sx={{ color: 'var(--vm-text-primary)', '& fieldset': { borderColor: 'var(--vm-border-subtle)' }, textTransform: 'capitalize' }}>
                {EXPENSE_CATEGORIES.map(c => <MenuItem key={c} value={c} sx={{ textTransform: 'capitalize' }}>{c}</MenuItem>)}
              </Select>
            </FormControl>
            {form?.category === 'other' && (
              <TextField size="small" label="Custom Category" value={customCategory} onChange={e => setCustomCategory(e.target.value)}
                placeholder="Type your own category"
                sx={{ input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
            )}
            <TextField size="small" label="Vendor" value={form?.vendor || ''} onChange={e => setForm({ ...form, vendor: e.target.value })}
              sx={{ input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
            <DatePicker label="Date" format="dd/MM/yyyy" value={form?.expenseDate ? new Date(form.expenseDate) : null}
              onChange={(date) => setForm({ ...form, expenseDate: date ? date.toISOString().split('T')[0] : '' })}
              slotProps={{ textField: { size: 'small', sx: { input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } } } }} />
          </Box>

          <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'var(--vm-text-primary)' }}>Line Items</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {lineItems.map((item, idx) => (
              <Box key={idx} sx={{ p: 1.5, bgcolor: 'var(--vm-bg-tertiary)', borderRadius: 2, border: '1px solid var(--vm-border-subtle)' }}>
                <Box sx={{ display: { xs: 'block', sm: 'flex' }, gap: 1, alignItems: 'center' }}>
                  <TextField size="small" placeholder="Description" value={item.description} onChange={e => updateLineItem(idx, 'description', e.target.value)}
                    sx={{ width: { xs: '100%', sm: 'auto' }, mb: { xs: 1, sm: 0 }, flex: { sm: 1 }, minWidth: { sm: 120 }, '& input': { color: 'var(--vm-text-primary)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', width: { xs: '100%', sm: 'auto' } }}>
                    <TextField size="small" type="number" placeholder="Qty" value={item.quantity || ''} onChange={e => updateLineItem(idx, 'quantity', parseInt(e.target.value) || 0)}
                      sx={{ width: { xs: '30%', sm: 70 }, '& input': { color: 'var(--vm-text-primary)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
                    <TextField size="small" type="number" placeholder="Price" value={item.unitPrice || ''} onChange={e => updateLineItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                      sx={{ width: { xs: '30%', sm: 100 }, '& input': { color: 'var(--vm-text-primary)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
                    <Typography sx={{ fontSize: 13, color: 'var(--vm-text-primary)', minWidth: { xs: 50, sm: 70 }, textAlign: 'right', fontWeight: 600 }}>
                      {(item.quantity * item.unitPrice).toLocaleString()}
                    </Typography>
                    <IconButton size="small" onClick={() => removeLineItem(idx)} disabled={lineItems.length <= 1} sx={{ color: '#ef444488' }}><X size={14} /></IconButton>
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <GradientButton variant="outline" size="sm" onClick={addLineItem}><Plus size={12} style={{ marginRight: 4 }} /> Add Item</GradientButton>
            <Typography sx={{ fontSize: 15, fontWeight: 800, color: 'var(--vm-text-primary)' }}>
              Total: {calcTotal(lineItems).toLocaleString()}
            </Typography>
          </Box>

          <TextField size="small" label="Notes" multiline rows={2} value={form?.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })}
            sx={{ textarea: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
        </Box>
      </Modal>
      {dialog}
    </Box>
  );
}
