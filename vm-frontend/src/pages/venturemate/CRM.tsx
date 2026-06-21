import { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  Tabs,
  Tab,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Grid,
  // Alert removed
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { GradientButton } from '../../components/shared/buttons';
import {
  Users,
  TrendingUp,
  Phone,
  Mail,
  Plus,
  CheckCircle,
  Calendar,
  X,
  Send,
  PhoneCall,
  // MessageSquare, Building2 removed
  User,
} from 'lucide-react';
import type { ViewType } from '../../types/venturemate';

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  job_title: string;
  contact_type: 'lead' | 'customer' | 'partner' | 'investor';
  source: string;
  notes: string;
  created_at: string;
  last_contact: string;
  avatar?: string;
}

interface Deal {
  id: string;
  title: string;
  contact_id: string;
  contact_name: string;
  value: number;
  currency: string;
  stage: 'prospecting' | 'qualification' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  probability: number;
  expected_close_date: string;
  created_at: string;
}

interface Activity {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'note' | 'task';
  contact_id: string;
  contact_name: string;
  description: string;
  created_at: string;
  created_by: string;
}

interface CrmDashboardStats {
  total_contacts: number;
  total_deals: number;
  total_value: number;
  win_rate: number;
  deals_by_stage: Record<string, number>;
}

const contactTypes = [
  { value: 'lead', label: 'Lead', color: '#3b82f6' },
  { value: 'customer', label: 'Customer', color: '#22c55e' },
  { value: 'partner', label: 'Partner', color: '#8b5cf6' },
  { value: 'investor', label: 'Investor', color: '#f59e0b' },
] as const;

const dealStages = [
  { value: 'prospecting', label: 'Prospecting', color: '#6b7280', probability: 10 },
  { value: 'qualification', label: 'Qualification', color: '#3b82f6', probability: 25 },
  { value: 'proposal', label: 'Proposal', color: '#f59e0b', probability: 50 },
  { value: 'negotiation', label: 'Negotiation', color: '#8b5cf6', probability: 75 },
  { value: 'closed_won', label: 'Closed Won', color: '#22c55e', probability: 100 },
  { value: 'closed_lost', label: 'Closed Lost', color: '#ef4444', probability: 0 },
] as const;

const crmStats: CrmDashboardStats = {
  total_contacts: 48,
  total_deals: 12,
  total_value: 2850000,
  win_rate: 42,
  deals_by_stage: {
    prospecting: 3,
    qualification: 4,
    proposal: 2,
    negotiation: 2,
    closed_won: 1,
    closed_lost: 0,
  },
};

