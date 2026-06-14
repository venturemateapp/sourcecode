import { useState } from 'react';
import { Box, Typography, Card, Tabs, Tab, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Grid, MenuItem, Stepper, Step, StepLabel, Avatar, Radio, FormControlLabel, RadioGroup } from '@mui/material';
import { GradientButton } from '../../components/shared/buttons';
import { useCurrency } from '../../contexts/CurrencyContext';
import { DomainChat } from '../../components/venturemate/DomainChat';
import {
  Landmark,
  TrendingUp,
  TrendingDown,
  Receipt,
  Plus,
  CheckCircle,
  Calendar,
  AlertTriangle,
  X,
  Check,
  Download,
  Send,
  FileText,
  Upload,
  User,
  CreditCard,
  FileCheck,
  Shield,
} from 'lucide-react';
import type { ViewType } from '../../types/venturemate';

interface Invoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_email?: string;
  amount: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  due_date: string;
  issue_date?: string;
  paid_date?: string;
  items?: {
    description: string;
    quantity: number;
    unitPrice: number;
  }[];
  notes?: string;
}

interface BankAccount {
  id: string;
  bank_name: string;
  account_type: 'checking' | 'savings' | 'credit';
  account_number: string;
  account_name: string;
  balance: number;
  currency: string;
  country_code: string;
  is_primary: boolean;
  created_at: string;
}

interface PaymentTransaction {
  id: string;
  account_id: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  currency: string;
  description: string;
  category: string;
  status: 'pending' | 'completed' | 'failed';
  transaction_date: string;
  counterparty?: string;
}

interface BankingDashboard {
  total_balance: number;
  monthly_income: number;
  monthly_expenses: number;
  outstanding_invoices: number;
  pending_transactions: number;
}

const bankingStats: BankingDashboard = {
  total_balance: 487500,
  monthly_income: 125000,
  monthly_expenses: 89000,
  outstanding_invoices: 45000,
  pending_transactions: 3,
};

const bankAccounts: BankAccount[] = [
  {
    id: 'acc_001',
    bank_name: 'Chase Bank',
    account_type: 'checking',
    account_number: '****4567',
    account_name: 'Primary Operating Account',
    balance: 285000,
    currency: 'USD',
    country_code: 'US',
    is_primary: true,
    created_at: '2024-01-15T00:00:00Z',
  },
  {
    id: 'acc_002',
    bank_name: 'Mercury',
    account_type: 'checking',
    account_number: '****8901',
    account_name: 'Treasury Account',
    balance: 175000,
    currency: 'USD',
    country_code: 'US',
    is_primary: false,
    created_at: '2024-02-01T00:00:00Z',
  },
  {
    id: 'acc_003',
    bank_name: 'Brex',
    account_type: 'credit',
    account_number: '****2345',
    account_name: 'Corporate Card',
    balance: -27500,
    currency: 'USD',
    country_code: 'US',
    is_primary: false,
    created_at: '2024-01-20T00:00:00Z',
  },
  {
    id: 'acc_004',
    bank_name: 'Chase Bank',
    account_type: 'savings',
    account_number: '****6789',
    account_name: 'Emergency Fund',
    balance: 50000,
    currency: 'USD',
    country_code: 'US',
    is_primary: false,
    created_at: '2024-01-15T00:00:00Z',
  },
];

const transactions: PaymentTransaction[] = [
  {
    id: 'tx_001',
    account_id: 'acc_001',
    type: 'income',
    amount: 45000,
    currency: 'USD',
    description: 'Invoice #INV-2024-001 - GlobalTech Solutions',
    category: 'Sales',
    status: 'completed',
    transaction_date: '2024-04-01T10:00:00Z',
    counterparty: 'GlobalTech Solutions',
  },
  {
    id: 'tx_002',
    account_id: 'acc_001',
    type: 'expense',
    amount: 15000,
    currency: 'USD',
    description: 'AWS Cloud Services',
    category: 'Infrastructure',
    status: 'completed',
    transaction_date: '2024-04-02T14:30:00Z',
    counterparty: 'Amazon Web Services',
  },
  {
    id: 'tx_003',
    account_id: 'acc_001',
    type: 'expense',
    amount: 25000,
    currency: 'USD',
    description: 'Monthly Payroll',
    category: 'Salaries',
    status: 'completed',
    transaction_date: '2024-04-01T09:00:00Z',
    counterparty: 'Gusto',
  },
  {
    id: 'tx_004',
    account_id: 'acc_002',
    type: 'income',
    amount: 500000,
    currency: 'USD',
    description: 'Seed Funding - Venture Capital Partners',
    category: 'Investment',
    status: 'completed',
    transaction_date: '2024-03-15T16:00:00Z',
    counterparty: 'Venture Capital Partners',
  },
  {
    id: 'tx_005',
    account_id: 'acc_001',
    type: 'expense',
    amount: 8500,
    currency: 'USD',
    description: 'Office Rent - April 2024',
    category: 'Rent',
    status: 'pending',
    transaction_date: '2024-04-05T00:00:00Z',
    counterparty: 'WeWork',
  },
  {
    id: 'tx_006',
    account_id: 'acc_003',
    type: 'expense',
    amount: 3200,
    currency: 'USD',
    description: 'Software Subscriptions',
    category: 'Tools',
    status: 'completed',
    transaction_date: '2024-04-03T11:00:00Z',
    counterparty: 'Various',
  },
];

const invoices: Invoice[] = [
  {
    id: 'inv_001',
    invoice_number: 'INV-2024-001',
    customer_name: 'GlobalTech Solutions',
    customer_email: 'billing@globaltech.com',
    amount: 45000,
    currency: 'USD',
    status: 'paid',
    due_date: '2024-04-15',
    issue_date: '2024-04-01',
    paid_date: '2024-04-01',
    items: [
      { description: 'Enterprise License - Annual', quantity: 1, unitPrice: 40000 },
      { description: 'Implementation Services', quantity: 10, unitPrice: 500 },
    ],
  },
  {
    id: 'inv_002',
    invoice_number: 'INV-2024-002',
    customer_name: 'TechCorp Inc',
    customer_email: 'accounts@techcorp.com',
    amount: 12500,
    currency: 'USD',
    status: 'sent',
    due_date: '2024-04-30',
    issue_date: '2024-04-03',
    items: [
      { description: 'Professional Services - March', quantity: 25, unitPrice: 500 },
    ],
  },
  {
    id: 'inv_003',
    invoice_number: 'INV-2024-003',
    customer_name: 'StartupXYZ',
    customer_email: 'finance@startupxyz.io',
    amount: 8500,
    currency: 'USD',
    status: 'overdue',
    due_date: '2024-03-31',
    issue_date: '2024-03-01',
    items: [
      { description: 'Monthly Subscription - Pro Plan', quantity: 3, unitPrice: 2500 },
      { description: 'Additional API Calls', quantity: 1, unitPrice: 1000 },
    ],
  },
  {
    id: 'inv_004',
    invoice_number: 'INV-2024-004',
    customer_name: 'InnovateTech',
    customer_email: 'payments@innovatetech.co',
    amount: 24000,
    currency: 'USD',
    status: 'draft',
    due_date: '2024-04-20',
    issue_date: '2024-04-04',
    items: [
      { description: 'Partnership Setup Fee', quantity: 1, unitPrice: 15000 },
      { description: 'Integration Support', quantity: 15, unitPrice: 600 },
    ],
  },
];

