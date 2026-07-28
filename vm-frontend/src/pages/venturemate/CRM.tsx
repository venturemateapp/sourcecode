import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box, Typography, Card, Tabs, Tab, Chip, Avatar, Dialog, DialogTitle, DialogContent,
  TextField, Select, MenuItem, FormControl, InputLabel, IconButton, Tooltip, CircularProgress, ListSubheader,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { GradientButton } from '../../components/shared/buttons';
import { graphqlRequest } from '../../lib/api';
import { useBusiness } from '../../contexts/BusinessContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  Users, TrendingUp, Phone, Mail, Plus, CheckCircle, Calendar, X,
  Trash2, Edit3, Building2, DollarSign, ListChecks,
  UserPlus, PhoneCall,
} from 'lucide-react';
import type { CrmContact, CrmDeal, CrmActivity, CrmTask } from '../../types/venturemate';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useToast } from '../../components/shared/toast';
import { useConfirm } from '../../components/shared/useConfirm';

const CONTACT_TYPES = [
  { value: 'lead', label: 'Lead', color: '#3b82f6' },
  { value: 'customer', label: 'Customer', color: '#22c55e' },
  { value: 'partner', label: 'Partner', color: '#8b5cf6' },
  { value: 'investor', label: 'Investor', color: '#f59e0b' },
];

const DEAL_STAGES = [
  { value: 'prospecting', label: 'Prospecting', color: '#6b7280' },
  { value: 'qualification', label: 'Qualification', color: '#3b82f6' },
  { value: 'proposal', label: 'Proposal', color: '#f59e0b' },
  { value: 'negotiation', label: 'Negotiation', color: '#8b5cf6' },
  { value: 'closed_won', label: 'Closed Won', color: '#22c55e' },
  { value: 'closed_lost', label: 'Closed Lost', color: '#ef4444' },
];

const ACTIVITY_ICONS: Record<string, typeof Phone> = {
  call: Phone, email: Mail, meeting: Users, note: Calendar, task: ListChecks,
};

function getContactColor(type: string) {
  return CONTACT_TYPES.find(t => t.value === type)?.color || '#6b7280';
}

function formatDate(s: string | null | undefined) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-GB');
}

