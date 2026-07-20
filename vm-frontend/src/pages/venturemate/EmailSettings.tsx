import { CardSkeleton } from '../../components/shared/Skeleton';
import { useCallback, useEffect, useState } from 'react';
import { Box, Typography, Card, Chip, TextField, IconButton, Tooltip, CircularProgress, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { GradientButton } from '../../components/shared/buttons';
import { Modal } from '../../components/shared/Modal';
import { graphqlRequest } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useBusiness } from '../../contexts/BusinessContext';
import { Mail, Plus, Trash2, RefreshCw, CheckCircle, XCircle, Building2 } from 'lucide-react';

interface EmailAccount {
  id: string;
  userId: string;
  businessId: string;
  email: string;
  provider: string;
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
  syncEnabled: boolean;
  lastSyncedAt: string | null;
  createdAt: string;
  imapUsername?: string;
  imapPassword?: string;
  smtpUsername?: string;
  smtpPassword?: string;
}

const PROVIDERS = [
  { value: 'gmail', label: 'Gmail', imapHost: 'imap.gmail.com', imapPort: 993, smtpHost: 'smtp.gmail.com', smtpPort: 587 },
  { value: 'outlook', label: 'Outlook', imapHost: 'outlook.office365.com', imapPort: 993, smtpHost: 'smtp.office365.com', smtpPort: 587 },
  { value: 'yahoo', label: 'Yahoo', imapHost: 'imap.mail.yahoo.com', imapPort: 993, smtpHost: 'smtp.mail.yahoo.com', smtpPort: 587 },
  { value: 'imap', label: 'Custom IMAP', imapHost: '', imapPort: 993, smtpHost: '', smtpPort: 587 },
];