interface BankingProps {
  onViewChange?: (_view: ViewType) => void;
}

const invoiceSteps = ['Invoice Details', 'Customer Info', 'Line Items', 'Review & Send'];
const connectSteps = ['Select Bank', 'Account Type', 'Personal Info', 'Documents', 'Review & Submit'];

// Available banks for connection
const availableBanks = [
  // Ghana Banks
  {
    id: 'ecobank_gh',
    name: 'Ecobank Ghana',
    description: 'The Pan-African Bank - Connect your Ecobank business accounts',
    supportedTypes: ['checking', 'savings', 'credit'],
    color: '#00529c',
  },
  {
    id: 'gcb',
    name: 'GCB Bank',
    description: 'Ghana Commercial Bank - Leading indigenous bank',
    supportedTypes: ['checking', 'savings', 'credit'],
    color: '#d4af37',
  },
  {
    id: 'absa_gh',
    name: 'ABSA Bank Ghana',
    description: 'Formerly Barclays - Full business banking services',
    supportedTypes: ['checking', 'savings', 'credit'],
    color: '#a6192e',
  },
  {
    id: 'standard_gh',
    name: 'Standard Chartered Ghana',
    description: 'International banking with strong Ghana presence',
    supportedTypes: ['checking', 'savings', 'credit'],
    color: '#00a3e0',
  },
  {
    id: 'fidelity_gh',
    name: 'Fidelity Bank Ghana',
    description: 'Fast growing Ghanaian bank with digital focus',
    supportedTypes: ['checking', 'savings', 'credit'],
    color: '#8dc63f',
  },
  {
    id: 'calbank',
    name: 'CalBank',
    description: 'Corporate and investment banking leader',
    supportedTypes: ['checking', 'savings', 'credit'],
    color: '#0066b3',
  },
  {
    id: 'zenith_gh',
    name: 'Zenith Bank Ghana',
    description: 'Nigerian-owned bank with strong Ghana operations',
    supportedTypes: ['checking', 'savings', 'credit'],
    color: '#e3000f',
  },
  {
    id: 'gtbank_gh',
    name: 'GTBank Ghana',
    description: 'Guaranty Trust Bank - Innovative digital banking',
    supportedTypes: ['checking', 'savings', 'credit'],
    color: '#e75c00',
  },
  {
    id: 'uba_gh',
    name: 'UBA Ghana',
    description: 'United Bank for Africa - Pan-African network',
    supportedTypes: ['checking', 'savings', 'credit'],
    color: '#d40511',
  },
  {
    id: 'adb',
    name: 'Agricultural Development Bank',
    description: 'ADB - Supporting agribusiness and SMEs',
    supportedTypes: ['checking', 'savings'],
    color: '#00703c',
  },
  {
    id: 'prudential',
    name: 'Prudential Bank',
    description: 'Ghanaian-owned bank focused on SME banking',
    supportedTypes: ['checking', 'savings'],
    color: '#1e4d8c',
  },
  {
    id: 'societe_gh',
    name: 'Société Générale Ghana',
    description: 'French international bank in Ghana',
    supportedTypes: ['checking', 'savings', 'credit'],
    color: '#e60028',
  },
  // International Banks
  {
    id: 'chase',
    name: 'Chase Bank',
    description: 'Connect your Chase checking, savings, or credit card accounts',
    supportedTypes: ['checking', 'savings', 'credit'],
    color: '#0b4ea2',
  },
  {
    id: 'mercury',
    name: 'Mercury',
    description: 'Modern banking for startups - Full API access',
    supportedTypes: ['checking', 'savings', 'treasury'],
    color: '#7839ee',
  },
  {
    id: 'wise',
    name: 'Wise Business',
    description: 'Multi-currency accounts for international businesses',
    supportedTypes: ['checking', 'savings'],
    color: '#00b9ff',
  },
];

