import { CardSkeleton } from '../../components/shared/Skeleton';
import { useCallback, useEffect, useState } from 'react';
import { Box, Typography, Card, Chip, TextField, IconButton, Tooltip, CircularProgress, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { GradientButton } from '../../components/shared/buttons';
import { Modal } from '../../components/shared/Modal';
import { graphqlRequest } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useBusiness } from '../../contexts/BusinessContext';
import { FileText, Plus, Download, Trash2, Send, CheckCircle, X, Building2, Edit3, AlertCircle, Receipt } from 'lucide-react';
import type { Invoice, InvoiceItem } from '../../types/venturemate';
import { useToast } from '../../components/shared/toast';
import { useConfirm } from '../../components/shared/useConfirm';

const INVOICE_FIELDS = `id userId businessId invoiceNumber customerName customerEmail amount subtotal taxRate taxAmount discount shippingCost currency status dueDate issueDate paidDate items itemsList { description quantity unitPrice } notes customerAddress billingAddress poNumber paymentTerms pdfUrl pdfGeneratedAt createdAt updatedAt`;

const EMPTY_ITEM: InvoiceItem = { description: '', quantity: 1, unitPrice: 0 };

function calcTotal(items: InvoiceItem[]): number {
  return items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
}

function parseItems(raw: string): InvoiceItem[] {
  try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; }
}