export function EmailSettingsPage() {
  const { user } = useAuth();
  const { selectedBusiness } = useBusiness();
  const bizId = selectedBusiness?.id;

  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Partial<EmailAccount> | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);

  const q = useCallback(async <T,>(query: string, vars?: Record<string, unknown>) => graphqlRequest<T>(query, vars), []);

  const load = useCallback(async () => {
    if (!bizId) return;
    setLoading(true);
    try {
      const d = await q<{ emailAccounts: EmailAccount[] }>('query Q($b:ID!){emailAccounts(businessId:$b){id userId businessId email provider imapHost imapPort syncEnabled lastSyncedAt createdAt}}', { b: bizId });
      setAccounts(d.emailAccounts);
    } catch { /* ignore */ }
    setLoading(false);
  }, [bizId, q]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!bizId || !user || !form?.email) return;
    setSaving(true);
    try {
      await q('mutation M($u:ID!,$b:ID!,$e:String!,$p:String,$h:String,$t:Int,$n:String,$w:String,$s:Int,$m:String,$x:String){createEmailAccount(userId:$u businessId:$b email:$e provider:$p imapHost:$h imapPort:$t imapUsername:$n imapPassword:$w smtpHost:$s smtpPort:$m smtpUsername:$x smtpPassword:$x){id}}', {
        u: user.id, b: bizId, e: form.email, p: form.provider || 'imap',
        h: form.imapHost || '', t: form.imapPort || 993,
        n: form.imapUsername || form.email, w: form.imapPassword || '',
        s: form.smtpHost || '', m: form.smtpPort || 587,
        x: form.smtpUsername || form.email,
      });
      setForm(null);
      load();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const deleteAccount = async (id: string) => {
    if (!user || !confirm('Remove this email account?')) return;
    await q('mutation M($i:ID!,$u:ID!){deleteEmailAccount(id:$i userId:$u)}', { i: id, u: user.id });
    load();
  };

  const syncNow = async (id: string) => {
    setSyncing(id);
    await q('mutation M($i:ID!){syncEmailAccount(id:$i)}', { i: id });
    setTimeout(() => { setSyncing(null); load(); }, 3000);
  };

  const handleProviderChange = (provider: string) => {
    const p = PROVIDERS.find(x => x.value === provider);
    setForm({
      ...form,
      provider,
      imapHost: p?.imapHost || '',
      imapPort: p?.imapPort || 993,
      smtpHost: p?.smtpHost || '',
      smtpPort: p?.smtpPort || 587,
    });
  };

  if (!bizId) return <Box sx={{ p: 4, textAlign: 'center', color: 'var(--vm-text-muted)' }}><Building2 size={40} /><Typography sx={{ mt: 1 }}>Select a business</Typography></Box>;

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', mb: 3, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1.5, sm: 0 } }}>
        <Box>
          <Typography sx={{ fontSize: { xs: 20, sm: 24, md: 28 }, fontWeight: 800, color: 'var(--vm-text-primary)' }}>Email Settings</Typography>
          <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)' }}>Connect email accounts to sync with CRM contacts</Typography>
        </Box>
        <GradientButton variant="primary" size="sm" startIcon={<Plus size={14} />} onClick={() => setForm({ email: '', provider: 'gmail', imapPort: 993, smtpPort: 587 })}>Add Email Account</GradientButton>
      </Box>

      {loading ? <CardSkeleton count={4} type='card' /> : accounts.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6, color: 'var(--vm-text-muted)' }}>
          <Mail size={36} />
          <Typography sx={{ mt: 1, fontSize: 14 }}>No email accounts connected</Typography>
          <Typography sx={{ fontSize: 12, mt: 0.5 }}>Connect an email account to sync emails with your contacts</Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {accounts.map(a => (
            <Card key={a.id} sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 2.5, p: { xs: 1.5, sm: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 40, height: 40, borderRadius: 1.5, bgcolor: 'rgba(59,130,246,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Mail size={18} color="#3b82f6" />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'var(--vm-text-primary)' }}>{a.email}</Typography>
                    <Chip label={a.provider} size="small" sx={{ bgcolor: 'rgba(16,185,129,.12)', color: '#10b981', fontSize: 9, height: 18 }} />
                    {a.lastSyncedAt ? <CheckCircle size={14} color="#22c55e" /> : <XCircle size={14} color="#94a3b8" />}
                  </Box>
                  <Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)' }}>
                    {a.lastSyncedAt ? `Last synced: ${new Date(a.lastSyncedAt).toLocaleString()}` : 'Not yet synced'} · {a.imapHost}:{a.imapPort}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Tooltip title="Sync Now">
                    <IconButton size="small" sx={{ color: 'var(--vm-text-muted)' }} onClick={() => syncNow(a.id)} disabled={syncing === a.id}>
                      {syncing === a.id ? <CircularProgress size={14} /> : <RefreshCw size={15} />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Remove">
                    <IconButton size="small" sx={{ color: '#ef444488' }} onClick={() => deleteAccount(a.id)}><Trash2 size={15} /></IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </Card>
          ))}
        </Box>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title="Add Email Account" icon={<Mail size={20} />}
        actions={<><GradientButton variant="ghost" size="sm" onClick={() => setForm(null)}>Cancel</GradientButton>
          <GradientButton variant="primary" size="sm" disabled={saving || !form?.email} onClick={save}>
            {saving ? <CircularProgress size={14} /> : 'Connect'}
          </GradientButton></>}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <FormControl size="small" fullWidth>
            <InputLabel sx={{ color: 'var(--vm-text-muted)' }}>Provider</InputLabel>
            <Select value={form?.provider || 'gmail'} label="Provider" onChange={e => handleProviderChange(e.target.value)}
              sx={{ color: 'var(--vm-text-primary)', '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }}>
              {PROVIDERS.map(p => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField size="small" label="Email Address" value={form?.email || ''} onChange={e => setForm({ ...form, email: e.target.value })}
            sx={{ input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
          <TextField size="small" label="IMAP Password / App Password" type="password" value={form?.imapPassword || ''} onChange={e => setForm({ ...form, imapPassword: e.target.value, imapUsername: form?.imapUsername || form?.email || '' })}
            sx={{ input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }}
            helperText={form?.provider === 'gmail' ? 'Generate an App Password at myaccount.google.com/apppasswords (requires 2-Step Verification)' : form?.provider === 'outlook' ? 'Use your Microsoft account password or create an App Password' : form?.provider === 'yahoo' ? 'Generate an App Password at login.yahoo.com/account/security' : 'Contact your email provider for IMAP credentials'}
            FormHelperTextProps={{ sx: { color: 'var(--vm-text-muted)', fontSize: 11 } }} />
          {form?.provider === 'imap' && (
            <>
              <TextField size="small" label="IMAP Host" value={form?.imapHost || ''} onChange={e => setForm({ ...form, imapHost: e.target.value })}
                sx={{ input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
              <TextField size="small" label="SMTP Host" value={form?.smtpHost || ''} onChange={e => setForm({ ...form, smtpHost: e.target.value })}
                sx={{ input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
            </>
          )}
        </Box>
      </Modal>
    </Box>
  );
}