export function BankingPage({ onViewChange: _onViewChange }: BankingProps) {
  const { format } = useCurrency();
  const [activeTab, setActiveTab] = useState(0);
  
  // Invoice states
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [activeInvoiceStep, setActiveInvoiceStep] = useState(0);
  const [invoiceSuccess, setInvoiceSuccess] = useState(false);
  const [myInvoices, setMyInvoices] = useState<Invoice[]>(invoices);
  const [newInvoice, setNewInvoice] = useState<Invoice | null>(null);
  
  // Bank connection states
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [activeConnectStep, setActiveConnectStep] = useState(0);
  const [selectedBank, setSelectedBank] = useState<string>('');
  const [selectedAccountType, setSelectedAccountType] = useState<string>('checking');
  const [connectSuccess, setConnectSuccess] = useState(false);
  const [bankForm, setBankForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    ssn: '',
    dateOfBirth: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    companyName: '',
    ein: '',
    accountNumber: '',
    routingNumber: '',
    signature: '',
  });
  const [uploadedDocs, setUploadedDocs] = useState<{
    idDoc?: string;
    bankStatement?: string;
    cardDoc?: string;
    signatureDoc?: string;
  }>({});

  const [invoiceForm, setInvoiceForm] = useState({
    invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    customerName: '',
    customerEmail: '',
    customerAddress: '',
    description: '',
    items: [{ description: '', quantity: 1, unitPrice: 0 }],
    notes: '',
    terms: 'Payment due within 30 days',
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return '#22c55e';
      case 'sent': return '#3b82f6';
      case 'overdue': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const totalBalance = bankAccounts.reduce((acc, acc2) => acc + acc2.balance, 0);

  const calculateSubtotal = () => {
    return invoiceForm.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * 0.1;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  // Invoice handlers
  const handleNextInvoiceStep = () => {
    if (activeInvoiceStep < invoiceSteps.length - 1) {
      setActiveInvoiceStep(activeInvoiceStep + 1);
    }
  };

  const handlePrevInvoiceStep = () => {
    if (activeInvoiceStep > 0) {
      setActiveInvoiceStep(activeInvoiceStep - 1);
    }
  };

  const handleAddItem = () => {
    setInvoiceForm(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, unitPrice: 0 }]
    }));
  };

  const handleRemoveItem = (index: number) => {
    setInvoiceForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleItemChange = (index: number, field: string, value: string | number) => {
    setInvoiceForm(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleSubmitInvoice = () => {
    const invoice: Invoice = {
      id: `inv_${Date.now()}`,
      invoice_number: invoiceForm.invoiceNumber,
      customer_name: invoiceForm.customerName,
      amount: calculateTotal(),
      currency: 'USD',
      status: 'sent',
      issue_date: invoiceForm.issueDate,
      due_date: invoiceForm.dueDate,
      items: invoiceForm.items,
      notes: invoiceForm.notes,
    };
    
    setNewInvoice(invoice);
    setMyInvoices([invoice, ...myInvoices]);
    setInvoiceSuccess(true);
  };

  const handleCloseInvoiceModal = () => {
    setShowCreateInvoiceModal(false);
    setActiveInvoiceStep(0);
    setInvoiceSuccess(false);
    setInvoiceForm({
      invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      customerName: '',
      customerEmail: '',
      customerAddress: '',
      description: '',
      items: [{ description: '', quantity: 1, unitPrice: 0 }],
      notes: '',
      terms: 'Payment due within 30 days',
    });
  };

  const isInvoiceStepValid = () => {
    switch (activeInvoiceStep) {
      case 0:
        return invoiceForm.invoiceNumber && invoiceForm.dueDate;
      case 1:
        return invoiceForm.customerName && invoiceForm.customerEmail;
      case 2:
        return invoiceForm.items.every(item => item.description && item.quantity > 0 && item.unitPrice > 0);
      default:
        return true;
    }
  };

  // Bank connection handlers
  const handleNextConnectStep = () => {
    if (activeConnectStep < connectSteps.length - 1) {
      setActiveConnectStep(activeConnectStep + 1);
    }
  };

  const handlePrevConnectStep = () => {
    if (activeConnectStep > 0) {
      setActiveConnectStep(activeConnectStep - 1);
    }
  };

  const handleCloseConnectModal = () => {
    setShowConnectModal(false);
    setActiveConnectStep(0);
    setConnectSuccess(false);
    setSelectedBank('');
    setSelectedAccountType('checking');
    setBankForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      ssn: '',
      dateOfBirth: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      companyName: '',
      ein: '',
      accountNumber: '',
      routingNumber: '',
      signature: '',
    });
    setUploadedDocs({});
  };

  const handleSubmitBankConnection = () => {
    // Simulate API call
    setTimeout(() => {
      setConnectSuccess(true);
    }, 1000);
  };

  const handleFileUpload = (docType: string) => {
    // Simulate file upload
    setUploadedDocs(prev => ({ ...prev, [docType]: 'uploaded.pdf' }));
  };

  const isConnectStepValid = () => {
    switch (activeConnectStep) {
      case 0:
        return selectedBank !== '';
      case 1:
        return selectedAccountType !== '';
      case 2:
        return bankForm.firstName && bankForm.lastName && bankForm.email && bankForm.phone && 
               bankForm.ssn && bankForm.dateOfBirth && bankForm.address && bankForm.city && 
               bankForm.state && bankForm.zipCode;
      case 3:
        return uploadedDocs.idDoc && uploadedDocs.signatureDoc;
      default:
        return true;
    }
  };

  const selectedBankInfo = availableBanks.find(b => b.id === selectedBank);

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', mb: 4, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 2, sm: 0 } }}>
        <Box>
          <Typography sx={{ fontSize: { xs: 22, sm: 28 }, fontWeight: 700, color: 'var(--vm-text-primary)', mb: 1 }}>
            Banking
          </Typography>
          <Typography sx={{ fontSize: { xs: 13, sm: 15, md: 16 }, color: 'var(--vm-text-muted)' }}>
            Manage accounts, transactions, and invoices
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', width: { xs: '100%', sm: 'auto' } }}>
          <GradientButton variant="outline" size="md" onClick={() => setShowCreateInvoiceModal(true)} sx={{ flex: { xs: 1, sm: 'none' } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FileText size={18} />
              <Box sx={{ display: { xs: 'none', sm: 'inline' } }}>Create Invoice</Box>
            </Box>
          </GradientButton>
          <GradientButton variant="primary" size="md" onClick={() => setShowConnectModal(true)} sx={{ flex: { xs: 1, sm: 'none' } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Plus size={18} />
              <Box sx={{ display: { xs: 'none', sm: 'inline' } }}>Connect Account</Box>
            </Box>
          </GradientButton>
        </Box>
      </Box>

      {/* Balance Card */}
      <Card
        sx={{
          bgcolor: 'var(--vm-bg-secondary)',
          border: '1px solid var(--vm-border-subtle)',
          borderRadius: 3,
          p: 4,
          mb: 4,
          background: 'linear-gradient(135deg, var(--vm-primary-900) 0%, var(--vm-bg-tertiary) 100%)',
        }}
      >
        <Typography sx={{ fontSize: 14, color: 'var(--vm-text-muted)', mb: 1 }}>
          Total Balance
        </Typography>
        <Typography sx={{ fontSize: 48, fontWeight: 700, color: 'var(--vm-text-primary)', mb: 3 }}>
          {format(totalBalance)}
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, gap: '24px' }}>
          {[
            { label: 'Monthly Income', value: format(bankingStats.monthly_income), icon: TrendingUp, color: '#22c55e' },
            { label: 'Monthly Expenses', value: format(bankingStats.monthly_expenses), icon: TrendingDown, color: '#ef4444' },
            { label: 'Outstanding', value: format(bankingStats.outstanding_invoices), icon: Receipt, color: '#f59e0b' },
                      { label: 'Pending', value: bankingStats.pending_transactions.toString(), icon: Calendar, color: '#3b82f6' },
          ].map((stat) => (
            <Box key={stat.label}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <stat.icon size={16} color={stat.color} />
                <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>
                  {stat.label}
                </Typography>
              </Box>
              <Typography sx={{ fontSize: { xs: 15, sm: 18 }, fontWeight: 600, color: 'var(--vm-text-primary)' }}>
                {stat.value}
              </Typography>
            </Box>
          ))}
        </Box>
      </Card>

      {/* Accounts */}
      <Typography sx={{ fontSize: 18, fontWeight: 700, color: 'var(--vm-text-primary)', mb: 3 }}>
        Accounts
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: '24px', mb: '32px' }}>
        {bankAccounts.map((account) => (
          <Card
            key={account.id}
            sx={{
              bgcolor: 'var(--vm-bg-secondary)',
              border: account.is_primary ? '2px solid var(--vm-primary-600)' : '1px solid var(--vm-border-subtle)',
              borderRadius: 3,
              p: { xs: 2, sm: 3 },
              width: '100%',
              maxWidth: '100%',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    bgcolor: 'var(--vm-bg-tertiary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Landmark size={24} color="var(--vm-primary-400)" />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'var(--vm-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {account.bank_name}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>
                    {account.account_type.charAt(0).toUpperCase() + account.account_type.slice(1)}
                  </Typography>
                </Box>
              </Box>
              {account.is_primary && (
                <Chip
                  size="small"
                  label="Primary"
                  sx={{
                    bgcolor: 'var(--vm-primary-900)',
                    color: 'var(--vm-primary-400)',
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                />
              )}
            </Box>
            <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)', mb: 1 }}>
              {account.account_number}
            </Typography>
            <Typography sx={{ fontSize: { xs: 20, sm: 24 }, fontWeight: 700, color: account.balance < 0 ? '#ef4444' : 'var(--vm-text-primary)' }}>
              ${account.balance.toLocaleString()}
            </Typography>
          </Card>
        ))}
      </Box>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          mb: 3,
          '& .MuiTabs-indicator': { bgcolor: 'var(--vm-primary-500)' },
          '& .MuiTab-root': {
            color: 'var(--vm-text-muted)',
            textTransform: 'none',
            fontSize: { xs: '0.75rem', sm: '0.875rem' },
            minWidth: { xs: 'auto', sm: 90 },
            '&.Mui-selected': { color: 'var(--vm-primary-400)' },
          },
        }}
      >
        <Tab label="Transactions" />
        <Tab label="Invoices" />
      </Tabs>

      {/* Transactions */}
      {activeTab === 0 && (
        <Box sx={{ overflowX: 'auto' }}>
          <Card
            sx={{
              bgcolor: 'var(--vm-bg-secondary)',
              border: '1px solid var(--vm-border-subtle)',
              borderRadius: 3,
              overflow: 'hidden',
              minWidth: { xs: 480, sm: 0 },
            }}
          >
            {transactions.map((tx, idx) => (
              <Box
                key={tx.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: { xs: 2, sm: 3 },
                  borderBottom: idx < transactions.length - 1 ? '1px solid var(--vm-border-subtle)' : 'none',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      bgcolor: tx.type === 'income' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {tx.type === 'income' ? (
                      <TrendingUp size={20} color="#22c55e" />
                    ) : (
                      <TrendingDown size={20} color="#ef4444" />
                    )}
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'var(--vm-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tx.description}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>
                      {new Date(tx.transaction_date).toLocaleDateString()}
                      <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}> • {tx.counterparty}</Box>
                    </Typography>
                  </Box>
                </Box>
                <Typography
                  sx={{
                    fontSize: { xs: 14, sm: 16 },
                    fontWeight: 600,
                    color: tx.type === 'income' ? '#22c55e' : '#ef4444',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString()}
                </Typography>
              </Box>
            ))}
          </Card>
        </Box>
      )}

      {/* Invoices */}
      {activeTab === 1 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: '24px' }}>
          {myInvoices.map((invoice) => (
            <Card
              key={invoice.id}
              sx={{
                bgcolor: 'var(--vm-bg-secondary)',
                border: '1px solid var(--vm-border-subtle)',
                borderRadius: 3,
                p: { xs: 2, sm: 3 },
                width: '100%',
                maxWidth: '100%',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'var(--vm-text-primary)' }}>
                  {invoice.invoice_number}
                </Typography>
                <Chip
                  size="small"
                  label={invoice.status}
                  sx={{
                    bgcolor: `${getStatusColor(invoice.status)}20`,
                    color: getStatusColor(invoice.status),
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: 'capitalize',
                  }}
                />
              </Box>
              <Typography sx={{ fontSize: 16, fontWeight: 700, color: 'var(--vm-text-primary)', mb: 1 }}>
                ${invoice.amount.toLocaleString()}
              </Typography>
              <Typography sx={{ fontSize: 13, color: 'var(--vm-text-secondary)', mb: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {invoice.customer_name}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {invoice.status === 'overdue' ? (
                  <AlertTriangle size={14} color="#ef4444" />
                ) : invoice.status === 'paid' ? (
                  <CheckCircle size={14} color="#22c55e" />
                ) : (
                  <Calendar size={14} color="var(--vm-text-muted)" />
                )}
                <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>
                  Due: {new Date(invoice.due_date).toLocaleDateString()}
                </Typography>
              </Box>
            </Card>
          ))}
        </Box>
      )}

      {/* Create Invoice Modal - Same as before */}
      <Dialog
        open={showCreateInvoiceModal}
        onClose={handleCloseInvoiceModal}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'var(--vm-bg-secondary)',
            border: '1px solid var(--vm-border-subtle)',
            borderRadius: 3,
            maxHeight: '90vh',
          }
        }}
      >
        {invoiceSuccess && newInvoice ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <Box sx={{ width: 80, height: 80, borderRadius: '50%', bgcolor: 'rgba(34, 197, 94, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3 }}>
              <Check size={40} color="#22c55e" />
            </Box>
            <Typography sx={{ fontSize: 24, fontWeight: 700, color: 'var(--vm-text-primary)', mb: 2 }}>
              Invoice Created!
            </Typography>
            <Typography sx={{ fontSize: 15, color: 'var(--vm-text-secondary)', mb: 1 }}>
              Invoice <strong>{newInvoice.invoice_number}</strong> has been created and sent to {newInvoice.customer_name}.
            </Typography>
            <Typography sx={{ fontSize: 14, color: 'var(--vm-text-muted)', mb: 4 }}>
              Amount: ${newInvoice.amount.toLocaleString()}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <GradientButton variant="outline" size="md" onClick={handleCloseInvoiceModal}>
                Close
              </GradientButton>
              <GradientButton variant="primary" size="md">
                <Download size={16} style={{ marginRight: 8 }} />
                Download PDF
              </GradientButton>
            </Box>
          </Box>
        ) : (
          <>
            <DialogTitle sx={{ p: 3, pb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: 20, fontWeight: 700, color: 'var(--vm-text-primary)' }}>
                  Create Invoice
                </Typography>
                <GradientButton variant="outline" size="sm" onClick={handleCloseInvoiceModal}>
                  <X size={18} />
                </GradientButton>
              </Box>
            </DialogTitle>
            <DialogContent sx={{ p: 3, pt: 0 }}>
              <Stepper activeStep={activeInvoiceStep} sx={{ mb: 4, mt: 2 }}>
                {invoiceSteps.map((label) => (
                  <Step key={label}>
                    <StepLabel sx={{ 
                      '& .MuiStepLabel-label': { color: 'var(--vm-text-secondary)', fontSize: 12 },
                      '& .MuiStepLabel-label.Mui-active': { color: 'var(--vm-primary-400)' },
                      '& .MuiStepLabel-label.Mui-completed': { color: 'var(--vm-text-secondary)' },
                    }}>
                      {label}
                    </StepLabel>
                  </Step>
                ))}
              </Stepper>

              {activeInvoiceStep === 0 && (
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField label="Invoice Number" value={invoiceForm.invoiceNumber} onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceNumber: e.target.value })} fullWidth
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'var(--vm-bg-primary)', color: 'var(--vm-text-primary)', '& fieldset': { borderColor: 'var(--vm-border-subtle)' } } }} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField label="Issue Date" type="date" value={invoiceForm.issueDate} onChange={(e) => setInvoiceForm({ ...invoiceForm, issueDate: e.target.value })} fullWidth InputLabelProps={{ shrink: true }}
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'var(--vm-bg-primary)', color: 'var(--vm-text-primary)', '& fieldset': { borderColor: 'var(--vm-border-subtle)' } } }} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField label="Due Date" type="date" value={invoiceForm.dueDate} onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })} fullWidth InputLabelProps={{ shrink: true }}
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'var(--vm-bg-primary)', color: 'var(--vm-text-primary)', '& fieldset': { borderColor: 'var(--vm-border-subtle)' } } }} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField select label="Payment Terms" value={invoiceForm.terms} onChange={(e) => setInvoiceForm({ ...invoiceForm, terms: e.target.value })} fullWidth
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'var(--vm-bg-primary)', color: 'var(--vm-text-primary)', '& fieldset': { borderColor: 'var(--vm-border-subtle)' } } }}>
                      <MenuItem value="Due on receipt">Due on receipt</MenuItem>
                      <MenuItem value="Net 15">Net 15</MenuItem>
                      <MenuItem value="Net 30">Net 30</MenuItem>
                      <MenuItem value="Net 60">Net 60</MenuItem>
                    </TextField>
                  </Grid>
                </Grid>
              )}

              {activeInvoiceStep === 1 && (
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12 }}>
                    <TextField label="Customer Name" placeholder="Company or individual name" value={invoiceForm.customerName} onChange={(e) => setInvoiceForm({ ...invoiceForm, customerName: e.target.value })} fullWidth
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'var(--vm-bg-primary)', color: 'var(--vm-text-primary)', '& fieldset': { borderColor: 'var(--vm-border-subtle)' } } }} />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField label="Customer Email" type="email" placeholder="customer@example.com" value={invoiceForm.customerEmail} onChange={(e) => setInvoiceForm({ ...invoiceForm, customerEmail: e.target.value })} fullWidth
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'var(--vm-bg-primary)', color: 'var(--vm-text-primary)', '& fieldset': { borderColor: 'var(--vm-border-subtle)' } } }} />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField label="Billing Address" multiline rows={3} placeholder="Full address" value={invoiceForm.customerAddress} onChange={(e) => setInvoiceForm({ ...invoiceForm, customerAddress: e.target.value })} fullWidth
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'var(--vm-bg-primary)', color: 'var(--vm-text-primary)', '& fieldset': { borderColor: 'var(--vm-border-subtle)' } } }} />
                  </Grid>
                </Grid>
              )}

              {activeInvoiceStep === 2 && (
                <Box>
                  {invoiceForm.items.map((item, index) => (
                    <Card key={index} sx={{ bgcolor: 'var(--vm-bg-primary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 2, p: 2, mb: 2 }}>
                      <Grid container spacing={2} alignItems="center">
                        <Grid size={{ xs: 12, md: 6 }}>
                          <TextField label="Description" placeholder="Item description" value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} fullWidth
                            sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'var(--vm-bg-secondary)', color: 'var(--vm-text-primary)', '& fieldset': { borderColor: 'var(--vm-border-subtle)' } } }} />
                        </Grid>
                        <Grid size={{ xs: 12, md: 2 }}>
                          <TextField label="Qty" type="number" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)} fullWidth
                            sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'var(--vm-bg-secondary)', color: 'var(--vm-text-primary)', '& fieldset': { borderColor: 'var(--vm-border-subtle)' } } }} />
                        </Grid>
                        <Grid size={{ xs: 12, md: 3 }}>
                          <TextField label="Unit Price" type="number" value={item.unitPrice} onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)} fullWidth
                            InputProps={{ startAdornment: <Typography sx={{ color: 'var(--vm-text-muted)', mr: 1 }}>$</Typography> }}
                            sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'var(--vm-bg-secondary)', color: 'var(--vm-text-primary)', '& fieldset': { borderColor: 'var(--vm-border-subtle)' } } }} />
                        </Grid>
                        <Grid size={{ xs: 12, md: 1 }}>
                          {invoiceForm.items.length > 1 && (
                            <GradientButton variant="outline" size="sm" onClick={() => handleRemoveItem(index)}>
                              <X size={16} />
                            </GradientButton>
                          )}
                        </Grid>
                      </Grid>
                      <Box sx={{ mt: 1, textAlign: 'right' }}>
                        <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)' }}>
                          Line Total: ${(item.quantity * item.unitPrice).toLocaleString()}
                        </Typography>
                      </Box>
                    </Card>
                  ))}
                  <GradientButton variant="outline" size="sm" onClick={handleAddItem} fullWidth>
                    <Plus size={16} style={{ marginRight: 8 }} />
                    Add Line Item
                  </GradientButton>
                </Box>
              )}

              {activeInvoiceStep === 3 && (
                <Card sx={{ bgcolor: 'var(--vm-bg-primary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 2, p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, pb: 2, borderBottom: '1px solid var(--vm-border-subtle)' }}>
                    <Box>
                      <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>Invoice Number</Typography>
                      <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'var(--vm-text-primary)' }}>{invoiceForm.invoiceNumber}</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>Due Date</Typography>
                      <Typography sx={{ fontSize: 14, color: 'var(--vm-text-primary)' }}>{new Date(invoiceForm.dueDate).toLocaleDateString()}</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ mb: 2, pb: 2, borderBottom: '1px solid var(--vm-border-subtle)' }}>
                    <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>Bill To</Typography>
                    <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'var(--vm-text-primary)' }}>{invoiceForm.customerName}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 2 }}>
                    <Typography sx={{ fontSize: 15, fontWeight: 600, color: 'var(--vm-text-primary)' }}>Total</Typography>
                    <Typography sx={{ fontSize: 18, fontWeight: 700, color: 'var(--vm-primary-400)' }}>${calculateTotal().toLocaleString()}</Typography>
                  </Box>
                </Card>
              )}

              <DialogActions sx={{ p: 0, pt: 3, mt: 3, borderTop: '1px solid var(--vm-border-subtle)', justifyContent: 'center' }}>
                <GradientButton variant="outline" size="md" onClick={activeInvoiceStep === 0 ? handleCloseInvoiceModal : handlePrevInvoiceStep}>
                  {activeInvoiceStep === 0 ? 'Cancel' : 'Back'}
                </GradientButton>
                {activeInvoiceStep === invoiceSteps.length - 1 ? (
                  <GradientButton variant="primary" size="md" onClick={handleSubmitInvoice}>
                    <Send size={16} style={{ marginRight: 8 }} />
                    Send Invoice
                  </GradientButton>
                ) : (
                  <GradientButton variant="primary" size="md" onClick={handleNextInvoiceStep} disabled={!isInvoiceStepValid()}>
                    Continue
                  </GradientButton>
                )}
              </DialogActions>
            </DialogContent>
          </>
        )}
      </Dialog>

      {/* Connect Bank Account Modal */}
      <Dialog
        open={showConnectModal}
        onClose={handleCloseConnectModal}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'var(--vm-bg-secondary)',
            border: '1px solid var(--vm-border-subtle)',
            borderRadius: 3,
            maxHeight: '90vh',
          }
        }}
      >
        {connectSuccess ? (
          // Success State
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <Box sx={{ width: 80, height: 80, borderRadius: '50%', bgcolor: 'rgba(34, 197, 94, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3 }}>
              <Check size={40} color="#22c55e" />
            </Box>
            <Typography sx={{ fontSize: 24, fontWeight: 700, color: 'var(--vm-text-primary)', mb: 2 }}>
              Account Connected!
            </Typography>
            <Typography sx={{ fontSize: 15, color: 'var(--vm-text-secondary)', mb: 1 }}>
              Your <strong>{selectedBankInfo?.name}</strong> account has been successfully connected.
            </Typography>
            <Typography sx={{ fontSize: 14, color: 'var(--vm-text-muted)', mb: 4 }}>
              You can now view transactions, manage payments, and track your finances.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <GradientButton variant="primary" size="md" onClick={handleCloseConnectModal}>
                Done
              </GradientButton>
            </Box>
          </Box>
        ) : (
          <>
            <DialogTitle sx={{ p: 3, pb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: 20, fontWeight: 700, color: 'var(--vm-text-primary)' }}>
                  Connect Bank Account
                </Typography>
                <GradientButton variant="outline" size="sm" onClick={handleCloseConnectModal}>
                  <X size={18} />
                </GradientButton>
              </Box>
            </DialogTitle>

            <DialogContent sx={{ p: 3, pt: 0, overflow: 'auto' }}>
              {/* Stepper */}
              <Stepper activeStep={activeConnectStep} sx={{ mb: 4, mt: 2 }}>
                {connectSteps.map((label) => (
                  <Step key={label}>
                    <StepLabel sx={{ 
                      '& .MuiStepLabel-label': { color: 'var(--vm-text-secondary)', fontSize: 12 },
                      '& .MuiStepLabel-label.Mui-active': { color: 'var(--vm-primary-400)' },
                      '& .MuiStepLabel-label.Mui-completed': { color: 'var(--vm-text-secondary)' },
                    }}>
                      {label}
                    </StepLabel>
                  </Step>
                ))}
              </Stepper>

              {/* Step 1: Select Bank */}
              {activeConnectStep === 0 && (
                <Box>
                  <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 2 }}>
                    Choose Your Bank
                  </Typography>
                  <Grid container spacing={2}>
                    {availableBanks.map((bank) => (
                      <Grid size={{ xs: 12, sm: 6 }} key={bank.id}>
                        <Card
                          onClick={() => setSelectedBank(bank.id)}
                          sx={{
                            bgcolor: selectedBank === bank.id ? 'var(--vm-primary-900)' : 'var(--vm-bg-primary)',
                            border: selectedBank === bank.id ? '2px solid var(--vm-primary-600)' : '1px solid var(--vm-border-subtle)',
                            borderRadius: 2,
                            p: 2,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            '&:hover': { borderColor: 'var(--vm-primary-500)' },
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ width: 48, height: 48, bgcolor: bank.color, color: '#fff', fontWeight: 700, fontSize: 18 }}>
                              {bank.name.substring(0, 2).toUpperCase()}
                            </Avatar>
                            <Box>
                              <Typography sx={{ fontSize: 15, fontWeight: 600, color: 'var(--vm-text-primary)' }}>
                                {bank.name}
                              </Typography>
                              <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>
                                {bank.description.substring(0, 50)}...
                              </Typography>
                            </Box>
                          </Box>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}

              {/* Step 2: Account Type */}
              {activeConnectStep === 1 && selectedBankInfo && (
                <Box>
                  <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 2 }}>
                    Select Account Type
                  </Typography>
                  <RadioGroup value={selectedAccountType} onChange={(e) => setSelectedAccountType(e.target.value)}>
                    <Grid container spacing={2}>
                      {[
                        { value: 'checking', label: 'Checking Account', icon: Landmark, desc: 'Primary business account for daily transactions' },
                        { value: 'savings', label: 'Savings Account', icon: TrendingUp, desc: 'Reserve funds and earn interest' },
                        { value: 'credit', label: 'Credit Card', icon: CreditCard, desc: 'Corporate card for business expenses' },
                      ].filter(type => selectedBankInfo.supportedTypes.includes(type.value)).map((type) => (
                        <Grid size={{ xs: 12 }} key={type.value}>
                          <Card
                            sx={{
                              bgcolor: selectedAccountType === type.value ? 'var(--vm-primary-900)' : 'var(--vm-bg-primary)',
                              border: selectedAccountType === type.value ? '2px solid var(--vm-primary-600)' : '1px solid var(--vm-border-subtle)',
                              borderRadius: 2,
                              p: 2,
                            }}
                          >
                            <FormControlLabel
                              value={type.value}
                              control={<Radio sx={{ color: 'var(--vm-text-muted)', '&.Mui-checked': { color: 'var(--vm-primary-400)' } }} />}
                              label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                  <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'var(--vm-bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <type.icon size={20} color="var(--vm-primary-400)" />
                                  </Box>
                                  <Box>
                                    <Typography sx={{ fontSize: 15, fontWeight: 600, color: 'var(--vm-text-primary)' }}>
                                      {type.label}
                                    </Typography>
                                    <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>
                                      {type.desc}
                                    </Typography>
                                  </Box>
                                </Box>
                              }
                              sx={{ width: '100%', m: 0 }}
                            />
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </RadioGroup>
                </Box>
              )}

              {/* Step 3: Personal Information */}
              {activeConnectStep === 2 && (
                <Box>
                  <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 2 }}>
                    Personal Information
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)', mb: 3 }}>
                    <Shield size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    Your information is encrypted and secure
                  </Typography>
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField label="First Name" value={bankForm.firstName} onChange={(e) => setBankForm({ ...bankForm, firstName: e.target.value })} fullWidth
                        sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'var(--vm-bg-primary)', color: 'var(--vm-text-primary)', '& fieldset': { borderColor: 'var(--vm-border-subtle)' } } }} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField label="Last Name" value={bankForm.lastName} onChange={(e) => setBankForm({ ...bankForm, lastName: e.target.value })} fullWidth
                        sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'var(--vm-bg-primary)', color: 'var(--vm-text-primary)', '& fieldset': { borderColor: 'var(--vm-border-subtle)' } } }} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField label="Email" type="email" value={bankForm.email} onChange={(e) => setBankForm({ ...bankForm, email: e.target.value })} fullWidth
                        sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'var(--vm-bg-primary)', color: 'var(--vm-text-primary)', '& fieldset': { borderColor: 'var(--vm-border-subtle)' } } }} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField label="Phone" value={bankForm.phone} onChange={(e) => setBankForm({ ...bankForm, phone: e.target.value })} fullWidth
                        sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'var(--vm-bg-primary)', color: 'var(--vm-text-primary)', '& fieldset': { borderColor: 'var(--vm-border-subtle)' } } }} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField label="SSN / Tax ID" value={bankForm.ssn} onChange={(e) => setBankForm({ ...bankForm, ssn: e.target.value })} fullWidth placeholder="XXX-XX-XXXX"
                        sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'var(--vm-bg-primary)', color: 'var(--vm-text-primary)', '& fieldset': { borderColor: 'var(--vm-border-subtle)' } } }} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField label="Date of Birth" type="date" value={bankForm.dateOfBirth} onChange={(e) => setBankForm({ ...bankForm, dateOfBirth: e.target.value })} fullWidth InputLabelProps={{ shrink: true }}
                        sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'var(--vm-bg-primary)', color: 'var(--vm-text-primary)', '& fieldset': { borderColor: 'var(--vm-border-subtle)' } } }} />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <TextField label="Street Address" value={bankForm.address} onChange={(e) => setBankForm({ ...bankForm, address: e.target.value })} fullWidth
                        sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'var(--vm-bg-primary)', color: 'var(--vm-text-primary)', '& fieldset': { borderColor: 'var(--vm-border-subtle)' } } }} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField label="City" value={bankForm.city} onChange={(e) => setBankForm({ ...bankForm, city: e.target.value })} fullWidth
                        sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'var(--vm-bg-primary)', color: 'var(--vm-text-primary)', '& fieldset': { borderColor: 'var(--vm-border-subtle)' } } }} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField label="State" value={bankForm.state} onChange={(e) => setBankForm({ ...bankForm, state: e.target.value })} fullWidth
                        sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'var(--vm-bg-primary)', color: 'var(--vm-text-primary)', '& fieldset': { borderColor: 'var(--vm-border-subtle)' } } }} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField label="ZIP Code" value={bankForm.zipCode} onChange={(e) => setBankForm({ ...bankForm, zipCode: e.target.value })} fullWidth
                        sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'var(--vm-bg-primary)', color: 'var(--vm-text-primary)', '& fieldset': { borderColor: 'var(--vm-border-subtle)' } } }} />
                    </Grid>
                  </Grid>
                </Box>
              )}

              {/* Step 4: Document Upload */}
              {activeConnectStep === 3 && (
                <Box>
                  <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 2 }}>
                    Upload Documents
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)', mb: 3 }}>
                    Please upload the required documents to verify your identity and account ownership
                  </Typography>

                  <Grid container spacing={3}>
                    {/* ID Document */}
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Card sx={{ bgcolor: 'var(--vm-bg-primary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 2, p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                          <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'var(--vm-bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <User size={20} color="var(--vm-primary-400)" />
                          </Box>
                          <Box>
                            <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'var(--vm-text-primary)' }}>
                              Government ID
                            </Typography>
                            <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>
                              Driver's License or Passport
                            </Typography>
                          </Box>
                        </Box>
                        <Box
                          onClick={() => handleFileUpload('idDoc')}
                          sx={{
                            border: '2px dashed var(--vm-border-subtle)',
                            borderRadius: 2,
                            p: 3,
                            textAlign: 'center',
                            cursor: 'pointer',
                            bgcolor: uploadedDocs.idDoc ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
                            '&:hover': { borderColor: 'var(--vm-primary-500)' },
                          }}
                        >
                          {uploadedDocs.idDoc ? (
                            <Box>
                              <Check size={24} color="#22c55e" style={{ margin: '0 auto 8px' }} />
                              <Typography sx={{ fontSize: 13, color: '#22c55e' }}>ID Uploaded</Typography>
                            </Box>
                          ) : (
                            <Box>
                              <Upload size={24} color="var(--vm-text-muted)" style={{ margin: '0 auto 8px' }} />
                              <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)' }}>Click to upload ID</Typography>
                            </Box>
                          )}
                        </Box>
                      </Card>
                    </Grid>

                    {/* Bank Statement */}
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Card sx={{ bgcolor: 'var(--vm-bg-primary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 2, p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                          <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'var(--vm-bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FileText size={20} color="var(--vm-primary-400)" />
                          </Box>
                          <Box>
                            <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'var(--vm-text-primary)' }}>
                              Bank Statement
                            </Typography>
                            <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>
                              Last 3 months (Optional)
                            </Typography>
                          </Box>
                        </Box>
                        <Box
                          onClick={() => handleFileUpload('bankStatement')}
                          sx={{
                            border: '2px dashed var(--vm-border-subtle)',
                            borderRadius: 2,
                            p: 3,
                            textAlign: 'center',
                            cursor: 'pointer',
                            bgcolor: uploadedDocs.bankStatement ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
                            '&:hover': { borderColor: 'var(--vm-primary-500)' },
                          }}
                        >
                          {uploadedDocs.bankStatement ? (
                            <Box>
                              <Check size={24} color="#22c55e" style={{ margin: '0 auto 8px' }} />
                              <Typography sx={{ fontSize: 13, color: '#22c55e' }}>Statement Uploaded</Typography>
                            </Box>
                          ) : (
                            <Box>
                              <Upload size={24} color="var(--vm-text-muted)" style={{ margin: '0 auto 8px' }} />
                              <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)' }}>Click to upload statement</Typography>
                            </Box>
                          )}
                        </Box>
                      </Card>
                    </Grid>

                    {/* Card Document */}
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Card sx={{ bgcolor: 'var(--vm-bg-primary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 2, p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                          <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'var(--vm-bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CreditCard size={20} color="var(--vm-primary-400)" />
                          </Box>
                          <Box>
                            <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'var(--vm-text-primary)' }}>
                              Card Document
                            </Typography>
                            <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>
                              Front & Back of Card (Optional)
                            </Typography>
                          </Box>
                        </Box>
                        <Box
                          onClick={() => handleFileUpload('cardDoc')}
                          sx={{
                            border: '2px dashed var(--vm-border-subtle)',
                            borderRadius: 2,
                            p: 3,
                            textAlign: 'center',
                            cursor: 'pointer',
                            bgcolor: uploadedDocs.cardDoc ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
                            '&:hover': { borderColor: 'var(--vm-primary-500)' },
                          }}
                        >
                          {uploadedDocs.cardDoc ? (
                            <Box>
                              <Check size={24} color="#22c55e" style={{ margin: '0 auto 8px' }} />
                              <Typography sx={{ fontSize: 13, color: '#22c55e' }}>Card Doc Uploaded</Typography>
                            </Box>
                          ) : (
                            <Box>
                              <Upload size={24} color="var(--vm-text-muted)" style={{ margin: '0 auto 8px' }} />
                              <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)' }}>Click to upload card doc</Typography>
                            </Box>
                          )}
                        </Box>
                      </Card>
                    </Grid>

                    {/* Signature */}
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Card sx={{ bgcolor: 'var(--vm-bg-primary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 2, p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                          <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'var(--vm-bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FileCheck size={20} color="var(--vm-primary-400)" />
                          </Box>
                          <Box>
                            <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'var(--vm-text-primary)' }}>
                              Signature
                            </Typography>
                            <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>
                              Required authorization
                            </Typography>
                          </Box>
                        </Box>
                        <Box
                          onClick={() => handleFileUpload('signatureDoc')}
                          sx={{
                            border: '2px dashed var(--vm-border-subtle)',
                            borderRadius: 2,
                            p: 3,
                            textAlign: 'center',
                            cursor: 'pointer',
                            bgcolor: uploadedDocs.signatureDoc ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
                            '&:hover': { borderColor: 'var(--vm-primary-500)' },
                          }}
                        >
                          {uploadedDocs.signatureDoc ? (
                            <Box>
                              <Check size={24} color="#22c55e" style={{ margin: '0 auto 8px' }} />
                              <Typography sx={{ fontSize: 13, color: '#22c55e' }}>Signature Uploaded</Typography>
                            </Box>
                          ) : (
                            <Box>
                              <Upload size={24} color="var(--vm-text-muted)" style={{ margin: '0 auto 8px' }} />
                              <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)' }}>Click to upload signature</Typography>
                            </Box>
                          )}
                        </Box>
                      </Card>
                    </Grid>
                  </Grid>
                </Box>
              )}

              {/* Step 5: Review & Submit */}
              {activeConnectStep === 4 && (
                <Box>
                  <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 3 }}>
                    Review & Submit
                  </Typography>
                  
                  <Card sx={{ bgcolor: 'var(--vm-bg-primary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 2, p: 3, mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, pb: 2, borderBottom: '1px solid var(--vm-border-subtle)' }}>
                      <Avatar sx={{ width: 48, height: 48, bgcolor: selectedBankInfo?.color || '#64748b', color: '#fff', fontWeight: 700, fontSize: 20 }}>
                        {selectedBankInfo?.name.substring(0, 2).toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'var(--vm-text-primary)' }}>
                          {selectedBankInfo?.name}
                        </Typography>
                        <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)' }}>
                          {selectedAccountType.charAt(0).toUpperCase() + selectedAccountType.slice(1)} Account
                        </Typography>
                      </Box>
                    </Box>

                    <Typography sx={{ fontSize: { xs: 12, md: 14 }, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 2 }}>
                      Personal Information
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
                      <Box>
                        <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>Name</Typography>
                        <Typography sx={{ fontSize: { xs: 11, md: 13 }, color: 'var(--vm-text-primary)' }}>{bankForm.firstName} {bankForm.lastName}</Typography>
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>Email</Typography>
                        <Typography sx={{ fontSize: { xs: 11, md: 13 }, color: 'var(--vm-text-primary)' }}>{bankForm.email}</Typography>
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>Phone</Typography>
                        <Typography sx={{ fontSize: { xs: 11, md: 13 }, color: 'var(--vm-text-primary)' }}>{bankForm.phone}</Typography>
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>Date of Birth</Typography>
                        <Typography sx={{ fontSize: { xs: 11, md: 13 }, color: 'var(--vm-text-primary)' }}>{bankForm.dateOfBirth}</Typography>
                      </Box>
                    </Box>

                    <Typography sx={{ fontSize: { xs: 12, md: 14 }, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 2 }}>
                      Documents Uploaded
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      {uploadedDocs.idDoc && (
                        <Chip size="small" icon={<Check size={12} />} label="ID Document" sx={{ bgcolor: 'rgba(34, 197, 94, 0.2)', color: '#22c55e' }} />
                      )}
                      {uploadedDocs.bankStatement && (
                        <Chip size="small" icon={<Check size={12} />} label="Bank Statement" sx={{ bgcolor: 'rgba(34, 197, 94, 0.2)', color: '#22c55e' }} />
                      )}
                      {uploadedDocs.cardDoc && (
                        <Chip size="small" icon={<Check size={12} />} label="Card Document" sx={{ bgcolor: 'rgba(34, 197, 94, 0.2)', color: '#22c55e' }} />
                      )}
                      {uploadedDocs.signatureDoc && (
                        <Chip size="small" icon={<Check size={12} />} label="Signature" sx={{ bgcolor: 'rgba(34, 197, 94, 0.2)', color: '#22c55e' }} />
                      )}
                    </Box>
                  </Card>

                  <Card sx={{ bgcolor: 'var(--vm-bg-primary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 2, p: 3 }}>
                    <Typography sx={{ fontSize: { xs: 11, md: 13 }, color: 'var(--vm-text-muted)', mb: 2 }}>
                      <Shield size={14} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                      By submitting, you authorize VentureMate to securely connect to your bank account. 
                      Your data is encrypted and protected by 256-bit SSL security.
                    </Typography>
                  </Card>
                </Box>
              )}

              {/* Navigation Buttons */}
              <DialogActions sx={{ p: 0, pt: 3, mt: 3, borderTop: '1px solid var(--vm-border-subtle)', justifyContent: 'center' }}>
                <GradientButton
                  variant="outline"
                  size="md"
                  onClick={activeConnectStep === 0 ? handleCloseConnectModal : handlePrevConnectStep}
                >
                  {activeConnectStep === 0 ? 'Cancel' : 'Back'}
                </GradientButton>
                
                {activeConnectStep === connectSteps.length - 1 ? (
                  <GradientButton
                    variant="primary"
                    size="md"
                    onClick={handleSubmitBankConnection}
                  >
                    <Shield size={16} style={{ marginRight: 8 }} />
                    Connect Securely
                  </GradientButton>
                ) : (
                  <GradientButton
                    variant="primary"
                    size="md"
                    onClick={handleNextConnectStep}
                    disabled={!isConnectStepValid()}
                  >
                    Continue
                  </GradientButton>
                )}
              </DialogActions>
            </DialogContent>
          </>
        )}
      </Dialog>
      <DomainChat domain="banking" placeholder="Ask me about banking and finances..." />
    </Box>
  );
}
