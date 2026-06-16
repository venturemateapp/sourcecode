import { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Card, Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Chip, Grid } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { GradientButton } from '../../components/shared/buttons';
import { useAuth } from '../../contexts/AuthContext';
import { useBusiness } from '../../contexts/BusinessContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { graphqlRequest } from '../../lib/api';
import { DomainChat } from '../../components/venturemate/DomainChat';
import { NoBusinessSelected } from '../../components/venturemate/NoBusinessSelected';
import {
  Landmark,
  Plus,
  CheckCircle,
  Clock,
  XCircle,
  Shield,
  X,
  FileText,
  Send,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import type { ViewType } from '../../types/venturemate';

interface BankAccount {
  id: string;
  userId: string;
  businessId: string;
  bankName: string;
  accountType: string;
  accountNumber: string;
  accountName: string;
  currency: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

interface Invoice {
  id: string;
  userId: string;
  businessId: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  dueDate: string;
  issueDate: string;
  paidDate: string | null;
  items: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface BankingProps {
  onViewChange?: (_view: ViewType) => void;
}

const BANK_ACCOUNTS_QUERY = `
  query BankAccounts($userId: ID!) {
    bankAccounts(userId: $userId) {
      id, userId, businessId, bankName, accountType, accountNumber, accountName, currency, status, createdAt, updatedAt
    }
  }
`;

const CREATE_BANK_ACCOUNT_MUTATION = `
  mutation CreateBankAccount($userId: ID!, $businessId: ID!, $bankName: String!, $accountType: String!, $accountNumber: String!, $accountName: String!, $currency: String) {
    createBankAccount(userId: $userId, businessId: $businessId, bankName: $bankName, accountType: $accountType, accountNumber: $accountNumber, accountName: $accountName, currency: $currency) {
      id, userId, businessId, bankName, accountType, accountNumber, accountName, currency, status, createdAt, updatedAt
    }
  }
`;

const APPROVE_BANK_ACCOUNT_MUTATION = `
  mutation ApproveBankAccount($id: ID!) {
    approveBankAccount(id: $id) { id, status }
  }
`;

const REJECT_BANK_ACCOUNT_MUTATION = `
  mutation RejectBankAccount($id: ID!) {
    rejectBankAccount(id: $id) { id, status }
  }
`;

const INVOICES_QUERY = `
  query Invoices($businessId: ID!) {
    invoices(businessId: $businessId) {
      id, userId, businessId, invoiceNumber, customerName, customerEmail, amount, currency, status, dueDate, issueDate, paidDate, items, notes, createdAt, updatedAt
    }
  }
`;

const CREATE_INVOICE_MUTATION = `
  mutation CreateInvoice($userId: ID!, $businessId: ID!, $invoiceNumber: String!, $customerName: String!, $customerEmail: String, $amount: Float!, $currency: String, $dueDate: String!, $issueDate: String, $items: String, $notes: String) {
    createInvoice(userId: $userId, businessId: $businessId, invoiceNumber: $invoiceNumber, customerName: $customerName, customerEmail: $customerEmail, amount: $amount, currency: $currency, dueDate: $dueDate, issueDate: $issueDate, items: $items, notes: $notes) {
      id, userId, businessId, invoiceNumber, customerName, customerEmail, amount, currency, status, dueDate, issueDate, paidDate, items, notes, createdAt, updatedAt
    }
  }
`;

const UPDATE_INVOICE_STATUS_MUTATION = `
  mutation UpdateInvoiceStatus($id: ID!, $status: String!) {
    updateInvoiceStatus(id: $id, status: $status) { id, status, paidDate }
  }
`;

const DELETE_INVOICE_MUTATION = `
  mutation DeleteInvoice($id: ID!, $userId: ID!) {
    deleteInvoice(id: $id, userId: $userId)
  }
`;

export function BankingPage({ onViewChange: _onViewChange }: BankingProps) {
  const { format, rates } = useCurrency();
  const { user } = useAuth();
  const { selectedBusiness } = useBusiness();
  const [activeTab, setActiveTab] = useState(0);

  // Bank accounts
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [accountForm, setAccountForm] = useState({ bankName: '', accountType: 'checking', accountNumber: '', accountName: '', currency: 'USD' });

  // Invoices
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
    customerName: '',
    customerEmail: '',
    amount: 0,
    currency: 'USD',
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    issueDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const isAdmin = user?.status === 'admin';
  const userId = user?.id || '';
  const businessId = selectedBusiness?.id || '';

  // --- Bank Accounts ---
  const fetchAccounts = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await graphqlRequest<{ bankAccounts: BankAccount[] }>(BANK_ACCOUNTS_QUERY, { userId });
      setAccounts(data.bankAccounts);
    } catch (err) {
      console.error('Failed to fetch bank accounts:', err);
    } finally {
      setAccountsLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const handleCreateAccount = async () => {
    if (!userId || !businessId) return;
    setCreatingAccount(true);
    try {
      const data = await graphqlRequest<{ createBankAccount: BankAccount }>(CREATE_BANK_ACCOUNT_MUTATION, { userId, businessId, ...accountForm });
      setAccounts(prev => [data.createBankAccount, ...prev]);
      setShowCreateAccountModal(false);
      setAccountForm({ bankName: '', accountType: 'checking', accountNumber: '', accountName: '', currency: 'USD' });
    } catch (err) {
      console.error('Failed to create bank account:', err);
    } finally {
      setCreatingAccount(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await graphqlRequest<{ approveBankAccount: { id: string; status: string } }>(APPROVE_BANK_ACCOUNT_MUTATION, { id });
      setAccounts(prev => prev.map(a => a.id === id ? { ...a, status: 'approved' } : a));
    } catch (err) {
      console.error('Failed to approve:', err);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await graphqlRequest<{ rejectBankAccount: { id: string; status: string } }>(REJECT_BANK_ACCOUNT_MUTATION, { id });
      setAccounts(prev => prev.map(a => a.id === id ? { ...a, status: 'rejected' } : a));
    } catch (err) {
      console.error('Failed to reject:', err);
    }
  };

  // --- Invoices ---
  const fetchInvoices = useCallback(async () => {
    if (!businessId) return;
    try {
      const data = await graphqlRequest<{ invoices: Invoice[] }>(INVOICES_QUERY, { businessId });
      setInvoices(data.invoices);
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
    } finally {
      setInvoicesLoading(false);
    }
  }, [businessId]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const handleCreateInvoice = async () => {
    if (!userId || !businessId) return;
    setCreatingInvoice(true);
    try {
      const data = await graphqlRequest<{ createInvoice: Invoice }>(CREATE_INVOICE_MUTATION, {
        userId,
        businessId,
        invoiceNumber: invoiceForm.invoiceNumber,
        customerName: invoiceForm.customerName,
        customerEmail: invoiceForm.customerEmail || null,
        amount: invoiceForm.amount,
        currency: invoiceForm.currency,
        dueDate: invoiceForm.dueDate,
        issueDate: invoiceForm.issueDate,
        items: '[]',
        notes: invoiceForm.notes || null,
      });
      setInvoices(prev => [data.createInvoice, ...prev]);
      setShowCreateInvoiceModal(false);
      setInvoiceForm({
        invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
        customerName: '', customerEmail: '', amount: 0, currency: 'USD',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        issueDate: new Date().toISOString().split('T')[0], notes: '',
      });
    } catch (err) {
      console.error('Failed to create invoice:', err);
    } finally {
      setCreatingInvoice(false);
    }
  };

  const handleUpdateInvoiceStatus = async (id: string, status: string) => {
    try {
      await graphqlRequest<{ updateInvoiceStatus: { id: string; status: string } }>(UPDATE_INVOICE_STATUS_MUTATION, { id, status });
      setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: status as Invoice['status'] } : inv));
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    try {
      await graphqlRequest<{ deleteInvoice: boolean }>(DELETE_INVOICE_MUTATION, { id, userId });
      setInvoices(prev => prev.filter(inv => inv.id !== id));
    } catch (err) {
      console.error('Failed to delete invoice:', err);
    }
  };

  // --- Helpers ---
  const statusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle size={16} color="#22c55e" />;
      case 'rejected': return <XCircle size={16} color="#ef4444" />;
      case 'paid': return <CheckCircle size={16} color="#22c55e" />;
      case 'sent': return <Send size={16} color="#3b82f6" />;
      case 'overdue': return <AlertTriangle size={16} color="#ef4444" />;
      case 'cancelled': return <XCircle size={16} color="#6b7280" />;
      default: return <Clock size={16} color="#f59e0b" />;
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'approved': case 'paid': return '#22c55e';
      case 'rejected': case 'overdue': return '#ef4444';
      case 'sent': return '#3b82f6';
      case 'cancelled': return '#6b7280';
      default: return '#f59e0b';
    }
  };

  const isOverdue = (inv: Invoice) => inv.status === 'sent' && new Date(inv.dueDate) < new Date();

  if (!selectedBusiness) {
    return <NoBusinessSelected message="Select a business to manage banking" />;
  }

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', mb: 4, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 2, sm: 0 } }}>
        <Box>
          <Typography sx={{ fontSize: { xs: 22, sm: 28 }, fontWeight: 700, color: 'var(--vm-text-primary)', mb: 1 }}>Banking</Typography>
          <Typography sx={{ fontSize: { xs: 13, sm: 15, md: 16 }, color: 'var(--vm-text-muted)' }}>
            Manage accounts and invoices for your business
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', width: { xs: '100%', sm: 'auto' } }}>
          <GradientButton variant="outline" size="md" onClick={() => setShowCreateInvoiceModal(true)} sx={{ flex: { xs: 1, sm: 'none' } }}>
            <FileText size={18} />
          </GradientButton>
          <GradientButton variant="primary" size="md" onClick={() => setShowCreateAccountModal(true)} sx={{ flex: { xs: 1, sm: 'none' } }}>
            <Plus size={18} />
          </GradientButton>
        </Box>
      </Box>

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="scrollable" scrollButtons="auto" sx={{
        mb: 3,
        '& .MuiTabs-indicator': { bgcolor: 'var(--vm-primary-500)' },
        '& .MuiTab-root': { color: 'var(--vm-text-muted)', textTransform: 'none', fontSize: { xs: '0.75rem', sm: '0.875rem' }, minWidth: { xs: 'auto', sm: 90 }, '&.Mui-selected': { color: 'var(--vm-primary-400)' } },
      }}>
        <Tab label="Bank Accounts" />
        <Tab label="Invoices" />
      </Tabs>

      {/* === Bank Accounts Tab === */}
      {activeTab === 0 && (
        accountsLoading ? (
          <Typography sx={{ color: 'var(--vm-text-muted)', textAlign: 'center', py: 6 }}>Loading bank accounts...</Typography>
        ) : accounts.length === 0 ? (
          <Card sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, p: 6, textAlign: 'center' }}>
            <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: 'var(--vm-bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3 }}>
              <Landmark size={32} color="var(--vm-primary-400)" />
            </Box>
            <Typography sx={{ fontSize: 18, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 1 }}>No Bank Accounts Yet</Typography>
            <Typography sx={{ fontSize: 14, color: 'var(--vm-text-muted)' }}>Connect a bank account to start managing your business finances</Typography>
          </Card>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: '24px' }}>
            {accounts.map((account) => (
              <Card key={account.id} sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, p: { xs: 2, sm: 3 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: 'var(--vm-bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Landmark size={24} color="var(--vm-primary-400)" />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'var(--vm-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{account.bankName}</Typography>
                      <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>{account.accountType.charAt(0).toUpperCase() + account.accountType.slice(1)}</Typography>
                    </Box>
                  </Box>
                  <Chip size="small" icon={statusIcon(account.status)} label={account.status}
                    sx={{ bgcolor: `${statusColor(account.status)}20`, color: statusColor(account.status), fontSize: 10, fontWeight: 600, textTransform: 'capitalize' }} />
                </Box>
                <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)', mb: 1 }}>{account.accountName} • {account.accountNumber}</Typography>
                {account.status === 'pending' && isAdmin && (
                  <Box sx={{ display: 'flex', gap: 1, mt: 2, pt: 2, borderTop: '1px solid var(--vm-border-subtle)' }}>
                    <GradientButton variant="primary" size="sm" onClick={() => handleApprove(account.id)}>
                      <CheckCircle size={14} style={{ marginRight: 4 }} /> Approve
                    </GradientButton>
                    <GradientButton variant="outline" size="sm" onClick={() => handleReject(account.id)} sx={{ borderColor: '#ef4444', color: '#ef4444', '&:hover': { bgcolor: 'rgba(239,68,68,0.1)' } }}>
                      <XCircle size={14} style={{ marginRight: 4 }} /> Reject
                    </GradientButton>
                  </Box>
                )}
              </Card>
            ))}
          </Box>
        )
      )}

      {/* === Invoices Tab === */}
      {activeTab === 1 && (
        invoicesLoading ? (
          <Typography sx={{ color: 'var(--vm-text-muted)', textAlign: 'center', py: 6 }}>Loading invoices...</Typography>
        ) : invoices.length === 0 ? (
          <Card sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, p: 6, textAlign: 'center' }}>
            <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: 'var(--vm-bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3 }}>
              <FileText size={32} color="var(--vm-primary-400)" />
            </Box>
            <Typography sx={{ fontSize: 18, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 1 }}>No Invoices Yet</Typography>
            <Typography sx={{ fontSize: 14, color: 'var(--vm-text-muted)', mb: 4 }}>Create your first invoice for your business</Typography>
            <GradientButton variant="primary" size="lg" onClick={() => setShowCreateInvoiceModal(true)}>
              <Plus size={18} style={{ marginRight: 8 }} /> Create Invoice
            </GradientButton>
          </Card>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: '24px' }}>
            {invoices.map((inv) => {
              const actualStatus = isOverdue(inv) ? 'overdue' : inv.status;
              return (
                <Card key={inv.id} sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, p: { xs: 2, sm: 3 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'var(--vm-text-primary)' }}>{inv.invoiceNumber}</Typography>
                    <Chip size="small" icon={statusIcon(actualStatus)} label={actualStatus}
                      sx={{ bgcolor: `${statusColor(actualStatus)}20`, color: statusColor(actualStatus), fontSize: 10, fontWeight: 600, textTransform: 'capitalize' }} />
                  </Box>
                  <Typography sx={{ fontSize: 16, fontWeight: 700, color: 'var(--vm-text-primary)', mb: 1 }}>
                    {format(inv.amount)}
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: 'var(--vm-text-secondary)', mb: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.customerName}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    {actualStatus === 'overdue' ? <AlertTriangle size={14} color="#ef4444" /> : actualStatus === 'paid' ? <CheckCircle size={14} color="#22c55e" /> : <Calendar size={14} color="var(--vm-text-muted)" />}
                    <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>Due: {new Date(inv.dueDate).toLocaleDateString()}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, pt: 2, borderTop: '1px solid var(--vm-border-subtle)' }}>
                    {inv.status === 'draft' && (
                      <GradientButton variant="primary" size="sm" onClick={() => handleUpdateInvoiceStatus(inv.id, 'sent')}>
                        <Send size={14} style={{ marginRight: 4 }} /> Send
                      </GradientButton>
                    )}
                    {inv.status === 'sent' && (
                      <GradientButton variant="primary" size="sm" onClick={() => handleUpdateInvoiceStatus(inv.id, 'paid')}>
                        <CheckCircle size={14} style={{ marginRight: 4 }} /> Mark Paid
                      </GradientButton>
                    )}
                    {(inv.status === 'draft' || inv.status === 'cancelled') && (
                      <GradientButton variant="outline" size="sm" onClick={() => handleDeleteInvoice(inv.id)} sx={{ borderColor: '#ef4444', color: '#ef4444', '&:hover': { bgcolor: 'rgba(239,68,68,0.1)' } }}>
                        <X size={14} style={{ marginRight: 4 }} /> Delete
                      </GradientButton>
                    )}
                  </Box>
                </Card>
              );
            })}
          </Box>
        )
      )}

      {/* === Dialog: Add Bank Account === */}
      <Dialog open={showCreateAccountModal} onClose={() => setShowCreateAccountModal(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3 } }}>
        <DialogTitle sx={{ p: 3, pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography sx={{ fontSize: 20, fontWeight: 700, color: 'var(--vm-text-primary)' }}>Add Bank Account</Typography>
            <GradientButton variant="outline" size="sm" onClick={() => setShowCreateAccountModal(false)}><X size={18} /></GradientButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 3, pt: 0 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            <TextField label="Bank Name" value={accountForm.bankName} onChange={(e) => setAccountForm({ ...accountForm, bankName: e.target.value })} fullWidth placeholder="e.g. Chase Bank, GCB Bank"
              sx={{ '& .MuiInputLabel-root': { color: 'var(--vm-text-secondary)' }, '& .MuiInputBase-input': { color: 'var(--vm-text-primary)' }, '& .MuiOutlinedInput-root': { bgcolor: 'var(--vm-bg-primary)', '& fieldset': { borderColor: 'var(--vm-border-subtle)' } } }} />
            <TextField select label="Account Type" value={accountForm.accountType} onChange={(e) => setAccountForm({ ...accountForm, accountType: e.target.value })} fullWidth
              sx={{ '& .MuiInputLabel-root': { color: 'var(--vm-text-secondary)' }, '& .MuiInputBase-input': { color: 'var(--vm-text-primary)' }, '& .MuiOutlinedInput-root': { bgcolor: 'var(--vm-bg-primary)', '& fieldset': { borderColor: 'var(--vm-border-subtle)' } } }}>
              <MenuItem value="checking">Checking</MenuItem>
              <MenuItem value="savings">Savings</MenuItem>
              <MenuItem value="credit">Credit</MenuItem>
            </TextField>
            <TextField label="Account Name" value={accountForm.accountName} onChange={(e) => setAccountForm({ ...accountForm, accountName: e.target.value })} fullWidth placeholder="e.g. Primary Operating Account"
              sx={{ '& .MuiInputLabel-root': { color: 'var(--vm-text-secondary)' }, '& .MuiInputBase-input': { color: 'var(--vm-text-primary)' }, '& .MuiOutlinedInput-root': { bgcolor: 'var(--vm-bg-primary)', '& fieldset': { borderColor: 'var(--vm-border-subtle)' } } }} />
            <TextField label="Account Number" value={accountForm.accountNumber} onChange={(e) => setAccountForm({ ...accountForm, accountNumber: e.target.value })} fullWidth placeholder="Last 4 digits or full number"
              sx={{ '& .MuiInputLabel-root': { color: 'var(--vm-text-secondary)' }, '& .MuiInputBase-input': { color: 'var(--vm-text-primary)' }, '& .MuiOutlinedInput-root': { bgcolor: 'var(--vm-bg-primary)', '& fieldset': { borderColor: 'var(--vm-border-subtle)' } } }} />
            <TextField select label="Currency" value={accountForm.currency} onChange={(e) => setAccountForm({ ...accountForm, currency: e.target.value })} fullWidth
              sx={{ '& .MuiInputLabel-root': { color: 'var(--vm-text-secondary)' }, '& .MuiInputBase-input': { color: 'var(--vm-text-primary)' }, '& .MuiOutlinedInput-root': { bgcolor: 'var(--vm-bg-primary)', '& fieldset': { borderColor: 'var(--vm-border-subtle)' } } }}>
              {rates.map(r => <MenuItem key={r.code} value={r.code}>{r.code} - {r.name} ({r.symbol})</MenuItem>)}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0, justifyContent: 'center' }}>
          <GradientButton variant="outline" size="md" onClick={() => setShowCreateAccountModal(false)}>Cancel</GradientButton>
          <GradientButton variant="primary" size="md" onClick={handleCreateAccount} disabled={creatingAccount || !accountForm.bankName || !accountForm.accountNumber || !accountForm.accountName}>
            <Shield size={16} style={{ marginRight: 8 }} />             {creatingAccount ? 'Submitting...' : 'Submit'}
          </GradientButton>
        </DialogActions>
      </Dialog>

      {/* === Dialog: Create Invoice === */}
      <Dialog open={showCreateInvoiceModal} onClose={() => setShowCreateInvoiceModal(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3 } }}>
        <DialogTitle sx={{ p: 3, pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography sx={{ fontSize: 20, fontWeight: 700, color: 'var(--vm-text-primary)' }}>Create Invoice</Typography>
            <GradientButton variant="outline" size="sm" onClick={() => setShowCreateInvoiceModal(false)}><X size={18} /></GradientButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 3, pt: 0 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            <TextField label="Customer Name" value={invoiceForm.customerName} onChange={(e) => setInvoiceForm({ ...invoiceForm, customerName: e.target.value })} fullWidth placeholder="Company or individual name"
              sx={{ '& .MuiInputLabel-root': { color: 'var(--vm-text-secondary)' }, '& .MuiInputBase-input': { color: 'var(--vm-text-primary)' }, '& .MuiOutlinedInput-root': { bgcolor: 'var(--vm-bg-primary)', '& fieldset': { borderColor: 'var(--vm-border-subtle)' } } }} />
            <TextField label="Customer Email" type="email" value={invoiceForm.customerEmail} onChange={(e) => setInvoiceForm({ ...invoiceForm, customerEmail: e.target.value })} fullWidth placeholder="customer@example.com"
              sx={{ '& .MuiInputLabel-root': { color: 'var(--vm-text-secondary)' }, '& .MuiInputBase-input': { color: 'var(--vm-text-primary)' }, '& .MuiOutlinedInput-root': { bgcolor: 'var(--vm-bg-primary)', '& fieldset': { borderColor: 'var(--vm-border-subtle)' } } }} />
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField label="Amount" type="number" value={invoiceForm.amount || ''} onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: parseFloat(e.target.value) || 0 })} fullWidth
                  sx={{ '& .MuiInputLabel-root': { color: 'var(--vm-text-secondary)' }, '& .MuiInputBase-input': { color: 'var(--vm-text-primary)' }, '& .MuiOutlinedInput-root': { bgcolor: 'var(--vm-bg-primary)', '& fieldset': { borderColor: 'var(--vm-border-subtle)' } } }} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField select label="Currency" value={invoiceForm.currency} onChange={(e) => setInvoiceForm({ ...invoiceForm, currency: e.target.value })} fullWidth
                  sx={{ '& .MuiInputLabel-root': { color: 'var(--vm-text-secondary)' }, '& .MuiInputBase-input': { color: 'var(--vm-text-primary)' }, '& .MuiOutlinedInput-root': { bgcolor: 'var(--vm-bg-primary)', '& fieldset': { borderColor: 'var(--vm-border-subtle)' } } }}>
                  {rates.map(r => <MenuItem key={r.code} value={r.code}>{r.code} - {r.name} ({r.symbol})</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <DatePicker label="Issue Date" value={invoiceForm.issueDate ? new Date(invoiceForm.issueDate) : null}
                  onChange={(date) => setInvoiceForm({ ...invoiceForm, issueDate: date ? date.toISOString().split('T')[0] : '' })}
                  slotProps={{ textField: { fullWidth: true, sx: { '& .MuiInputLabel-root': { color: 'var(--vm-text-secondary)' }, '& .MuiInputBase-input': { color: 'var(--vm-text-primary)' }, '& .MuiOutlinedInput-root': { bgcolor: 'var(--vm-bg-primary)', '& fieldset': { borderColor: 'var(--vm-border-subtle)' } } } } }} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <DatePicker label="Due Date" value={invoiceForm.dueDate ? new Date(invoiceForm.dueDate) : null}
                  onChange={(date) => setInvoiceForm({ ...invoiceForm, dueDate: date ? date.toISOString().split('T')[0] : '' })}
                  slotProps={{ textField: { fullWidth: true, sx: { '& .MuiInputLabel-root': { color: 'var(--vm-text-secondary)' }, '& .MuiInputBase-input': { color: 'var(--vm-text-primary)' }, '& .MuiOutlinedInput-root': { bgcolor: 'var(--vm-bg-primary)', '& fieldset': { borderColor: 'var(--vm-border-subtle)' } } } } }} />
              </Grid>
            </Grid>
            <TextField label="Notes (optional)" multiline rows={3} value={invoiceForm.notes} onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })} fullWidth
              sx={{ '& .MuiInputLabel-root': { color: 'var(--vm-text-secondary)' }, '& .MuiInputBase-input': { color: 'var(--vm-text-primary)' }, '& .MuiOutlinedInput-root': { bgcolor: 'var(--vm-bg-primary)', '& fieldset': { borderColor: 'var(--vm-border-subtle)' } } }} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0, justifyContent: 'center' }}>
          <GradientButton variant="outline" size="md" onClick={() => setShowCreateInvoiceModal(false)}>Cancel</GradientButton>
          <GradientButton variant="primary" size="md" onClick={handleCreateInvoice} disabled={creatingInvoice || !invoiceForm.customerName || !invoiceForm.invoiceNumber || invoiceForm.amount <= 0}>
            <FileText size={16} style={{ marginRight: 8 }} /> {creatingInvoice ? 'Creating...' : 'Create'}
          </GradientButton>
        </DialogActions>
      </Dialog>

      <DomainChat domain="banking" placeholder="Ask me about banking and finances..." />
    </Box>
  );
}