const contacts: Contact[] = [
  {
    id: 'contact_001',
    name: 'Sarah Chen',
    email: 'sarah.chen@techcorp.com',
    phone: '+1 (555) 123-4567',
    company: 'TechCorp Inc',
    job_title: 'VP of Engineering',
    contact_type: 'lead',
    source: 'LinkedIn',
    notes: 'Interested in AI automation solutions. Follow up next week.',
    created_at: '2024-03-15T10:00:00Z',
    last_contact: '2024-04-02T14:30:00Z',
    avatar: 'https://i.pravatar.cc/150?u=sarah',
  },
  {
    id: 'contact_002',
    name: 'Michael Rodriguez',
    email: 'mrodriguez@startupxyz.io',
    phone: '+1 (555) 987-6543',
    company: 'StartupXYZ',
    job_title: 'CEO',
    contact_type: 'investor',
    source: 'Referral',
    notes: 'Angel investor looking for AI startups. Met at demo day.',
    created_at: '2024-02-20T09:00:00Z',
    last_contact: '2024-04-01T11:00:00Z',
    avatar: 'https://i.pravatar.cc/150?u=michael',
  },
  {
    id: 'contact_003',
    name: 'Emily Watson',
    email: 'emily.w@globaltech.com',
    phone: '+1 (555) 456-7890',
    company: 'GlobalTech Solutions',
    job_title: 'Procurement Manager',
    contact_type: 'customer',
    source: 'Website',
    notes: 'Existing customer. Looking to expand license.',
    created_at: '2024-01-10T08:00:00Z',
    last_contact: '2024-04-03T16:45:00Z',
    avatar: 'https://i.pravatar.cc/150?u=emily',
  },
  {
    id: 'contact_004',
    name: 'David Kim',
    email: 'david.kim@venturecap.com',
    phone: '+1 (555) 234-5678',
    company: 'Venture Capital Partners',
    job_title: 'Partner',
    contact_type: 'investor',
    source: 'Warm Intro',
    notes: 'Series A investor. Interested in follow-on round.',
    created_at: '2024-03-01T14:00:00Z',
    last_contact: '2024-04-02T10:00:00Z',
    avatar: 'https://i.pravatar.cc/150?u=david',
  },
  {
    id: 'contact_005',
    name: 'Lisa Thompson',
    email: 'lisa@innovatetech.co',
    phone: '+1 (555) 876-5432',
    company: 'InnovateTech',
    job_title: 'CTO',
    contact_type: 'partner',
    source: 'Conference',
    notes: 'Potential integration partner. Technical discussion pending.',
    created_at: '2024-03-20T11:30:00Z',
    last_contact: '2024-03-28T09:15:00Z',
    avatar: 'https://i.pravatar.cc/150?u=lisa',
  },
];

const deals: Deal[] = [
  {
    id: 'deal_001',
    title: 'Enterprise License - TechCorp',
    contact_id: 'contact_001',
    contact_name: 'Sarah Chen',
    value: 150000,
    currency: 'USD',
    stage: 'negotiation',
    probability: 75,
    expected_close_date: '2024-04-15',
    created_at: '2024-03-15T10:00:00Z',
  },
  {
    id: 'deal_002',
    title: 'Seed Investment - Angel Round',
    contact_id: 'contact_002',
    contact_name: 'Michael Rodriguez',
    value: 500000,
    currency: 'USD',
    stage: 'proposal',
    probability: 50,
    expected_close_date: '2024-05-01',
    created_at: '2024-02-20T09:00:00Z',
  },
  {
    id: 'deal_003',
    title: 'License Expansion - GlobalTech',
    contact_id: 'contact_003',
    contact_name: 'Emily Watson',
    value: 75000,
    currency: 'USD',
    stage: 'closed_won',
    probability: 100,
    expected_close_date: '2024-04-01',
    created_at: '2024-01-10T08:00:00Z',
  },
  {
    id: 'deal_004',
    title: 'Series A Investment',
    contact_id: 'contact_004',
    contact_name: 'David Kim',
    value: 2000000,
    currency: 'USD',
    stage: 'qualification',
    probability: 25,
    expected_close_date: '2024-06-15',
    created_at: '2024-03-01T14:00:00Z',
  },
  {
    id: 'deal_005',
    title: 'Partnership Agreement - InnovateTech',
    contact_id: 'contact_005',
    contact_name: 'Lisa Thompson',
    value: 125000,
    currency: 'USD',
    stage: 'prospecting',
    probability: 10,
    expected_close_date: '2024-05-30',
    created_at: '2024-03-20T11:30:00Z',
  },
];