export function InvoicesPage() {
  const { user } = useAuth();
  const { selectedBusiness } = useBusiness();
  const toast = useToast();
  const { confirmAction, dialog } = useConfirm();
  const bizId = selectedBusiness?.id;

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Partial<Invoice> | null>(null);
  const [lineItems, setLineItems] = useState<InvoiceItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const filteredInvoices = filterStatus === 'all' ? invoices : invoices.filter(inv => {
    const effStatus = inv.status === 'overdue' || (inv.status === 'sent' && inv.dueDate && new Date(inv.dueDate) < new Date()) ? 'overdue' : inv.status;
    return effStatus === filterStatus;
  });

  const q = useCallback(async <T,>(query: string, vars?: Record<string, unknown>) => graphqlRequest<T>(query, vars), []);

  const load = useCallback(async () => {
    if (!bizId) return;
    setLoading(true);
    try {
      const vars: Record<string, unknown> = { b: bizId };
      if (startDate) vars.s = startDate;
      if (endDate) vars.e = endDate;
      const d = await q<{ invoices: Invoice[] }>(`query Q($b:ID!,$s:String,$e:String){invoices(businessId:$b startDate:$s endDate:$e){${INVOICE_FIELDS}}}`, vars);
      setInvoices(d.invoices);
    } catch (err) {
      console.error('Failed to load invoices:', err);
    }
    setLoading(false);
  }, [bizId, q, startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setLineItems([{ ...EMPTY_ITEM }]);
    setForm({
      invoiceNumber: `INV-${Date.now().toString(36).toUpperCase()}`,
      customerName: '',
      customerEmail: '',
      amount: 0,
      subtotal: 0,
      taxRate: 0,
      taxAmount: 0,
      discount: 0,
      shippingCost: 0,
      currency: 'USD',
      dueDate: new Date().toISOString().split('T')[0],
      issueDate: new Date().toISOString().split('T')[0],
      paymentTerms: 'net30',
      notes: '',
      customerAddress: '',
      billingAddress: '',
      poNumber: '',
      items: '[]',
    });
  };

  const openEdit = (inv: Invoice) => {
    const items = parseItems(inv.items);
    setLineItems(items.length > 0 ? items : [{ ...EMPTY_ITEM }]);
    setForm({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.customerName,
      customerEmail: inv.customerEmail,
      amount: inv.amount,
      subtotal: inv.subtotal,
      taxRate: inv.taxRate,
      taxAmount: inv.taxAmount,
      discount: inv.discount,
      shippingCost: inv.shippingCost,
      currency: inv.currency,
      dueDate: inv.dueDate?.split('T')[0] || '',
      issueDate: inv.issueDate?.split('T')[0] || '',
      paymentTerms: inv.paymentTerms,
      notes: inv.notes,
      customerAddress: inv.customerAddress,
      billingAddress: inv.billingAddress,
      poNumber: inv.poNumber,
      items: inv.items,
    });
  };

  const updateLineItem = (idx: number, field: keyof InvoiceItem, value: string | number) => {
    const next = [...lineItems];
    next[idx] = { ...next[idx], [field]: value };
    setLineItems(next);
    setForm(f => ({ ...f, subtotal: calcTotal(next) }));
  };

  const addLineItem = () => {
    const next = [...lineItems, { ...EMPTY_ITEM }];
    setLineItems(next);
    setForm(f => ({ ...f, subtotal: calcTotal(next) }));
  };

  const removeLineItem = (idx: number) => {
    if (lineItems.length <= 1) return;
    const next = lineItems.filter((_, i) => i !== idx);
    setLineItems(next);
    setForm(f => ({ ...f, subtotal: calcTotal(next) }));
  };

  const save = async () => {
    if (!bizId || !user || !form?.customerName || !form?.invoiceNumber) return;
    setSaving(true);
    try {
      const itemsJson = JSON.stringify(lineItems.filter(i => i.description.trim()));
      const total = calcTotal(lineItems);
      const vars = {
        u: user.id, b: bizId, n: form.invoiceNumber, c: form.customerName,
        e: form.customerEmail || '',
        a: total, d: form.dueDate || new Date().toISOString().split('T')[0],
        idate: form.issueDate || new Date().toISOString().split('T')[0],
        s: calcTotal(lineItems), t: form.taxRate || 0, x: form.taxAmount || 0,
        di: form.discount || 0, sc: form.shippingCost || 0, cu: form.currency || 'USD', i: itemsJson,
        o: form.notes || '', ca: form.customerAddress || '',
        ba: form.billingAddress || '', po: form.poNumber || '',
        pt: form.paymentTerms || 'net30',
        id: form.id || '',
      };
      if (form.id) {
        await q(`mutation M($id:ID!,$u:ID!,$b:ID!,$n:String!,$c:String!,$e:String,$a:Float!,$d:String!,$idate:String,$s:Float,$t:Float,$x:Float,$di:Float,$sc:Float,$cu:String,$i:String,$o:String,$ca:String,$ba:String,$po:String,$pt:String){
          updateInvoice(id:$id userId:$u businessId:$b invoiceNumber:$n customerName:$c customerEmail:$e amount:$a dueDate:$d issueDate:$idate subtotal:$s taxRate:$t taxAmount:$x discount:$di shippingCost:$sc currency:$cu items:$i notes:$o customerAddress:$ca billingAddress:$ba poNumber:$po paymentTerms:$pt){id}}`, vars);
      } else {
        await q(`mutation M($u:ID!,$b:ID!,$n:String!,$c:String!,$e:String,$a:Float!,$d:String!,$idate:String,$s:Float,$t:Float,$x:Float,$di:Float,$sc:Float,$cu:String,$i:String,$o:String,$ca:String,$ba:String,$po:String,$pt:String){
          createInvoice(userId:$u businessId:$b invoiceNumber:$n customerName:$c customerEmail:$e amount:$a dueDate:$d issueDate:$idate subtotal:$s taxRate:$t taxAmount:$x discount:$di shippingCost:$sc currency:$cu items:$i notes:$o customerAddress:$ca billingAddress:$ba poNumber:$po paymentTerms:$pt){id}}`, vars);
      }
      setForm(null);
      await load();
      toast.success('Invoice saved', { description: 'Invoice has been saved.' });
    } catch (err) {
      console.error('Failed to save invoice:', err);
      toast.error('Failed to save invoice', { description: 'Please try again.' });
    }
    setSaving(false);
  };

  const sendInvoice = async (id: string) => {
    if (!bizId) return;
    try {
      await q('mutation M($i:ID!,$b:ID!){sendInvoice(id:$i businessId:$b){id status}}', { i: id, b: bizId });
      await load();
      toast.success('Invoice sent!', { description: `Invoice has been sent to the customer.` });
    } catch (err) {
      console.error('Failed to send invoice:', err);
      toast.error('Failed to send invoice', { description: 'Please try again.' });
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await q('mutation M($i:ID!,$s:String!){updateInvoiceStatus(id:$i status:$s){id status}}', { i: id, s: status });
      await load();
      toast.success('Status updated', { description: `Invoice status changed to ${status}.` });
    } catch (err) {
      console.error('Failed to update invoice status:', err);
      toast.error('Failed to update status', { description: 'Please try again.' });
    }
  };

  const deleteInvoice = async (id: string) => {
    if (!user) return;
    confirmAction({ title: 'Delete Invoice', message: 'Are you sure you want to delete this invoice? This cannot be undone.' }, async () => {
      try {
        await q('mutation M($i:ID!,$u:ID!){deleteInvoice(id:$i userId:$u)}', { i: id, u: user.id });
        await load();
        toast.success('Invoice deleted', { description: 'Invoice has been removed.' });
      } catch (err) {
        console.error('Failed to delete invoice:', err);
        toast.error('Failed to delete invoice', { description: 'Please try again.' });
      }
    });
  };

  const downloadPdf = async (inv: Invoice) => {
    const token = (await import('../../lib/auth')).getToken();
    if (inv.pdfUrl) {
      window.open(`/api/pdf/download?type=invoice&id=${inv.id}&token=${token}`, '_blank');
      return;
    }
    if (!bizId) return;
    try {
      await q<{ generateInvoicePdf: string }>('mutation M($i:ID!,$b:ID!){generateInvoicePdf(id:$i businessId:$b)}', { i: inv.id, b: bizId });
      window.open(`/api/pdf/download?type=invoice&id=${inv.id}&token=${token}`, '_blank');
      toast.success('PDF generated', { description: 'Invoice PDF has been created.' });
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      toast.error('Failed to generate PDF', { description: 'Please try again.' });
    }
  };

  const statusColor: Record<string, string> = { draft: '#94a3b8', sent: '#3b82f6', paid: '#22c55e', overdue: '#ef4444', cancelled: '#6b7280' };
  const effectiveStatus = (inv: Invoice) => {
    if (inv.status === 'overdue' || (inv.status === 'sent' && inv.dueDate && new Date(inv.dueDate) < new Date())) return 'overdue';
    return inv.status;
  };

  if (!bizId) return <Box sx={{ p: 4, textAlign: 'center', color: 'var(--vm-text-muted)' }}><Building2 size={40} /><Typography sx={{ mt: 1 }}>Select a business</Typography></Box>;

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', mb: 3, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1.5, sm: 0 } }}>
        <Box>
          <Typography sx={{ fontSize: { xs: 20, sm: 24, md: 28 }, fontWeight: 800, color: 'var(--vm-text-primary)' }}>Income</Typography>
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
            New Invoice
          </GradientButton>
        </Box>
      </Box>

      {/* Stats cards */}
      {(() => {
        const now = new Date();
        const totalCount = invoices.length;
        const paidCount = invoices.filter(i => i.status === 'paid').length;
        const overdueCount = invoices.filter(i => i.status === 'overdue' || (i.status === 'sent' && i.dueDate && new Date(i.dueDate) < now)).length;

        // Group amounts by currency
        const byCurrency: Record<string, { income: number; paid: number; overdue: number }> = {};
        invoices.forEach(inv => {
          const c = inv.currency || 'USD';
          if (!byCurrency[c]) byCurrency[c] = { income: 0, paid: 0, overdue: 0 };
          const isOverdue = inv.status === 'overdue' || (inv.status === 'sent' && inv.dueDate && new Date(inv.dueDate) < now);
          if (inv.status === 'paid') {
            byCurrency[c].income += inv.amount || 0;
            byCurrency[c].paid += inv.amount || 0;
          }
          if (isOverdue) {
            byCurrency[c].overdue += inv.amount || 0;
          }
        });

        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
            {/* Row 1: Count cards — clickable to filter */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(3,1fr)', sm: 'repeat(3,1fr)' }, gap: { xs: 1.5, sm: 2 } }}>
              <Card onClick={() => setFilterStatus(filterStatus === 'all' ? 'all' : 'all')} sx={{ p: 2, bgcolor: 'var(--vm-bg-secondary)', border: filterStatus === 'all' ? '2px solid #10b981' : '1px solid var(--vm-border-subtle)', borderRadius: 2.5, cursor: 'pointer', transition: 'all .15s', '&:hover': { borderColor: '#10b981' } }}>
                <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: 'rgba(16,185,129,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 0.75 }}>
                  <Receipt size={16} color="#10b981" />
                </Box>
                <Typography sx={{ fontSize: 20, fontWeight: 800, color: 'var(--vm-text-primary)' }}>{totalCount}</Typography>
                <Typography sx={{ fontSize: 11, color: filterStatus === 'all' ? '#10b981' : 'var(--vm-text-muted)', fontWeight: filterStatus === 'all' ? 700 : 400 }}>All Invoices</Typography>
              </Card>
              <Card onClick={() => setFilterStatus(filterStatus === 'paid' ? 'all' : 'paid')} sx={{ p: 2, bgcolor: 'var(--vm-bg-secondary)', border: filterStatus === 'paid' ? '2px solid #22c55e' : '1px solid var(--vm-border-subtle)', borderRadius: 2.5, cursor: 'pointer', transition: 'all .15s', '&:hover': { borderColor: '#22c55e' } }}>
                <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: 'rgba(34,197,94,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 0.75 }}>
                  <CheckCircle size={16} color="#22c55e" />
                </Box>
                <Typography sx={{ fontSize: 20, fontWeight: 800, color: 'var(--vm-text-primary)' }}>{paidCount}</Typography>
                <Typography sx={{ fontSize: 11, color: filterStatus === 'paid' ? '#22c55e' : 'var(--vm-text-muted)', fontWeight: filterStatus === 'paid' ? 700 : 400 }}>Paid</Typography>
              </Card>
              <Card onClick={() => setFilterStatus(filterStatus === 'overdue' ? 'all' : 'overdue')} sx={{ p: 2, bgcolor: 'var(--vm-bg-secondary)', border: filterStatus === 'overdue' ? '2px solid #ef4444' : '1px solid var(--vm-border-subtle)', borderRadius: 2.5, cursor: 'pointer', transition: 'all .15s', '&:hover': { borderColor: '#ef4444' } }}>
                <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: 'rgba(239,68,68,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 0.75 }}>
                  <AlertCircle size={16} color="#ef4444" />
                </Box>
                <Typography sx={{ fontSize: 20, fontWeight: 800, color: 'var(--vm-text-primary)' }}>{overdueCount}</Typography>
                <Typography sx={{ fontSize: 11, color: filterStatus === 'overdue' ? '#ef4444' : 'var(--vm-text-muted)', fontWeight: filterStatus === 'overdue' ? 700 : 400 }}>Overdue</Typography>
              </Card>
            </Box>

            {/* Row 2: Amount by currency */}
            {Object.keys(byCurrency).length > 0 && (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: `repeat(${Math.min(Object.keys(byCurrency).length, 3)}, 1fr)` }, gap: { xs: 1.5, sm: 2 } }}>
                {Object.entries(byCurrency).map(([currency, amounts]) => (
                  <Card key={currency} sx={{ p: 2, bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 2.5 }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'var(--vm-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, mb: 1 }}>{currency}</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>Income</Typography>
                        <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#22c55e' }}>{amounts.income.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>Overdue</Typography>
                        <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#ef4444' }}>{amounts.overdue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                      </Box>
                    </Box>
                  </Card>
                ))}
              </Box>
            )}
          </Box>
        );
      })()}

      {/* Invoice list */}
      {loading ? <CardSkeleton count={4} type='card' /> : filteredInvoices.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6, color: 'var(--vm-text-muted)' }}><FileText size={36} /><Typography sx={{ mt: 1, fontSize: 14 }}>{filterStatus === 'all' ? 'No invoices yet' : `No ${filterStatus} invoices`}</Typography></Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {filteredInvoices.map(inv => (
            <Card key={inv.id} sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 2.5, p: { xs: 1.5, sm: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                <Box sx={{ width: 40, height: 40, borderRadius: 1.5, bgcolor: `${statusColor[inv.status] || '#94a3b8'}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={18} color={statusColor[inv.status] || '#94a3b8'} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 200 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'var(--vm-text-primary)', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{inv.invoiceNumber}</Typography>
                    <Chip label={effectiveStatus(inv).replace('_', ' ')} size="small" sx={{ bgcolor: `${statusColor[effectiveStatus(inv)] || '#94a3b8'}18`, color: statusColor[effectiveStatus(inv)] || '#94a3b8', fontSize: 9, fontWeight: 700, height: 20 }} />
                    {inv.pdfUrl && <Chip label="PDF" size="small" sx={{ bgcolor: 'rgba(16,185,129,.12)', color: '#10b981', fontSize: 9, height: 20 }} />}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{inv.customerName} · {inv.currency} {inv.amount?.toLocaleString()}</Typography>
                    {inv.itemsList && inv.itemsList.length > 0 && (
                      <Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)' }}>({inv.itemsList.length} item{inv.itemsList.length !== 1 ? 's' : ''})</Typography>
                    )}
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0, alignItems: 'center' }}>
                  <FormControl size="small" sx={{ minWidth: 90 }}>
                    <Select value={inv.status} onChange={e => updateStatus(inv.id, e.target.value)}
                      sx={{ color: statusColor[effectiveStatus(inv)] || 'var(--vm-text-muted)', fontSize: 11, fontWeight: 700, height: 28, '& fieldset': { borderColor: `${statusColor[effectiveStatus(inv)] || '#94a3b8'}30` }, '& .MuiSelect-select': { py: 0.5 }, textTransform: 'capitalize' }}>
                      {['draft', 'sent', 'paid', 'overdue', 'cancelled'].map(s => (
                        <MenuItem key={s} value={s} sx={{ fontSize: 12, textTransform: 'capitalize' }}>{s}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  {inv.status === 'draft' && <Tooltip title="Edit"><IconButton size="small" sx={{ color: 'var(--vm-text-muted)' }} onClick={() => openEdit(inv)}><Edit3 size={15} /></IconButton></Tooltip>}
                  <Tooltip title="Download PDF"><IconButton size="small" sx={{ color: 'var(--vm-text-muted)' }} onClick={() => downloadPdf(inv)}><Download size={15} /></IconButton></Tooltip>
                  {inv.status === 'draft' && <Tooltip title="Send"><IconButton size="small" sx={{ color: '#3b82f6' }} onClick={() => sendInvoice(inv.id)}><Send size={15} /></IconButton></Tooltip>}
                  <Tooltip title="Delete"><IconButton size="small" sx={{ color: '#ef444488' }} onClick={() => deleteInvoice(inv.id)}><Trash2 size={15} /></IconButton></Tooltip>
                </Box>
              </Box>
            </Card>
          ))}
        </Box>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Edit Invoice' : 'New Invoice'} icon={<FileText size={20} />}
        actions={<><GradientButton variant="ghost" size="sm" onClick={() => setForm(null)}>Cancel</GradientButton>
          <GradientButton variant="primary" size="sm" disabled={saving || !form?.customerName || !form?.invoiceNumber} onClick={save}>
            {saving ? <CircularProgress size={14} /> : form?.id ? 'Update Invoice' : 'Create Invoice'}
          </GradientButton></>}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <TextField size="small" label="Invoice #" value={form?.invoiceNumber || ''} onChange={e => setForm({ ...form, invoiceNumber: e.target.value })}
              sx={{ input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
            <TextField size="small" label="Customer Name" value={form?.customerName || ''} onChange={e => setForm({ ...form, customerName: e.target.value })}
              sx={{ input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
            <TextField size="small" label="Customer Email" value={form?.customerEmail || ''} onChange={e => setForm({ ...form, customerEmail: e.target.value })}
              sx={{ input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
            <FormControl size="small">
              <InputLabel sx={{ color: 'var(--vm-text-muted)' }}>Currency</InputLabel>
              <Select value={form?.currency || 'USD'} label="Currency" onChange={e => setForm({ ...form, currency: e.target.value })}
                sx={{ color: 'var(--vm-text-primary)', '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }}>
                {['USD', 'EUR', 'GBP', 'GHS', 'NGN', 'KES', 'ZAR'].map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
            <DatePicker label="Issue Date" format="dd/MM/yyyy" value={form?.issueDate ? new Date(form.issueDate) : null}
              onChange={(date) => setForm({ ...form, issueDate: date ? date.toISOString().split('T')[0] : '' })}
              slotProps={{ textField: { size: 'small', sx: { input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } } } }} />
            <DatePicker label="Due Date" format="dd/MM/yyyy" value={form?.dueDate ? new Date(form.dueDate) : null}
              onChange={(date) => setForm({ ...form, dueDate: date ? date.toISOString().split('T')[0] : '' })}
              slotProps={{ textField: { size: 'small', sx: { input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } } } }} />
            <TextField size="small" label="PO Number" value={form?.poNumber || ''} onChange={e => setForm({ ...form, poNumber: e.target.value })}
              sx={{ input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
            <TextField size="small" label="Payment Terms" value={form?.paymentTerms || 'net30'} onChange={e => setForm({ ...form, paymentTerms: e.target.value })}
              sx={{ input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, gridColumn: { xs: '1', sm: '1 / -1' } }}>
              <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>Subtotal: <strong>{form?.currency || 'USD'} {calcTotal(lineItems).toLocaleString()}</strong></Typography>
            </Box>
            <TextField size="small" label="Tax Rate (%)" type="number" value={form?.taxRate || ''} onChange={e => {
                const rate = parseFloat(e.target.value) || 0;
                const subtotal = calcTotal(lineItems);
                setForm(f => ({ ...f, taxRate: rate, taxAmount: subtotal * rate / 100 }));
              }}
              sx={{ input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
            <TextField size="small" label="Discount (Amount)" type="number" value={form?.discount || ''} onChange={e => setForm({ ...form, discount: parseFloat(e.target.value) || 0 })}
              sx={{ input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
            <TextField size="small" label="Shipping Cost" type="number" value={form?.shippingCost || ''} onChange={e => setForm({ ...form, shippingCost: parseFloat(e.target.value) || 0 })}
              sx={{ input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
          </Box>

          <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'var(--vm-text-primary)', mt: 1 }}>Line Items</Typography>
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
              Total: {form?.currency || 'USD'} {calcTotal(lineItems).toLocaleString()}
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
