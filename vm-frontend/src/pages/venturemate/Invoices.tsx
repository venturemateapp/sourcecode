import { CardSkeleton } from '../../components/shared/Skeleton';
import { useCallback, useEffect, useState } from 'react';
import { Box, Typography, Card, Chip, TextField, IconButton, Tooltip, CircularProgress, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { GradientButton } from '../../components/shared/buttons';
import { Modal } from '../../components/shared/Modal';
import { graphqlRequest } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useBusiness } from '../../contexts/BusinessContext';
import { FileText, Plus, Download, Trash2, Send, CheckCircle, XCircle, X, Building2 } from 'lucide-react';
import type { Invoice } from '../../types/venturemate';

export function InvoicesPage() {
  const { user } = useAuth();
  const { selectedBusiness } = useBusiness();
  const bizId = selectedBusiness?.id;

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Partial<Invoice> | null>(null);
  const [saving, setSaving] = useState(false);

  const q = useCallback(async <T,>(query: string, vars?: Record<string, unknown>) => graphqlRequest<T>(query, vars), []);

  const load = useCallback(async () => {
    if (!bizId) return;
    setLoading(true);
    try {
      const d = await q<{ invoices: Invoice[] }>('query Q($b:ID!){invoices(businessId:$b){id userId businessId invoiceNumber customerName customerEmail amount subtotal taxRate taxAmount discount shippingCost currency status dueDate issueDate paidDate items notes customerAddress billingAddress poNumber paymentTerms pdfUrl pdfGeneratedAt createdAt updatedAt}}', { b: bizId });
      setInvoices(d.invoices);
    } catch { /* ignore */ }
    setLoading(false);
  }, [bizId, q]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!bizId || !user || !form?.customerName || !form?.invoiceNumber || !form?.amount) return;
    setSaving(true);
    try {
      if (form.id) {
        // update not implemented in full - use status update instead
      } else {
        await q('mutation M($u:ID!,$b:ID!,$n:String!,$c:String!,$a:Float!,$d:String!,$s:Float,$t:Float,$x:Float,$sc:Float,$cu:String,$i:String,$o:String,$ca:String,$ba:String,$po:String,$pt:String){createInvoice(userId:$u businessId:$b invoiceNumber:$n customerName:$c amount:$a dueDate:$d subtotal:$s taxRate:$t taxAmount:$x shippingCost:$sc currency:$cu items:$i notes:$o customerAddress:$ca billingAddress:$ba poNumber:$po paymentTerms:$pt){id}}', {
          u: user.id, b: bizId, n: form.invoiceNumber, c: form.customerName, a: form.amount || 0, d: form.dueDate || new Date().toISOString().split('T')[0],
          s: form.subtotal || 0, t: form.taxRate || 0, x: form.taxAmount || 0, sc: form.shippingCost || 0,
          cu: form.currency || 'USD', i: form.items || '[]', o: form.notes || '',
          ca: form.customerAddress || '', ba: form.billingAddress || '', po: form.poNumber || '', pt: form.paymentTerms || 'net30',
        });
      }
      setForm(null);
      load();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const updateStatus = async (id: string, status: string) => {
    await q('mutation M($i:ID!,$s:String!){updateInvoiceStatus(id:$i status:$s){id status}}', { i: id, s: status });
    load();
  };

  const deleteInvoice = async (id: string) => {
    if (!user || !confirm('Delete this invoice?')) return;
    await q('mutation M($i:ID!,$u:ID!){deleteInvoice(id:$i userId:$u)}', { i: id, u: user.id });
    load();
  };

  const downloadPdf = async (inv: Invoice) => {
    if (inv.pdfUrl) { window.open(inv.pdfUrl, '_blank'); return; }
    if (!bizId) return;
    try {
      const d = await q<{ generateInvoicePdf: string }>('mutation M($i:ID!,$b:ID!){generateInvoicePdf(id:$i businessId:$b)}', { i: inv.id, b: bizId });
      if (d.generateInvoicePdf) window.open(d.generateInvoicePdf, '_blank');
    } catch { /* ignore */ }
  };

  const statusColor: Record<string, string> = { draft: '#94a3b8', sent: '#3b82f6', paid: '#22c55e', overdue: '#ef4444', cancelled: '#6b7280' };

  if (!bizId) return <Box sx={{ p: 4, textAlign: 'center', color: 'var(--vm-text-muted)' }}><Building2 size={40} /><Typography sx={{ mt: 1 }}>Select a business</Typography></Box>;

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', mb: 3, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1.5, sm: 0 } }}>
        <Box>
          <Typography sx={{ fontSize: { xs: 20, sm: 24, md: 28 }, fontWeight: 800, color: 'var(--vm-text-primary)' }}>Invoices</Typography>
          <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)' }}>{invoices.length} invoices · {invoices.filter(i => i.status === 'paid').length} paid</Typography>
        </Box>
        <GradientButton variant="primary" size="sm" startIcon={<Plus size={14} />} onClick={() => setForm({ invoiceNumber: `INV-${Date.now().toString(36).toUpperCase()}`, customerName: '', amount: 0, currency: 'USD', dueDate: new Date().toISOString().split('T')[0], paymentTerms: 'net30', items: '[]' })}>
          New Invoice
        </GradientButton>
      </Box>

      {loading ? <CardSkeleton count={4} type='card' /> : invoices.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6, color: 'var(--vm-text-muted)' }}><FileText size={36} /><Typography sx={{ mt: 1, fontSize: 14 }}>No invoices yet</Typography></Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {invoices.map(inv => (
            <Card key={inv.id} sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 2.5, p: { xs: 1.5, sm: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                <Box sx={{ width: 40, height: 40, borderRadius: 1.5, bgcolor: `${statusColor[inv.status] || '#94a3b8'}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={18} color={statusColor[inv.status] || '#94a3b8'} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 200 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'var(--vm-text-primary)', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{inv.invoiceNumber}</Typography>
                    <Chip label={inv.status.replace('_', ' ')} size="small" sx={{ bgcolor: `${statusColor[inv.status] || '#94a3b8'}18`, color: statusColor[inv.status] || '#94a3b8', fontSize: 9, fontWeight: 700, height: 20 }} />
                    {inv.pdfUrl && <Chip label="PDF" size="small" sx={{ bgcolor: 'rgba(16,185,129,.12)', color: '#10b981', fontSize: 9, height: 20 }} />}
                  </Box>
                  <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{inv.customerName} · {inv.currency} {inv.amount?.toLocaleString()}</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                  <Tooltip title="Download PDF"><IconButton size="small" sx={{ color: 'var(--vm-text-muted)' }} onClick={() => downloadPdf(inv)}><Download size={15} /></IconButton></Tooltip>
                  {inv.status === 'draft' && <Tooltip title="Send"><IconButton size="small" sx={{ color: '#3b82f6' }} onClick={() => updateStatus(inv.id, 'sent')}><Send size={15} /></IconButton></Tooltip>}
                  {inv.status === 'sent' && <Tooltip title="Mark Paid"><IconButton size="small" sx={{ color: '#22c55e' }} onClick={() => updateStatus(inv.id, 'paid')}><CheckCircle size={15} /></IconButton></Tooltip>}
                  {inv.status === 'sent' && <Tooltip title="Mark Overdue"><IconButton size="small" sx={{ color: '#ef4444' }} onClick={() => updateStatus(inv.id, 'overdue')}><XCircle size={15} /></IconButton></Tooltip>}
                  {(inv.status === 'draft' || inv.status === 'sent') && <Tooltip title="Cancel"><IconButton size="small" sx={{ color: '#ef4444' }} onClick={() => updateStatus(inv.id, 'cancelled')}><X size={15} /></IconButton></Tooltip>}
                  <Tooltip title="Delete"><IconButton size="small" sx={{ color: '#ef444488' }} onClick={() => deleteInvoice(inv.id)}><Trash2 size={15} /></IconButton></Tooltip>
                </Box>
              </Box>
            </Card>
          ))}
        </Box>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title="New Invoice" icon={<FileText size={20} />}
        actions={<><GradientButton variant="ghost" size="sm" onClick={() => setForm(null)}>Cancel</GradientButton>
          <GradientButton variant="primary" size="sm" disabled={saving || !form?.customerName || !form?.invoiceNumber} onClick={save}>
            {saving ? <CircularProgress size={14} /> : 'Create Invoice'}
          </GradientButton></>}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <TextField size="small" label="Invoice #" value={form?.invoiceNumber || ''} onChange={e => setForm({ ...form, invoiceNumber: e.target.value })}
            sx={{ input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
          <TextField size="small" label="Customer Name" value={form?.customerName || ''} onChange={e => setForm({ ...form, customerName: e.target.value })}
            sx={{ input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
          <TextField size="small" label="Amount" type="number" value={form?.amount || ''} onChange={e => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
            sx={{ input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
          <FormControl size="small">
            <InputLabel sx={{ color: 'var(--vm-text-muted)' }}>Currency</InputLabel>
            <Select value={form?.currency || 'USD'} label="Currency" onChange={e => setForm({ ...form, currency: e.target.value })}
              sx={{ color: 'var(--vm-text-primary)', '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }}>
              {['USD', 'EUR', 'GBP', 'GHS', 'NGN', 'KES', 'ZAR'].map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField size="small" label="Due Date" type="date" value={form?.dueDate || ''} onChange={e => setForm({ ...form, dueDate: e.target.value })}
            InputLabelProps={{ shrink: true }} sx={{ input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
          <TextField size="small" label="PO Number" value={form?.poNumber || ''} onChange={e => setForm({ ...form, poNumber: e.target.value })}
            sx={{ input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
          <TextField size="small" label="Notes" multiline rows={2} value={form?.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })}
            sx={{ gridColumn: { xs: '1', sm: '1 / -1' }, textarea: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
        </Box>
      </Modal>
    </Box>
  );
}