const activities: Activity[] = [
  {
    id: 'act_001',
    type: 'call',
    contact_id: 'contact_001',
    contact_name: 'Sarah Chen',
    description: 'Discussed enterprise requirements and pricing options.',
    created_at: '2024-04-02T14:30:00Z',
    created_by: 'Alex Chen',
  },
  {
    id: 'act_002',
    type: 'email',
    contact_id: 'contact_002',
    contact_name: 'Michael Rodriguez',
    description: 'Sent pitch deck and financial projections.',
    created_at: '2024-04-01T11:00:00Z',
    created_by: 'Alex Chen',
  },
  {
    id: 'act_003',
    type: 'meeting',
    contact_id: 'contact_003',
    contact_name: 'Emily Watson',
    description: 'Quarterly business review and expansion discussion.',
    created_at: '2024-04-03T16:45:00Z',
    created_by: 'Sarah Kim',
  },
  {
    id: 'act_004',
    type: 'note',
    contact_id: 'contact_004',
    contact_name: 'David Kim',
    description: 'Follow-up required: Send term sheet and cap table.',
    created_at: '2024-04-02T10:00:00Z',
    created_by: 'Alex Chen',
  },
  {
    id: 'act_005',
    type: 'task',
    contact_id: 'contact_005',
    contact_name: 'Lisa Thompson',
    description: 'Schedule technical integration call with engineering team.',
    created_at: '2024-03-28T09:15:00Z',
    created_by: 'Mike Johnson',
  },
];

interface CRMProps {
   
  onViewChange?: (_view: ViewType) => void;
}

