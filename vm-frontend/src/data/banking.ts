// Banking Data - Accounts, Transactions, Invoices

export interface BankAccount {
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

export interface PaymentTransaction {
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

export interface Invoice {
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

export interface BankingDashboard {
  total_balance: number;
  monthly_income: number;
  monthly_expenses: number;
  outstanding_invoices: number;
  pending_transactions: number;
}

export const bankingStats: BankingDashboard = {
  total_balance: 487500,
  monthly_income: 125000,
  monthly_expenses: 89000,
  outstanding_invoices: 45000,
  pending_transactions: 3,
};

export const bankAccounts: BankAccount[] = [
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

export const transactions: PaymentTransaction[] = [
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

export const invoices: Invoice[] = [
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