export function CRMPage() {
  const { selectedBusiness } = useBusiness();
  const { user } = useAuth();
  const { format } = useCurrency();
  const toast = useToast();
  const { confirmAction, dialog } = useConfirm();
  const bizId = selectedBusiness?.id;

  const assignableUsers = [
    ...(user ? [{ name: `${user.firstName} ${user.lastName}`.trim() || user.email, email: user.email }] : []),
    ...(selectedBusiness?.team?.filter(m => m.status === 'active').map(m => ({ name: m.name, email: m.email })) || []),
  ].filter((v, i, a) => a.findIndex(x => x.email === v.email) === i);

  const [tab, setTab] = useState(0);
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [deals, setDeals] = useState<CrmDeal[]>([]);
  const [activities, setActivities] = useState<CrmActivity[]>([]);
  const [tasks, setTasks] = useState<CrmTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Contact form
  const [contactForm, setContactForm] = useState<Partial<CrmContact> | null>(null);
  const [dealForm, setDealForm] = useState<Partial<CrmDeal> | null>(null);
  const [activityForm, setActivityForm] = useState<{ open: boolean; type: string; contactId: string; description: string }>({ open: false, type: 'note', contactId: '', description: '' });
  const [taskForm, setTaskForm] = useState<Partial<CrmTask> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [emailForm, setEmailForm] = useState<{ open: boolean; contactId: string; contactName: string; contactEmail: string; subject: string; body: string } | null>(null);
  const [emailAttachments, setEmailAttachments] = useState<{ name: string; data: string; mime: string }[]>([]);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [saving, setSaving] = useState(false);

  const q = useCallback(async <T,>(query: string, vars?: Record<string, unknown>) => graphqlRequest<T>(query, vars), []);

  const load = useCallback(async () => {
    if (!bizId) return;
    setLoading(true);
    const results = await Promise.allSettled([
      q<{ crmContacts: CrmContact[] }>('query C($b:ID!){crmContacts(businessId:$b){id businessId name email phone company jobTitle contactType source notes avatar createdAt updatedAt}}', { b: bizId }),
      q<{ crmDeals: CrmDeal[] }>('query D($b:ID!){crmDeals(businessId:$b){id businessId contactId title value currency stage probability expectedCloseDate createdAt updatedAt}}', { b: bizId }),
      q<{ crmActivities: CrmActivity[] }>('query A($b:ID!){crmActivities(businessId:$b){id businessId contactId type description createdBy createdAt}}', { b: bizId }),
      q<{ crmTasks: CrmTask[] }>('query T($b:ID!){crmTasks(businessId:$b){id businessId contactId title description dueDate status assignedTo createdAt updatedAt}}', { b: bizId }),
    ]);
    if (results[0].status === 'fulfilled') setContacts(results[0].value.crmContacts);
    else console.error('Failed to load contacts:', results[0].reason);
    if (results[1].status === 'fulfilled') setDeals(results[1].value.crmDeals);
    else console.error('Failed to load deals:', results[1].reason);
    if (results[2].status === 'fulfilled') setActivities(results[2].value.crmActivities);
    else console.error('Failed to load activities:', results[2].reason);
    if (results[3].status === 'fulfilled') setTasks(results[3].value.crmTasks);
    else console.error('Failed to load tasks:', results[3].reason);
    setLoading(false);
  }, [bizId, q]);

  useEffect(() => { load(); }, [load]);

  const stats = {
    totalContacts: contacts.length,
    totalDeals: deals.length,
    totalValue: deals.reduce((s, d) => s + (d.stage !== 'closed_lost' ? d.value : 0), 0),
    tasksPending: tasks.filter(t => t.status === 'pending').length,
  };

  // Create contact
  const saveContact = async () => {
    if (!bizId || !contactForm?.name) return;
    setSaving(true);
    try {
      if (contactForm.id) {
        await q('mutation M($id:ID!,$b:ID!,$n:String!,$e:String,$p:String,$c:String,$j:String,$t:String,$s:String,$o:String,$a:String){updateCrmContact(id:$id businessId:$b name:$n email:$e phone:$p company:$c jobTitle:$j contactType:$t source:$s notes:$o avatar:$a){id}}', {
          id: contactForm.id, b: bizId, n: contactForm.name, e: contactForm.email || '', p: contactForm.phone || '',
          c: contactForm.company || '', j: contactForm.jobTitle || '', t: contactForm.contactType || 'lead',
          s: contactForm.source || '', o: contactForm.notes || '', a: contactForm.avatar || '',
        });
      } else {
        await q('mutation M($b:ID!,$n:String!,$e:String,$p:String,$c:String,$j:String,$t:String,$s:String,$o:String){createCrmContact(businessId:$b name:$n email:$e phone:$p company:$c jobTitle:$j contactType:$t source:$s notes:$o){id}}', {
          b: bizId, n: contactForm.name, e: contactForm.email || '', p: contactForm.phone || '',
          c: contactForm.company || '', j: contactForm.jobTitle || '', t: contactForm.contactType || 'lead',
          s: contactForm.source || '', o: contactForm.notes || '',
        });
      }
      setContactForm(null);
      await load();
      toast.success('Contact saved', { description: 'Contact has been updated.' });
    } catch (err) {
      console.error('Failed to save contact:', err);
      toast.error('Failed to save contact', { description: 'Please try again.' });
    }
    setSaving(false);
  };

  const deleteContact = async (id: string) => {
    if (!bizId) return;
    confirmAction({ title: 'Delete Contact', message: 'Are you sure you want to delete this contact? This cannot be undone.' }, async () => {
      try {
        await q('mutation M($id:ID!,$b:ID!){deleteCrmContact(id:$id businessId:$b)}', { id, b: bizId });
        await load();
        toast.success('Contact deleted', { description: 'Contact has been removed.' });
      } catch (err) {
        console.error('Failed to delete contact:', err);
        toast.error('Failed to delete contact', { description: 'Please try again.' });
      }
    });
  };

  // Create deal
  const saveDeal = async () => {
    if (!bizId || !dealForm?.title) return;
    if (!dealForm?.contactId) {
      toast.warning('No contact selected', { description: 'Create a contact first before creating a deal.' });
      return;
    }
    setSaving(true);
    try {
      if (dealForm.id) {
        await q('mutation M($id:ID!,$b:ID!,$c:ID!,$t:String!,$v:Float!,$s:String,$p:Int,$e:String){updateCrmDeal(id:$id businessId:$b contactId:$c title:$t value:$v stage:$s probability:$p expectedCloseDate:$e){id}}', {
          id: dealForm.id, b: bizId, c: dealForm.contactId, t: dealForm.title,
          v: dealForm.value || 0, s: dealForm.stage || 'prospecting', p: dealForm.probability || 10, e: dealForm.expectedCloseDate || null,
        });
      } else {
        await q('mutation M($b:ID!,$c:ID!,$t:String!,$v:Float!,$s:String,$p:Int,$e:String){createCrmDeal(businessId:$b contactId:$c title:$t value:$v stage:$s probability:$p expectedCloseDate:$e){id}}', {
          b: bizId, c: dealForm.contactId, t: dealForm.title,
          v: dealForm.value || 0, s: dealForm.stage || 'prospecting', p: dealForm.probability || 10, e: dealForm.expectedCloseDate || null,
        });
      }
      setDealForm(null);
      await load();
      toast.success('Deal saved', { description: 'Deal has been updated.' });
    } catch (err) {
      console.error('Failed to save deal:', err);
      toast.error('Failed to save deal', { description: 'Please try again.' });
    }
    setSaving(false);
  };

  const deleteDeal = async (id: string) => {
    if (!bizId) return;
    confirmAction({ title: 'Delete Deal', message: 'Are you sure you want to delete this deal? This cannot be undone.' }, async () => {
      try {
        await q('mutation M($id:ID!,$b:ID!){deleteCrmDeal(id:$id businessId:$b)}', { id, b: bizId });
        await load();
        toast.success('Deal deleted', { description: 'Deal has been removed.' });
      } catch (err) {
        console.error('Failed to delete deal:', err);
        toast.error('Failed to delete deal', { description: 'Please try again.' });
      }
    });
  };

  const updateDealStage = async (id: string, stage: string) => {
    if (!bizId) return;
    try {
      await q('mutation M($id:ID!,$b:ID!,$s:String!){updateCrmDeal(id:$id businessId:$b stage:$s){id}}', { id, b: bizId, s: stage });
      await load();
      toast.success('Stage updated', { description: 'Deal stage has been changed.' });
    } catch (err) {
      console.error('Failed to update deal stage:', err);
      toast.error('Failed to update deal stage', { description: 'Please try again.' });
    }
  };

  // Create activity
  const saveActivity = async () => {
    if (!bizId || !activityForm.description) return;
    setSaving(true);
    try {
      await q('mutation M($b:ID!,$c:String,$t:String!,$d:String!,$u:String!){createCrmActivity(businessId:$b contactId:$c type:$t description:$d createdBy:$u){id}}', {
        b: bizId, c: activityForm.contactId || null, t: activityForm.type, d: activityForm.description, u: 'Admin',
      });
      setActivityForm({ open: false, type: 'note', contactId: '', description: '' });
      await load();
      toast.success('Activity logged', { description: 'Activity has been recorded.' });
    } catch (err) {
      console.error('Failed to save activity:', err);
      toast.error('Failed to save activity', { description: 'Please try again.' });
    }
    setSaving(false);
  };

  const sendEmail = async () => {
    if (!bizId || !emailForm) return;
    setSendingEmail(true);
    try {
      const attJson = emailAttachments.length > 0 ? JSON.stringify(emailAttachments.map(a => ({ filename: a.name, data: a.data, mimeType: a.mime }))) : '';
      await q('mutation M($c:ID!,$b:ID!,$s:String!,$d:String!,$a:String){sendCrmEmail(contactId:$c businessId:$b subject:$s body:$d attachments:$a)}', {
        c: emailForm.contactId, b: bizId, s: emailForm.subject, d: emailForm.body, a: attJson || null,
      });
      setEmailForm(null);
      setEmailAttachments([]);
      toast.success('Email sent', { description: `Email sent to ${emailForm.contactName}` });
    } catch (err) {
      console.error('Failed to send email:', err);
      toast.error('Failed to send email', { description: 'Please try again.' });
    }
    setSendingEmail(false);
  };

  const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data:...;base64, prefix
          const base64 = result.split(',')[1] || result;
          resolve(base64);
        };
        reader.readAsDataURL(file);
      });
      setEmailAttachments(prev => [...prev, { name: file.name, data, mime: file.type || 'application/octet-stream' }]);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (idx: number) => {
    setEmailAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  const deleteActivity = async (id: string) => {
    if (!bizId) return;
    confirmAction({ title: 'Delete Activity', message: 'Are you sure you want to delete this activity? This cannot be undone.' }, async () => {
      try {
        await q('mutation M($id:ID!,$b:ID!){deleteCrmActivity(id:$id businessId:$b)}', { id, b: bizId });
        await load();
        toast.success('Activity deleted', { description: 'Activity has been removed.' });
      } catch (err) {
        console.error('Failed to delete activity:', err);
        toast.error('Failed to delete activity', { description: 'Please try again.' });
      }
    });
  };

  // Create task
  const saveTask = async () => {
    if (!bizId || !taskForm?.title) return;
    setSaving(true);
    try {
      if (taskForm.id) {
        await q('mutation M($id:ID!,$b:ID!,$t:String!,$d:String,$due:String,$s:String,$u:String,$c:String){updateCrmTask(id:$id businessId:$b title:$t description:$d dueDate:$due status:$s assignedTo:$u contactId:$c){id}}', {
          id: taskForm.id, b: bizId, t: taskForm.title,
          d: taskForm.description || '', due: taskForm.dueDate || null,
          s: taskForm.status || 'pending', u: taskForm.assignedTo || '',
          c: taskForm.contactId || null,
        });
      } else {
        await q('mutation M($b:ID!,$c:String,$t:String!,$d:String,$s:String,$u:String,$due:String){createCrmTask(businessId:$b contactId:$c title:$t description:$d status:$s assignedTo:$u dueDate:$due){id}}', {
          b: bizId, c: taskForm.contactId || null, t: taskForm.title,
          d: taskForm.description || '', s: taskForm.status || 'pending',
          u: taskForm.assignedTo || '', due: taskForm.dueDate || null,
        });
      }
      setTaskForm(null);
      await load();
      toast.success('Task saved', { description: 'Task has been updated.' });
    } catch (err) {
      console.error('Failed to save task:', err);
      toast.error('Failed to save task', { description: 'Please try again.' });
    }
    setSaving(false);
  };

  const deleteTask = async (id: string) => {
    if (!bizId) return;
    confirmAction({ title: 'Delete Task', message: 'Are you sure you want to delete this task? This cannot be undone.' }, async () => {
      try {
        await q('mutation M($id:ID!,$b:ID!){deleteCrmTask(id:$id businessId:$b)}', { id, b: bizId });
        await load();
        toast.success('Task deleted', { description: 'Task has been removed.' });
      } catch (err) {
        console.error('Failed to delete task:', err);
        toast.error('Failed to delete task', { description: 'Please try again.' });
      }
    });
  };

  const updateTaskStatus = async (id: string, status: string) => {
    if (!bizId) return;
    try {
      await q('mutation M($id:ID!,$b:ID!,$s:String!){updateCrmTask(id:$id businessId:$b status:$s){id}}', { id, b: bizId, s: status });
      await load();
      toast.success('Status updated', { description: 'Task status has been changed.' });
    } catch (err) {
      console.error('Failed to update task status:', err);
      toast.error('Failed to update task status', { description: 'Please try again.' });
    }
  };

  if (!bizId) {
    return <Box sx={{ p: 4, textAlign: 'center', color: 'var(--vm-text-muted)' }}><Building2 size={40} /><Typography sx={{ mt: 1 }}>Select a business to manage CRM</Typography></Box>;
  }

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', mb: 3, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1.5, sm: 0 } }}>
        <Box>
          <Typography sx={{ fontSize: { xs: 20, sm: 24, md: 28 }, fontWeight: 800, color: 'var(--vm-text-primary)' }}>CRM</Typography>
          <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)' }}>Contacts · Deals · Activities · Tasks</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {tab === 0 && <GradientButton variant="primary" size="sm" startIcon={<UserPlus size={14} />} onClick={() => setContactForm({ name: '', contactType: 'lead' })}>Add Contact</GradientButton>}
          {tab === 1 && <GradientButton variant="primary" size="sm" startIcon={<Plus size={14} />} onClick={() => setDealForm({ title: '', contactId: contacts[0]?.id || '', stage: 'prospecting', value: 0, probability: 10 })}>Add Deal</GradientButton>}
          {tab === 2 && <GradientButton variant="primary" size="sm" startIcon={<Plus size={14} />} onClick={() => setActivityForm({ open: true, type: 'note', contactId: '', description: '' })}>Add Activity</GradientButton>}
          {tab === 3 && <GradientButton variant="primary" size="sm" startIcon={<Plus size={14} />} onClick={() => setTaskForm({ title: '', status: 'pending' })}>Add Task</GradientButton>}
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', sm: 'repeat(4,1fr)' }, gap: { xs: 1.5, sm: 2 }, mb: 3 }}>
        {[
          { icon: Users, label: 'Contacts', value: stats.totalContacts, color: '#3b82f6' },
          { icon: TrendingUp, label: 'Deals', value: stats.totalDeals, color: '#22c55e' },
          { icon: DollarSign, label: 'Pipeline Value', value: format(stats.totalValue), color: '#f59e0b' },
          { icon: ListChecks, label: 'Pending Tasks', value: stats.tasksPending, color: '#8b5cf6' },
        ].map(s => (
          <Card key={s.label} sx={{ p: { xs: 1.5, sm: 2.5 }, bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3 }}>
            <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
              <s.icon size={18} color={s.color} />
            </Box>
            <Typography sx={{ fontSize: { xs: 20, sm: 24 }, fontWeight: 800, color: 'var(--vm-text-primary)', lineHeight: 1.1, overflowWrap: 'anywhere' }}>{s.value}</Typography>
            <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)', mt: 0.25, overflowWrap: 'anywhere' }}>{s.label}</Typography>
          </Card>
        ))}
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ mb: 2.5,
        '& .MuiTabs-indicator': { bgcolor: 'var(--vm-primary-500)' },
        '& .MuiTab-root': { color: 'var(--vm-text-muted)', textTransform: 'none', fontSize: { xs: 12, sm: 14 }, minWidth: { xs: 'auto', sm: 90 }, '&.Mui-selected': { color: 'var(--vm-primary-400)' } },
      }}>
        <Tab label={`Contacts (${contacts.length})`} />
        <Tab label={`Deals (${deals.length})`} />
        <Tab label={`Activity (${activities.length})`} />
        <Tab label={`Tasks (${tasks.length})`} />
      </Tabs>

      {/* Contacts Tab */}
      {tab === 0 && (
        loading ? <Loading /> : contacts.length === 0 ? <Empty icon={Users} text="No contacts yet" /> : (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2,1fr)', lg: 'repeat(3,1fr)' }, gap: 2 }}>
            {contacts.map(c => (
              <Card key={c.id} sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
                  <Avatar sx={{ width: 44, height: 44, bgcolor: `${getContactColor(c.contactType)}22`, color: getContactColor(c.contactType), fontWeight: 700, fontSize: 16 }}>
                    {c.name.charAt(0)}{c.name.split(' ')[1]?.charAt(0)}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                      <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'var(--vm-text-primary)', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{c.name}</Typography>
                      <Chip label={c.contactType} size="small" sx={{ bgcolor: `${getContactColor(c.contactType)}18`, color: getContactColor(c.contactType), fontSize: 9, fontWeight: 700, height: 20 }} />
                    </Box>
                    <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)', overflowWrap: 'anywhere' }}>{c.jobTitle} {c.company ? `· ${c.company}` : ''}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.25, flexShrink: 0 }}>
                    <Tooltip title="Edit"><IconButton size="small" sx={{ color: 'var(--vm-text-muted)' }} onClick={() => setContactForm(c)}><Edit3 size={13} /></IconButton></Tooltip>
                    <Tooltip title="Delete"><IconButton size="small" sx={{ color: '#ef444488' }} onClick={() => deleteContact(c.id)}><Trash2 size={13} /></IconButton></Tooltip>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5, mb: 1, flexWrap: 'wrap' }}>
                  {c.email && (
                    <Box component="a" href={`mailto:${c.email}`} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, textDecoration: 'none', color: 'inherit', '&:hover': { color: 'var(--vm-primary-400)' } }}>
                      <Mail size={12} color="var(--vm-text-muted)" />
                      <Typography sx={{ fontSize: 12, color: 'var(--vm-text-secondary)', overflowWrap: 'anywhere' }}>{c.email}</Typography>
                    </Box>
                  )}
                  {c.phone && (
                    <Box component="a" href={`tel:${c.phone}`} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, textDecoration: 'none', color: 'inherit', '&:hover': { color: 'var(--vm-primary-400)' } }}>
                      <Phone size={12} color="var(--vm-text-muted)" />
                      <Typography sx={{ fontSize: 12, color: 'var(--vm-text-secondary)', overflowWrap: 'anywhere' }}>{c.phone}</Typography>
                    </Box>
                  )}
                </Box>
                {c.notes && <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{c.notes}</Typography>}
                <Box sx={{ display: 'flex', gap: 0.75, mt: 1.5 }}>
                  <GradientButton variant="outline" size="sm" sx={{ fontSize: 11, flex: 1, py: 0.5 }}
                    onClick={() => c.phone ? window.location.assign(`tel:${c.phone.replace(/[^\d+*#,;]/g, '')}`) : toast.warning('No phone number', { description: 'This contact has no phone number.' })}>
                    <PhoneCall size={12} style={{ marginRight: 4 }} /> Call
                  </GradientButton>
                  <GradientButton variant="outline" size="sm" sx={{ fontSize: 11, flex: 1, py: 0.5 }}
                    onClick={() => c.email ? (setEmailForm({ open: true, contactId: c.id, contactName: c.name, contactEmail: c.email, subject: '', body: '' }), setEmailAttachments([])) : toast.warning('No email address', { description: 'This contact has no email address.' })}>
                    <Mail size={12} style={{ marginRight: 4 }} /> Email
                  </GradientButton>
                </Box>
              </Card>
            ))}
          </Box>
        )
      )}

      {/* Deals Tab — Kanban Board */}
      {tab === 1 && (
        loading ? <Loading /> : deals.length === 0 ? <Empty icon={TrendingUp} text="No deals yet. Start by creating your first deal!" /> : (
          <>
            {/* Pipeline summary bar */}
            <Box sx={{ display: 'flex', gap: { xs: 1, sm: 2 }, mb: 2.5, overflowX: 'auto', pb: 0.5 }}>
              {DEAL_STAGES.map(s => {
                const stageDeals = deals.filter(d => d.stage === s.value);
                const stageValue = stageDeals.reduce((sum, d) => sum + d.value, 0);
                return (
                  <Box key={s.value} sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.75, borderRadius: 2, bgcolor: `${s.color}10`, border: `1px solid ${s.color}20`, whiteSpace: 'nowrap' }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: s.color }} />
                    <Box>
                      <Typography sx={{ fontSize: 11, fontWeight: 700, color: s.color }}>{s.label}</Typography>
                      <Typography sx={{ fontSize: 9, color: 'var(--vm-text-muted)' }}>{stageDeals.length} deals · {format(stageValue)}</Typography>
                    </Box>
                  </Box>
                );
              })}
            </Box>

            {/* Kanban columns */}
            <Box sx={{
              display: { xs: 'flex', md: 'grid' },
              flexDirection: { xs: 'column', md: 'none' },
              gridTemplateColumns: { md: `repeat(${DEAL_STAGES.length}, 1fr)` },
              gap: 2,
              overflowX: { md: 'auto' },
              pb: 1,
            }}>
              {DEAL_STAGES.map(stage => {
                const stageDeals = deals.filter(d => d.stage === stage.value);
                const stageValue = stageDeals.reduce((sum, d) => sum + d.value, 0);
                return (
                  <Box key={stage.value} sx={{
                    minWidth: { xs: '100%', md: 220 },
                    bgcolor: 'rgba(255,255,255,.02)',
                    borderRadius: 3,
                    border: `1px solid ${stage.color}18`,
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: { xs: 'none', md: 520 },
                  }}>
                    {/* Column header */}
                    <Box sx={{
                      px: 1.5, py: 1.25, borderBottom: `1px solid ${stage.color}15`,
                      display: 'flex', alignItems: 'center', gap: 1, bgcolor: `${stage.color}08`,
                      borderTopLeftRadius: 11, borderTopRightRadius: 11,
                    }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: stage.color, flexShrink: 0 }} />
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'var(--vm-text-primary)', textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 }}>{stage.label}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography sx={{ fontSize: 11, fontWeight: 800, color: stage.color }}>{stageDeals.length}</Typography>
                        <Typography sx={{ fontSize: 9, color: 'var(--vm-text-muted)' }}>{format(stageValue)}</Typography>
                      </Box>
                    </Box>

                    {/* Column body */}
                    <Box sx={{
                      p: 1, flex: 1, overflowY: 'auto',
                      display: 'flex', flexDirection: 'column', gap: 1,
                      minHeight: { xs: 'auto', md: 200 },
                    }}>
                      {stageDeals.length === 0 && (
                        <Box sx={{ py: 3, textAlign: 'center' }}>
                          <Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)' }}>Empty</Typography>
                        </Box>
                      )}
                      {stageDeals.map(d => {
                        const contact = contacts.find(c => c.id === d.contactId);
                        const stageIdx = DEAL_STAGES.findIndex(s => s.value === d.stage);
                        return (
                          <Card key={d.id} sx={{
                            p: 1.5, bgcolor: 'var(--vm-bg-secondary)', border: `1px solid ${stage.color}20`,
                            borderRadius: 2.5, boxShadow: `0 1px 3px ${stage.color}10`,
                            transition: 'all .15s ease',
                            '&:hover': { borderColor: stage.color, boxShadow: `0 4px 12px ${stage.color}20`, transform: 'translateY(-1px)' },
                          }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                              <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'var(--vm-text-primary)', lineHeight: 1.3, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{d.title}</Typography>
                              <IconButton size="small" sx={{ color: '#ef444466', p: 0.25, ml: 0.5, flexShrink: 0 }} onClick={() => deleteDeal(d.id)}><Trash2 size={11} /></IconButton>
                            </Box>

                            <Typography sx={{ fontSize: 15, fontWeight: 800, color: 'var(--vm-primary-400)', mb: 1, overflowWrap: 'anywhere' }}>{format(d.value)}</Typography>

                            {/* Probability bar */}
                            <Box sx={{ mb: 1 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                                <Typography sx={{ fontSize: 9, color: 'var(--vm-text-muted)' }}>Probability</Typography>
                                <Typography sx={{ fontSize: 9, fontWeight: 700, color: stage.color }}>{d.probability}%</Typography>
                              </Box>
                              <Box sx={{ height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,.06)', overflow: 'hidden' }}>
                                <Box sx={{ height: '100%', borderRadius: 2, width: `${d.probability}%`, bgcolor: stage.color, transition: 'width .4s ease' }} />
                              </Box>
                            </Box>

                            {/* Contact & date */}
                            {contact && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                                <Avatar sx={{ width: 20, height: 20, fontSize: 8, bgcolor: `${getContactColor(contact.contactType)}22`, color: getContactColor(contact.contactType), fontWeight: 700 }}>
                                  {contact.name.charAt(0)}
                                </Avatar>
                                <Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{contact.name}</Typography>
                              </Box>
                            )}
                            {d.expectedCloseDate && (
                              <Typography sx={{ fontSize: 10, color: 'var(--vm-text-muted)', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Calendar size={10} /> {formatDate(d.expectedCloseDate)}
                              </Typography>
                            )}

                            {/* Stage advancement */}
                            <Box sx={{ mt: 1.25, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                              {stageIdx > 0 && (() => {
                                const prev = DEAL_STAGES[stageIdx - 1];
                                return (
                                  <Chip size="small" label={`← ${prev.label}`} onClick={() => updateDealStage(d.id, prev.value)}
                                    sx={{ fontSize: 8, bgcolor: `${prev.color}15`, color: prev.color, cursor: 'pointer', height: 18, '&:hover': { bgcolor: `${prev.color}30` } }} />
                                );
                              })()}
                              {stageIdx < DEAL_STAGES.length - 1 && (() => {
                                const next = DEAL_STAGES[stageIdx + 1];
                                return (
                                  <Chip size="small" label={`${next.label} →`} onClick={() => updateDealStage(d.id, next.value)}
                                    sx={{ fontSize: 8, bgcolor: `${next.color}15`, color: next.color, cursor: 'pointer', height: 18, '&:hover': { bgcolor: `${next.color}30` } }} />
                                );
                              })()}
                            </Box>
                          </Card>
                        );
                      })}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </>
        )
      )}

      {/* Activity Tab */}
      {tab === 2 && (
        loading ? <Loading /> : activities.length === 0 ? <Empty icon={Calendar} text="No activities yet" /> : (
          <Card sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3 }}>
            {activities.map((a, idx) => {
              const Icon = ACTIVITY_ICONS[a.type] || Calendar;
              return (
                <Box key={a.id} sx={{ display: 'flex', gap: 2, p: { xs: 1.5, sm: 2 }, borderBottom: idx < activities.length - 1 ? '1px solid var(--vm-border-subtle)' : 'none', '&:hover': { bgcolor: 'rgba(255,255,255,.02)' } }}>
                  <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: 'var(--vm-bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={16} color="var(--vm-primary-400)" />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25, flexWrap: 'wrap' }}>
                      <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'var(--vm-text-primary)', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                        {contacts.find(c => c.id === a.contactId)?.name || 'Unknown'}
                      </Typography>
                      <Chip label={a.type} size="small" sx={{ bgcolor: 'var(--vm-bg-tertiary)', color: 'var(--vm-text-muted)', fontSize: 9, height: 20 }} />
                    </Box>
                    <Typography sx={{ fontSize: 13, color: 'var(--vm-text-secondary)', mb: 0.5, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{a.description}</Typography>
                    <Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)' }}>{formatDate(a.createdAt)} by {a.createdBy}</Typography>
                  </Box>
                  <Tooltip title="Delete"><IconButton size="small" sx={{ color: '#ef444488', flexShrink: 0 }} onClick={() => deleteActivity(a.id)}><Trash2 size={13} /></IconButton></Tooltip>
                </Box>
              );
            })}
          </Card>
        )
      )}

      {/* Tasks Tab */}
      {tab === 3 && (
        loading ? <Loading /> : tasks.length === 0 ? <Empty icon={ListChecks} text="No tasks yet" /> : (
          <Card sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, overflow: 'hidden' }}>
            {tasks.map((t, idx) => (
              <Box key={t.id} sx={{ display: 'flex', alignItems: 'center', px: { xs: 1.5, sm: 2.5 }, py: 1.25, borderBottom: idx < tasks.length - 1 ? '1px solid var(--vm-border-subtle)' : 'none', gap: 1.5, '&:hover': { bgcolor: 'rgba(255,255,255,.02)' } }}>
                <Box sx={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${t.status === 'done' ? '#22c55e' : t.status === 'in_progress' ? '#f59e0b' : 'rgba(255,255,255,.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                  onClick={() => updateTaskStatus(t.id, t.status === 'done' ? 'pending' : 'done')}>
                  {t.status === 'done' && <CheckCircle size={14} color="#22c55e" />}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: t.status === 'done' ? 400 : 600, color: t.status === 'done' ? 'var(--vm-text-muted)' : 'var(--vm-text-primary)', textDecoration: t.status === 'done' ? 'line-through' : 'none', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{t.title}</Typography>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.25 }}>
                    {t.assignedTo && <Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)', overflowWrap: 'anywhere' }}><Users size={11} style={{ marginRight: 2, verticalAlign: -1 }} />{t.assignedTo}</Typography>}
                    {t.dueDate && <Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)' }}><Calendar size={11} style={{ marginRight: 2, verticalAlign: -1 }} />{formatDate(t.dueDate)}</Typography>}
                    <Chip label={t.status.replace('_', ' ')} size="small" sx={{ bgcolor: t.status === 'done' ? 'rgba(34,197,94,.12)' : t.status === 'in_progress' ? 'rgba(245,158,11,.12)' : 'rgba(148,163,184,.12)', color: t.status === 'done' ? '#22c55e' : t.status === 'in_progress' ? '#f59e0b' : '#94a3b8', fontSize: 9, height: 18 }} />
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.25, flexShrink: 0 }}>
                  <Tooltip title="Edit"><IconButton size="small" sx={{ color: 'var(--vm-text-muted)' }} onClick={() => setTaskForm(t)}><Edit3 size={13} /></IconButton></Tooltip>
                  <Tooltip title="Delete"><IconButton size="small" sx={{ color: '#ef444488' }} onClick={() => deleteTask(t.id)}><Trash2 size={13} /></IconButton></Tooltip>
                </Box>
              </Box>
            ))}
          </Card>
        )
      )}

      {/* Contact Dialog */}
      <Dialog open={!!contactForm} onClose={() => setContactForm(null)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: 'var(--vm-bg-secondary)', borderRadius: 3, border: '1px solid var(--vm-border-subtle)' } }}>
        <DialogTitle sx={{ borderBottom: '1px solid var(--vm-border-subtle)', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <UserPlus size={20} color="var(--vm-primary-400)" />
          <Typography sx={{ fontWeight: 700 }}>{contactForm?.id ? 'Edit' : 'New'} Contact</Typography>
          <IconButton size="small" onClick={() => setContactForm(null)} sx={{ ml: 'auto', color: 'var(--vm-text-muted)' }}><X size={18} /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 4, mt: 1 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <TextField size="small" label="Full Name" value={contactForm?.name || ''} onChange={e => setContactForm({ ...contactForm, name: e.target.value })}
              sx={{ gridColumn: { xs: '1', sm: '1 / -1' }, input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
            <TextField size="small" label="Email" value={contactForm?.email || ''} onChange={e => setContactForm({ ...contactForm, email: e.target.value })}
              sx={{ input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
            <TextField size="small" label="Phone" value={contactForm?.phone || ''} onChange={e => setContactForm({ ...contactForm, phone: e.target.value })}
              sx={{ input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
            <TextField size="small" label="Company" value={contactForm?.company || ''} onChange={e => setContactForm({ ...contactForm, company: e.target.value })}
              sx={{ input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
            <TextField size="small" label="Job Title" value={contactForm?.jobTitle || ''} onChange={e => setContactForm({ ...contactForm, jobTitle: e.target.value })}
              sx={{ input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
            <FormControl size="small">
              <InputLabel sx={{ color: 'var(--vm-text-muted)' }}>Type</InputLabel>
              <Select value={contactForm?.contactType || 'lead'} label="Type" onChange={e => setContactForm({ ...contactForm, contactType: e.target.value })}
                sx={{ color: 'var(--vm-text-primary)', '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }}>
                {CONTACT_TYPES.map(t => <MenuItem key={t.value} value={t.value} sx={{ textTransform: 'capitalize' }}>{t.label}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField size="small" label="Source" value={contactForm?.source || ''} onChange={e => setContactForm({ ...contactForm, source: e.target.value })}
              sx={{ input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
            <TextField size="small" label="Notes" multiline rows={3} value={contactForm?.notes || ''} onChange={e => setContactForm({ ...contactForm, notes: e.target.value })}
              sx={{ gridColumn: { xs: '1', sm: '1 / -1' }, textarea: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
          </Box>
        </DialogContent>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, p: 2.5, pt: 0 }}>
          <GradientButton variant="ghost" size="sm" onClick={() => setContactForm(null)}>Cancel</GradientButton>
          <GradientButton variant="primary" size="sm" disabled={saving || !contactForm?.name} onClick={saveContact}>
            {saving ? <CircularProgress size={14} /> : contactForm?.id ? 'Update' : 'Create'}
          </GradientButton>
        </Box>
      </Dialog>

      {/* Deal Dialog */}
      <Dialog open={!!dealForm} onClose={() => setDealForm(null)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: 'var(--vm-bg-secondary)', borderRadius: 3, border: '1px solid var(--vm-border-subtle)' } }}>
        <DialogTitle sx={{ borderBottom: '1px solid var(--vm-border-subtle)', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <DollarSign size={20} color="var(--vm-primary-400)" />
          <Typography sx={{ fontWeight: 700 }}>{dealForm?.id ? 'Edit' : 'New'} Deal</Typography>
          <IconButton size="small" onClick={() => setDealForm(null)} sx={{ ml: 'auto', color: 'var(--vm-text-muted)' }}><X size={18} /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 4, mt: 1 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <TextField size="small" label="Title" value={dealForm?.title || ''} onChange={e => setDealForm({ ...dealForm, title: e.target.value })}
              sx={{ gridColumn: { xs: '1', sm: '1 / -1' }, input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
            <FormControl size="small">
              <InputLabel sx={{ color: 'var(--vm-text-muted)' }}>Contact</InputLabel>
              <Select value={dealForm?.contactId || ''} label="Contact" onChange={e => setDealForm({ ...dealForm, contactId: e.target.value })}
                sx={{ color: 'var(--vm-text-primary)', '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }}>
                {contacts.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField size="small" label="Value" type="number" value={dealForm?.value || ''} onChange={e => setDealForm({ ...dealForm, value: parseFloat(e.target.value) || 0 })}
              sx={{ input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
            <FormControl size="small">
              <InputLabel sx={{ color: 'var(--vm-text-muted)' }}>Stage</InputLabel>
              <Select value={dealForm?.stage || 'prospecting'} label="Stage" onChange={e => setDealForm({ ...dealForm, stage: e.target.value })}
                sx={{ color: 'var(--vm-text-primary)', '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }}>
                {DEAL_STAGES.map(s => <MenuItem key={s.value} value={s.value} sx={{ textTransform: 'capitalize' }}>{s.label}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField size="small" label="Probability %" type="number" value={dealForm?.probability || 10} onChange={e => setDealForm({ ...dealForm, probability: parseInt(e.target.value) || 0 })}
              sx={{ input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
            <DatePicker label="Expected Close" format="dd/MM/yyyy" value={dealForm?.expectedCloseDate ? new Date(dealForm.expectedCloseDate) : null}
              onChange={(date) => setDealForm({ ...dealForm, expectedCloseDate: date ? date.toISOString().split('T')[0] : '' })}
              slotProps={{ textField: { size: 'small', sx: { input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } } } }} />
          </Box>
        </DialogContent>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, p: 2.5, pt: 0 }}>
          <GradientButton variant="ghost" size="sm" onClick={() => setDealForm(null)}>Cancel</GradientButton>
          <GradientButton variant="primary" size="sm" disabled={saving || !dealForm?.title || !dealForm?.contactId} onClick={saveDeal}>
            {saving ? <CircularProgress size={14} /> : dealForm?.id ? 'Update' : 'Create'}
          </GradientButton>
        </Box>
      </Dialog>

      {/* Activity Dialog */}
      <Dialog open={activityForm.open} onClose={() => setActivityForm({ open: false, type: 'note', contactId: '', description: '' })} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: 'var(--vm-bg-secondary)', borderRadius: 3, border: '1px solid var(--vm-border-subtle)' } }}>
        <DialogTitle sx={{ borderBottom: '1px solid var(--vm-border-subtle)', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {activityForm.type === 'call' ? <PhoneCall size={20} color="var(--vm-primary-400)" /> : <Mail size={20} color="var(--vm-primary-400)" />}
          <Typography sx={{ fontWeight: 700, textTransform: 'capitalize' }}>Log {activityForm.type}</Typography>
          <IconButton size="small" onClick={() => setActivityForm({ open: false, type: 'note', contactId: '', description: '' })} sx={{ ml: 'auto', color: 'var(--vm-text-muted)' }}><X size={18} /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 4, mt: 1 }}>
          {activityForm.contactId && contacts.find(c => c.id === activityForm.contactId) && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, p: 1.5, borderRadius: 2, bgcolor: 'var(--vm-bg-tertiary)' }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'var(--vm-primary-600)', fontSize: 12, fontWeight: 700 }}>
                {contacts.find(c => c.id === activityForm.contactId)!.name.charAt(0)}
              </Avatar>
              <Box><Typography sx={{ fontSize: 13, fontWeight: 600, color: 'var(--vm-text-primary)', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{contacts.find(c => c.id === activityForm.contactId)!.name}</Typography></Box>
            </Box>
          )}
          <TextField fullWidth multiline rows={4} label="Description" value={activityForm.description} onChange={e => setActivityForm({ ...activityForm, description: e.target.value })}
            sx={{ textarea: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
        </DialogContent>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, p: 2.5, pt: 0 }}>
          <GradientButton variant="ghost" size="sm" onClick={() => setActivityForm({ open: false, type: 'note', contactId: '', description: '' })}>Cancel</GradientButton>
          <GradientButton variant="primary" size="sm" disabled={saving || !activityForm.description} onClick={saveActivity}>
            {saving ? <CircularProgress size={14} /> : 'Log Activity'}
          </GradientButton>
        </Box>
      </Dialog>

      {/* Task Dialog */}
      <Dialog open={!!taskForm} onClose={() => setTaskForm(null)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: 'var(--vm-bg-secondary)', borderRadius: 3, border: '1px solid var(--vm-border-subtle)' } }}>
        <DialogTitle sx={{ borderBottom: '1px solid var(--vm-border-subtle)', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ListChecks size={20} color="var(--vm-primary-400)" />
          <Typography sx={{ fontWeight: 700 }}>{taskForm?.id ? 'Edit' : 'New'} Task</Typography>
          <IconButton size="small" onClick={() => setTaskForm(null)} sx={{ ml: 'auto', color: 'var(--vm-text-muted)' }}><X size={18} /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 4, mt: 1 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <TextField size="small" label="Title" value={taskForm?.title || ''} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
              sx={{ gridColumn: { xs: '1', sm: '1 / -1' }, input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
            <TextField size="small" label="Description" multiline rows={2} value={taskForm?.description || ''} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })}
              sx={{ gridColumn: { xs: '1', sm: '1 / -1' }, textarea: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
            <FormControl size="small">
              <InputLabel sx={{ color: 'var(--vm-text-muted)' }}>Status</InputLabel>
              <Select value={taskForm?.status || 'pending'} label="Status" onChange={e => setTaskForm({ ...taskForm, status: e.target.value })}
                sx={{ color: 'var(--vm-text-primary)', '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }}>
                {['pending', 'in_progress', 'done'].map(s => <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>{s.replace('_', ' ')}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small">
              <InputLabel sx={{ color: 'var(--vm-text-muted)' }}>Assigned To</InputLabel>
              <Select value={taskForm?.assignedTo || ''} label="Assigned To" onChange={e => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
                sx={{ color: 'var(--vm-text-primary)', '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }}>
                <MenuItem value=""><em>Unassigned</em></MenuItem>
                {assignableUsers.length > 0 && [
                  <ListSubheader key="header" sx={{ bgcolor: 'var(--vm-bg-secondary)', color: 'var(--vm-text-muted)', fontSize: 10, lineHeight: '24px' }}>TEAM MEMBERS</ListSubheader>,
                  ...assignableUsers.map(u => (
                    <MenuItem key={u.email} value={u.name} sx={{ gap: 1 }}>
                      <Avatar sx={{ width: 22, height: 22, fontSize: 9, bgcolor: 'var(--vm-primary-600)' }}>{u.name[0]}</Avatar>
                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Typography sx={{ fontSize: 13, lineHeight: 1.2 }}>{u.name}</Typography>
                        <Typography sx={{ fontSize: 10, color: 'var(--vm-text-muted)', lineHeight: 1.2 }}>{u.email}</Typography>
                      </Box>
                    </MenuItem>
                  )),
                ]}
              </Select>
            </FormControl>
            <DatePicker label="Due Date" format="dd/MM/yyyy" value={taskForm?.dueDate ? new Date(taskForm.dueDate) : null}
              onChange={(date) => setTaskForm({ ...taskForm, dueDate: date ? date.toISOString().split('T')[0] : '' })}
              slotProps={{ textField: { size: 'small', sx: { input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } } } }} />
          </Box>
        </DialogContent>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, p: 2.5, pt: 0 }}>
          <GradientButton variant="ghost" size="sm" onClick={() => setTaskForm(null)}>Cancel</GradientButton>
          <GradientButton variant="primary" size="sm" disabled={saving || !taskForm?.title} onClick={saveTask}>
            {saving ? <CircularProgress size={14} /> : taskForm?.id ? 'Update' : 'Create'}
          </GradientButton>
        </Box>
      </Dialog>

      {/* Email Compose Dialog */}
      <Dialog open={!!emailForm} onClose={() => { setEmailForm(null); setEmailAttachments([]); }} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: 'var(--vm-bg-secondary)', borderRadius: 3, border: '1px solid var(--vm-border-subtle)' } }}>
        <DialogTitle sx={{ borderBottom: '1px solid var(--vm-border-subtle)', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Mail size={20} color="var(--vm-primary-400)" />
          <Typography sx={{ fontWeight: 700 }}>Send Email</Typography>
          <IconButton size="small" onClick={() => { setEmailForm(null); setEmailAttachments([]); }} sx={{ ml: 'auto', color: 'var(--vm-text-muted)' }}><X size={18} /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 4, mt: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField size="small" label="To" value={emailForm?.contactEmail || ''} InputProps={{ readOnly: true }}
              sx={{ input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
            <TextField size="small" label="Subject" value={emailForm?.subject || ''} onChange={e => setEmailForm({ ...emailForm!, subject: e.target.value })}
              sx={{ input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
            <TextField size="small" label="Message" multiline rows={6} value={emailForm?.body || ''} onChange={e => setEmailForm({ ...emailForm!, body: e.target.value })}
              sx={{ textarea: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />

            {/* Attachment input */}
            <input ref={fileInputRef} type="file" multiple onChange={handleFileAttach} style={{ display: 'none' }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <GradientButton variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Plus size={12} style={{ marginRight: 4 }} /> Attach Files
              </GradientButton>
              {emailAttachments.length > 0 && (
                <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>
                  {emailAttachments.length} file{emailAttachments.length !== 1 ? 's' : ''} attached
                </Typography>
              )}
            </Box>
            {emailAttachments.length > 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {emailAttachments.map((att, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 0.75, bgcolor: 'var(--vm-bg-tertiary)', borderRadius: 1.5, border: '1px solid var(--vm-border-subtle)' }}>
                    <Typography sx={{ flex: 1, fontSize: 12, color: 'var(--vm-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</Typography>
                    <IconButton size="small" onClick={() => removeAttachment(i)} sx={{ color: '#ef444488' }}><X size={14} /></IconButton>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </DialogContent>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, p: 2.5, pt: 0 }}>
          <GradientButton variant="ghost" size="sm" onClick={() => { setEmailForm(null); setEmailAttachments([]); }}>Cancel</GradientButton>
          <GradientButton variant="primary" size="sm" disabled={sendingEmail || !emailForm?.subject || !emailForm?.body} onClick={sendEmail}>
            {sendingEmail ? <CircularProgress size={14} /> : 'Send Email'}
          </GradientButton>
        </Box>
      </Dialog>
      {dialog}
    </Box>
  );
}

function Loading() {
  return <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 6, justifyContent: 'center' }}><CircularProgress size={18} sx={{ color: 'var(--vm-primary-400)' }} /><Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 13 }}>Loading...</Typography></Box>;
}

function Empty({ icon: Icon, text }: { icon: typeof Users; text: string }) {
  return (
    <Box sx={{ textAlign: 'center', py: 6 }}>
      <Icon size={36} color="var(--vm-text-muted)" />
      <Typography sx={{ mt: 1, color: 'var(--vm-text-muted)', fontSize: 14 }}>{text}</Typography>
    </Box>
  );
}