export function CRMPage({ onViewChange: _onViewChange }: CRMProps) {
  const [activeTab, setActiveTab] = useState(0);
  
  // Add Contact Modal State
  const [addContactModalOpen, setAddContactModalOpen] = useState(false);
  const [newContact, setNewContact] = useState<Partial<Contact>>({
    name: '',
    email: '',
    phone: '',
    company: '',
    job_title: '',
    contact_type: 'lead',
    notes: '',
  });
  const [contactAdded, setContactAdded] = useState(false);
  
  // Action Modal State (Call/Email)
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<'call' | 'email' | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [callNotes, setCallNotes] = useState('');
  const [actionSuccess, setActionSuccess] = useState(false);

  const getStageColor = (stage: string) => {
    const stageData = dealStages.find(s => s.value === stage);
    return stageData?.color || '#6b7280';
  };

  const getContactTypeColor = (type: string) => {
    const typeData = contactTypes.find(t => t.value === type);
    return typeData?.color || '#6b7280';
  };

  const handleAddContact = () => {
    // Simulate adding contact
    setContactAdded(true);
    setTimeout(() => {
      setAddContactModalOpen(false);
      setContactAdded(false);
      setNewContact({
        name: '',
        email: '',
        phone: '',
        company: '',
        job_title: '',
        contact_type: 'lead',
        notes: '',
      });
    }, 1500);
  };

  const handleCallClick = (contact: Contact) => {
    setSelectedContact(contact);
    setActionType('call');
    setCallNotes('');
    setActionSuccess(false);
    setActionModalOpen(true);
  };

  const handleEmailClick = (contact: Contact) => {
    setSelectedContact(contact);
    setActionType('email');
    setEmailSubject('');
    setEmailBody('');
    setActionSuccess(false);
    setActionModalOpen(true);
  };

  const handleSendAction = () => {
    // Simulate sending/calling
    setActionSuccess(true);
    setTimeout(() => {
      setActionModalOpen(false);
      setActionSuccess(false);
    }, 1500);
  };

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', mb: 4, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 2, sm: 0 } }}>
        <Box>
          <Typography sx={{ fontSize: { xs: 18, sm: 20, md: 28 }, fontWeight: 700, color: 'var(--vm-text-primary)', mb: 1 }}>
            CRM
          </Typography>
          <Typography sx={{ fontSize: { xs: 12, sm: 13, md: 15 }, color: 'var(--vm-text-muted)' }}>
            Manage your contacts, deals, and relationships
          </Typography>
        </Box>
        <GradientButton variant="primary" size="md" onClick={() => setAddContactModalOpen(true)} sx={{ width: { xs: '100%', sm: 'auto' } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Plus size={18} />
            Add Contact
          </Box>
        </GradientButton>
      </Box>

      {/* Stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: '24px', mb: '32px' }}>
        {[
          { label: 'Total Contacts', value: crmStats.total_contacts, icon: Users, color: '#3b82f6' },
          { label: 'Active Deals', value: crmStats.total_deals, icon: TrendingUp, color: '#22c55e' },
          { label: 'Pipeline Value', value: `$${(crmStats.total_value / 1000000).toFixed(2)}M`, icon: TrendingUp, color: '#f59e0b' },
          { label: 'Win Rate', value: `${crmStats.win_rate}%`, icon: CheckCircle, color: '#8b5cf6' },
        ].map((stat) => (
          <Card
            key={stat.label}
            sx={{
              bgcolor: 'var(--vm-bg-secondary)',
              border: '1px solid var(--vm-border-subtle)',
              borderRadius: 3,
              p: { xs: 2, sm: 3 },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  bgcolor: `${stat.color}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <stat.icon size={22} color={stat.color} />
              </Box>
            </Box>
            <Typography sx={{ fontSize: { xs: 20, sm: 24 }, fontWeight: 700, color: 'var(--vm-text-primary)' }}>
              {stat.value}
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)' }}>
              {stat.label}
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
        <Tab label="Contacts" />
        <Tab label="Deals" />
        <Tab label="Activities" />
      </Tabs>

      {/* Contacts Tab */}
      {activeTab === 0 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: '24px' }}>
          {contacts.map((contact) => (
            <Card
              key={contact.id}
              sx={{
                bgcolor: 'var(--vm-bg-secondary)',
                border: '1px solid var(--vm-border-subtle)',
                borderRadius: 3,
                p: { xs: 2, sm: 3 },
                width: '100%',
                maxWidth: '100%',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                <Avatar src={contact.avatar} sx={{ width: 56, height: 56, flexShrink: 0 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                    <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'var(--vm-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {contact.name}
                    </Typography>
                    <Chip
                      size="small"
                      label={contact.contact_type}
                      sx={{
                        bgcolor: `${getContactTypeColor(contact.contact_type)}20`,
                        color: getContactTypeColor(contact.contact_type),
                        fontSize: 10,
                        fontWeight: 600,
                        textTransform: 'capitalize',
                        '& .MuiChip-label': { whiteSpace: 'normal', py: 0.5 },
                      }}
                    />
                  </Box>
                  <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)' }}>
                    {contact.job_title} at {contact.company}
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                  <Mail size={14} color="var(--vm-text-muted)" />
                  <Typography sx={{ fontSize: 12, color: 'var(--vm-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {contact.email}
                  </Typography>
                </Box>
              </Box>

              <Typography sx={{ fontSize: 13, color: 'var(--vm-text-secondary)', mb: 2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}>
                {contact.notes}
              </Typography>

              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                <GradientButton 
                  variant="outline" 
                  size="sm" 
                  sx={{ fontSize: 12, flex: { xs: 1, sm: 'none' } }}
                  onClick={() => handleCallClick(contact)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Phone size={14} />
                    Call
                  </Box>
                </GradientButton>
                <GradientButton 
                  variant="outline" 
                  size="sm" 
                  sx={{ fontSize: 12, flex: { xs: 1, sm: 'none' } }}
                  onClick={() => handleEmailClick(contact)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Mail size={14} />
                    Email
                  </Box>
                </GradientButton>
              </Box>
            </Card>
          ))}
        </Box>
      )}

      {/* Deals Tab */}
      {activeTab === 1 && (
        <Box sx={{ overflowX: 'auto' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '280px 280px', sm: '1fr 1fr' }, gap: '24px', minWidth: { xs: 560, sm: 0 } }}>
            {deals.map((deal) => (
              <Card
                key={deal.id}
                sx={{
                  bgcolor: 'var(--vm-bg-secondary)',
                  border: '1px solid var(--vm-border-subtle)',
                  borderRadius: 3,
                  p: { xs: 2, sm: 3 },
                  width: '100%',
                  maxWidth: '100%',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, gap: 1 }}>
                  <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'var(--vm-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {deal.title}
                  </Typography>
                  <Chip
                    size="small"
                    label={deal.stage.replace('_', ' ')}
                    sx={{
                      bgcolor: `${getStageColor(deal.stage)}20`,
                      color: getStageColor(deal.stage),
                      fontSize: 10,
                      fontWeight: 600,
                      textTransform: 'capitalize',
                      flexShrink: 0,
                    }}
                  />
                </Box>

                <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'var(--vm-primary-400)', mb: 2 }}>
                  ${deal.value.toLocaleString()}
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>
                      Probability
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: 'var(--vm-text-primary)' }}>
                      {deal.probability}%
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Calendar size={14} color="var(--vm-text-muted)" />
                  <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>
                    Close: {new Date(deal.expected_close_date).toLocaleDateString('en-GB')}
                  </Typography>
                </Box>
              </Card>
            ))}
          </Box>
        </Box>
      )}

      {/* Activities Tab */}
      {activeTab === 2 && (
        <Card
          sx={{
            bgcolor: 'var(--vm-bg-secondary)',
            border: '1px solid var(--vm-border-subtle)',
            borderRadius: 3,
            p: { xs: 2, sm: 3 },
          }}
        >
          {activities.map((activity, idx) => (
            <Box
              key={activity.id}
              sx={{
                display: 'flex',
                gap: { xs: 2, sm: 3 },
                pb: 3,
                mb: 3,
                borderBottom: idx < activities.length - 1 ? '1px solid var(--vm-border-subtle)' : 'none',
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  bgcolor: 'var(--vm-bg-tertiary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {activity.type === 'call' && <Phone size={18} color="var(--vm-primary-400)" />}
                {activity.type === 'email' && <Mail size={18} color="var(--vm-primary-400)" />}
                {activity.type === 'meeting' && <Users size={18} color="var(--vm-primary-400)" />}
                {activity.type === 'note' && <Calendar size={18} color="var(--vm-primary-400)" />}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'var(--vm-text-primary)' }}>
                    {activity.contact_name}
                  </Typography>
                  <Chip
                    size="small"
                    label={activity.type}
                    sx={{
                      bgcolor: 'var(--vm-bg-tertiary)',
                      color: 'var(--vm-text-muted)',
                      fontSize: 10,
                      textTransform: 'capitalize',
                    }}
                  />
                </Box>
                <Typography sx={{ fontSize: 13, color: 'var(--vm-text-secondary)', mb: 1 }}>
                  {activity.description}
                </Typography>
                <Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)' }}>
                  {new Date(activity.created_at).toLocaleString('en-GB')} by {activity.created_by}
                </Typography>
              </Box>
            </Box>
          ))}
        </Card>
      )}

      {/* Add Contact Modal */}
      <Dialog
        open={addContactModalOpen}
        onClose={() => !contactAdded && setAddContactModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'var(--vm-bg-secondary)',
            color: 'var(--vm-text-primary)',
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid var(--vm-border-subtle)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <User size={24} color="var(--vm-primary-400)" />
              <Typography sx={{ fontSize: 18, fontWeight: 600 }}>
                Add New Contact
              </Typography>
            </Box>
            <Box
              onClick={() => !contactAdded && setAddContactModalOpen(false)}
              sx={{
                cursor: contactAdded ? 'not-allowed' : 'pointer',
                p: 1,
                borderRadius: 1,
                opacity: contactAdded ? 0.5 : 1,
                '&:hover': !contactAdded ? { bgcolor: 'var(--vm-bg-tertiary)' } : undefined,
              }}
            >
              <X size={20} color="var(--vm-text-muted)" />
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {contactAdded ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  bgcolor: 'var(--vm-primary-900)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2,
                }}
              >
                <CheckCircle size={32} color="var(--vm-primary-400)" />
              </Box>
              <Typography sx={{ fontSize: 20, fontWeight: 600, mb: 1 }}>
                Contact Added!
              </Typography>
              <Typography sx={{ fontSize: 14, color: 'var(--vm-text-muted)' }}>
                {newContact.name} has been added to your contacts.
              </Typography>
            </Box>
          ) : (
            <>
              <Grid container spacing={2}>
                <Grid size={12}>
                  <TextField
                    fullWidth
                    label="Full Name"
                    value={newContact.name}
                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                    sx={{
                      '& .MuiInputBase-root': { bgcolor: 'var(--vm-bg-primary)', color: 'var(--vm-text-primary)' },
                      '& .MuiInputLabel-root': { color: 'var(--vm-text-muted)' },
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' },
                    }}
                  />
                </Grid>
                <Grid size={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={newContact.email}
                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                    sx={{
                      '& .MuiInputBase-root': { bgcolor: 'var(--vm-bg-primary)', color: 'var(--vm-text-primary)' },
                      '& .MuiInputLabel-root': { color: 'var(--vm-text-muted)' },
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' },
                    }}
                  />
                </Grid>
                <Grid size={6}>
                  <TextField
                    fullWidth
                    label="Phone"
                    value={newContact.phone}
                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                    sx={{
                      '& .MuiInputBase-root': { bgcolor: 'var(--vm-bg-primary)', color: 'var(--vm-text-primary)' },
                      '& .MuiInputLabel-root': { color: 'var(--vm-text-muted)' },
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' },
                    }}
                  />
                </Grid>
                <Grid size={6}>
                  <TextField
                    fullWidth
                    label="Company"
                    value={newContact.company}
                    onChange={(e) => setNewContact({ ...newContact, company: e.target.value })}
                    sx={{
                      '& .MuiInputBase-root': { bgcolor: 'var(--vm-bg-primary)', color: 'var(--vm-text-primary)' },
                      '& .MuiInputLabel-root': { color: 'var(--vm-text-muted)' },
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' },
                    }}
                  />
                </Grid>
                <Grid size={6}>
                  <TextField
                    fullWidth
                    label="Job Title"
                    value={newContact.job_title}
                    onChange={(e) => setNewContact({ ...newContact, job_title: e.target.value })}
                    sx={{
                      '& .MuiInputBase-root': { bgcolor: 'var(--vm-bg-primary)', color: 'var(--vm-text-primary)' },
                      '& .MuiInputLabel-root': { color: 'var(--vm-text-muted)' },
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' },
                    }}
                  />
                </Grid>
                <Grid size={12}>
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ color: 'var(--vm-text-muted)' }}>Contact Type</InputLabel>
                    <Select
                      value={newContact.contact_type}
                      label="Contact Type"
                      onChange={(e) => setNewContact({ ...newContact, contact_type: e.target.value as Contact['contact_type'] })}
                      sx={{ color: 'var(--vm-text-primary)', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' } }}
                    >
                      {contactTypes.map((type) => (
                        <MenuItem key={type.value} value={type.value} sx={{ color: 'var(--vm-text-primary)', textTransform: 'capitalize' }}>{type.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={12}>
                  <TextField
                    fullWidth
                    label="Notes"
                    multiline
                    rows={3}
                    value={newContact.notes}
                    onChange={(e) => setNewContact({ ...newContact, notes: e.target.value })}
                    sx={{
                      '& .MuiInputBase-root': { bgcolor: 'var(--vm-bg-primary)', color: 'var(--vm-text-primary)' },
                      '& .MuiInputLabel-root': { color: 'var(--vm-text-muted)' },
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' },
                    }}
                  />
                </Grid>
              </Grid>
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 3 }}>
                <GradientButton variant="outline" onClick={() => setAddContactModalOpen(false)}>
                  Cancel
                </GradientButton>
                <GradientButton
                  variant="primary"
                  onClick={handleAddContact}
                  disabled={!newContact.name || !newContact.email}
                >
                  Add Contact
                </GradientButton>
              </Box>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Modal (Call/Email) */}
      <Dialog
        open={actionModalOpen}
        onClose={() => !actionSuccess && setActionModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'var(--vm-bg-secondary)',
            color: 'var(--vm-text-primary)',
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid var(--vm-border-subtle)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {actionType === 'call' ? (
                <PhoneCall size={24} color="var(--vm-primary-400)" />
              ) : (
                <Mail size={24} color="var(--vm-primary-400)" />
              )}
              <Typography sx={{ fontSize: 18, fontWeight: 600 }}>
                {actionType === 'call' ? 'Call' : 'Email'} {selectedContact?.name}
              </Typography>
            </Box>
            <Box
              onClick={() => !actionSuccess && setActionModalOpen(false)}
              sx={{
                cursor: actionSuccess ? 'not-allowed' : 'pointer',
                p: 1,
                borderRadius: 1,
                opacity: actionSuccess ? 0.5 : 1,
                '&:hover': !actionSuccess ? { bgcolor: 'var(--vm-bg-tertiary)' } : undefined,
              }}
            >
              <X size={20} color="var(--vm-text-muted)" />
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {actionSuccess ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  bgcolor: 'var(--vm-primary-900)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2,
                }}
              >
                <CheckCircle size={32} color="var(--vm-primary-400)" />
              </Box>
              <Typography sx={{ fontSize: 20, fontWeight: 600, mb: 1 }}>
                {actionType === 'call' ? 'Call Logged!' : 'Email Sent!'}
              </Typography>
              <Typography sx={{ fontSize: 14, color: 'var(--vm-text-muted)' }}>
                {actionType === 'call'
                  ? `Call with ${selectedContact?.name} has been logged.`
                  : `Email to ${selectedContact?.email} has been sent.`}
              </Typography>
            </Box>
          ) : (
            <>
              <Card
                sx={{
                  p: 2,
                  bgcolor: 'var(--vm-bg-tertiary)',
                  mb: 3,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <Avatar src={selectedContact?.avatar} sx={{ width: 48, height: 48 }} />
                <Box>
                  <Typography sx={{ fontSize: 16, fontWeight: 600 }}>
                    {selectedContact?.name}
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)' }}>
                    {actionType === 'call' ? selectedContact?.phone : selectedContact?.email}
                  </Typography>
                </Box>
              </Card>

              {actionType === 'call' ? (
                <TextField
                  fullWidth
                  label="Call Notes"
                  multiline
                  rows={4}
                  placeholder="Enter notes about the call..."
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  sx={{
                    '& .MuiInputBase-root': { bgcolor: 'var(--vm-bg-primary)', color: 'var(--vm-text-primary)' },
                    '& .MuiInputLabel-root': { color: 'var(--vm-text-muted)' },
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' },
                  }}
                />
              ) : (
                <>
                  <TextField
                    fullWidth
                    label="Subject"
                    placeholder="Enter email subject..."
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    sx={{
                      mb: 2,
                      '& .MuiInputBase-root': { bgcolor: 'var(--vm-bg-primary)', color: 'var(--vm-text-primary)' },
                      '& .MuiInputLabel-root': { color: 'var(--vm-text-muted)' },
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' },
                    }}
                  />
                  <TextField
                    fullWidth
                    label="Message"
                    multiline
                    rows={6}
                    placeholder="Enter your message..."
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    sx={{
                      '& .MuiInputBase-root': { bgcolor: 'var(--vm-bg-primary)', color: 'var(--vm-text-primary)' },
                      '& .MuiInputLabel-root': { color: 'var(--vm-text-muted)' },
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' },
                    }}
                  />
                </>
              )}

              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 3 }}>
                <GradientButton variant="outline" onClick={() => setActionModalOpen(false)}>
                  Cancel
                </GradientButton>
                <GradientButton
                  variant="primary"
                  onClick={handleSendAction}
                  disabled={actionType === 'email' ? !emailSubject || !emailBody : false}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {actionType === 'call' ? (
                      <>
                        <PhoneCall size={16} />
                        Log Call
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        Send Email
                      </>
                    )}
                  </Box>
                </GradientButton>
              </Box>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
