import { useCallback, useEffect, useState } from 'react';
import { Box, Typography, Dialog, DialogTitle, DialogContent, TextField, IconButton, CircularProgress, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { GradientButton } from '../../components/shared/buttons';
import { graphqlRequest } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useBusiness } from '../../contexts/BusinessContext';
import { Calendar, Plus, Trash2, RefreshCw, X, Building2 } from 'lucide-react';

interface CalendarAccount {
  id: string; email: string; provider: string; caldavUrl: string; syncEnabled: boolean; lastSyncedAt: string | null;
}

interface CalendarEvent {
  id: string; title: string; description: string; location: string; startTime: string; endTime: string; isAllDay: boolean; status: string; contactId: string | null;
}

export function CalendarPage() {
  const { user } = useAuth();
  const { selectedBusiness } = useBusiness();
  const bizId = selectedBusiness?.id;

  const [accounts, setAccounts] = useState<CalendarAccount[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConnForm, setShowConnForm] = useState(false);
  const [connEmail, setConnEmail] = useState('');
  const [connUrl, setConnUrl] = useState('');
  const [connUser, setConnUser] = useState('');
  const [connPass, setConnPass] = useState('');
  const [connProvider, setConnProvider] = useState('caldav');
  const [saving, setSaving] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const q = useCallback(async <T,>(query: string, vars?: Record<string, unknown>) => graphqlRequest<T>(query, vars), []);

  const loadAll = useCallback(async () => {
    if (!bizId) return;
    setLoading(true);
    try {
      const now = new Date();
      const from = new Date(now.getTime() + weekOffset * 7 * 86400000);
      from.setDate(from.getDate() - from.getDay());
      const to = new Date(from.getTime() + 7 * 86400000);

      const [acctData, evData] = await Promise.all([
        q<{ calendarAccounts: CalendarAccount[] }>('query Q($b:ID!){calendarAccounts(businessId:$b){id email provider caldavUrl syncEnabled lastSyncedAt}}', { b: bizId }),
        q<{ calendarEvents: CalendarEvent[] }>('query Q($b:ID!,$f:String!,$t:String!){calendarEvents(businessId:$b from:$f to:$t){id title description location startTime endTime isAllDay status contactId}}', { b: bizId, f: from.toISOString(), t: to.toISOString() }),
      ]);
      setAccounts(acctData.calendarAccounts);
      setEvents(evData.calendarEvents);
    } catch { /* ignore */ }
    setLoading(false);
  }, [bizId, q, weekOffset]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const saveConnection = async () => {
    if (!user || !bizId || !connEmail) return;
    setSaving(true);
    try {
      let url = connUrl;
      if (connProvider === 'icloud') url = `https://caldav.icloud.com/`;
      else if (connProvider === 'fastmail') url = `https://caldav.fastmail.com/`;

      await q('mutation M($u:ID!,$b:ID!,$e:String!,$p:String!,$c:String!,$n:String!,$w:String!){createCalendarAccount(userId:$u businessId:$b email:$e provider:$p caldavUrl:$c username:$n password:$w){id}}', {
        u: user.id, b: bizId, e: connEmail, p: connProvider, c: url || connUrl,
        n: connUser || connEmail, w: connPass,
      });
      setShowConnForm(false);
      setConnEmail(''); setConnUrl(''); setConnUser(''); setConnPass('');
      loadAll();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const deleteAccount = async (id: string) => {
    if (!user || !confirm('Remove this calendar?')) return;
    await q('mutation M($i:ID!,$u:ID!){deleteCalendarAccount(id:$i userId:$u)}', { i: id, u: user.id });
    loadAll();
  };

  const syncNow = async (id: string) => {
    setSyncingId(id);
    await q('mutation M($i:ID!){syncCalendarAccount(id:$i)}', { i: id });
    setTimeout(() => { setSyncingId(null); loadAll(); }, 3000);
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const now = new Date();
  const weekStart = new Date(now.getTime() + weekOffset * 7 * 86400000);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const getEventsForDay = (day: Date) => events.filter(e => {
    const ed = new Date(e.startTime);
    return ed.getDate() === day.getDate() && ed.getMonth() === day.getMonth() && ed.getFullYear() === day.getFullYear();
  });

  if (!bizId) return <Box sx={{ p: 4, textAlign: 'center', color: 'var(--vm-text-muted)' }}><Building2 size={40} /><Typography sx={{ mt: 1 }}>Select a business</Typography></Box>;

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', mb: 3, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1.5, sm: 0 } }}>
        <Box>
          <Typography sx={{ fontSize: { xs: 20, sm: 24, md: 28 }, fontWeight: 800, color: 'var(--vm-text-primary)' }}>Calendar</Typography>
          <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)' }}>{accounts.length} calendars · {events.length} events this week</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <GradientButton variant="ghost" size="sm" onClick={() => setWeekOffset(w => w - 1)}>← Prev</GradientButton>
          <GradientButton variant="ghost" size="sm" onClick={() => setWeekOffset(0)}>Today</GradientButton>
          <GradientButton variant="ghost" size="sm" onClick={() => setWeekOffset(w => w + 1)}>Next →</GradientButton>
          <GradientButton variant="primary" size="sm" startIcon={<Plus size={14} />} onClick={() => setShowConnForm(true)}>Connect</GradientButton>
        </Box>
      </Box>

      {/* Calendar accounts */}
      {accounts.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1, mb: 2, overflowX: 'auto', pb: 0.5 }}>
          {accounts.map(a => (
            <Box key={a.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1.25, py: 0.5, borderRadius: 2, bgcolor: 'rgba(16,185,129,.08)', border: '1px solid rgba(16,185,129,.15)' }}>
              <Calendar size={14} color="#10b981" />
              <Typography sx={{ fontSize: 12, color: 'var(--vm-text-primary)' }}>{a.email}</Typography>
              <IconButton size="small" sx={{ color: '#ef444488', p: 0.25 }} onClick={() => deleteAccount(a.id)}><Trash2 size={12} /></IconButton>
              <IconButton size="small" sx={{ color: 'var(--vm-text-muted)', p: 0.25 }} onClick={() => syncNow(a.id)} disabled={syncingId === a.id}>
                {syncingId === a.id ? <CircularProgress size={12} /> : <RefreshCw size={12} />}
              </IconButton>
            </Box>
          ))}
        </Box>
      )}

      {/* Week grid */}
      {loading ? <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress size={24} sx={{ color: 'var(--vm-primary-400)' }} /></Box> : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(7, 1fr)' }, gap: { xs: 1, sm: 1.5 } }}>
          {days.map((day, idx) => {
            const dayEvents = getEventsForDay(day);
            const isToday = day.toDateString() === new Date().toDateString();
            return (
              <Box key={idx} sx={{
                bgcolor: isToday ? 'rgba(16,185,129,.06)' : 'var(--vm-bg-secondary)',
                border: isToday ? '1px solid rgba(16,185,129,.3)' : '1px solid var(--vm-border-subtle)',
                borderRadius: 2.5, p: { xs: 1, sm: 1.25 }, minHeight: { xs: 80, sm: 140 },
              }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: isToday ? '#10b981' : 'var(--vm-text-primary)', mb: 0.5 }}>
                  {weekDays[day.getDay()]} {day.getDate()}
                </Typography>
                {dayEvents.map(ev => (
                  <Box key={ev.id} sx={{ mb: 0.5, p: 0.5, borderRadius: 1, bgcolor: 'rgba(16,185,129,.1)', cursor: 'pointer', '&:hover': { bgcolor: 'rgba(16,185,129,.18)' } }}>
                    <Typography sx={{ fontSize: 10.5, fontWeight: 600, color: 'var(--vm-text-primary)', lineHeight: 1.3 }}>{ev.title}</Typography>
                    {!ev.isAllDay && (
                      <Typography sx={{ fontSize: 9, color: 'var(--vm-text-muted)' }}>
                        {new Date(ev.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Box>
            );
          })}
        </Box>
      )}

      <Dialog open={showConnForm} onClose={() => setShowConnForm(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: 'var(--vm-bg-secondary)', borderRadius: 3, border: '1px solid var(--vm-border-subtle)' } }}>
        <DialogTitle sx={{ borderBottom: '1px solid var(--vm-border-subtle)', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Calendar size={20} color="var(--vm-primary-400)" />
          <Typography sx={{ fontWeight: 700 }}>Connect Calendar</Typography>
          <IconButton size="small" onClick={() => setShowConnForm(false)} sx={{ ml: 'auto', color: 'var(--vm-text-muted)' }}><X size={18} /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3.5 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl size="small" fullWidth>
              <InputLabel sx={{ color: 'var(--vm-text-muted)' }}>Provider</InputLabel>
              <Select value={connProvider} label="Provider" onChange={e => setConnProvider(e.target.value)}
                sx={{ color: 'var(--vm-text-primary)', '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }}>
                <MenuItem value="caldav">Custom CalDAV</MenuItem>
                <MenuItem value="icloud">iCloud</MenuItem>
                <MenuItem value="fastmail">FastMail</MenuItem>
              </Select>
            </FormControl>
            <TextField size="small" label="Email" value={connEmail} onChange={e => setConnEmail(e.target.value)}
              sx={{ input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
            {connProvider === 'caldav' && (
              <TextField size="small" label="CalDAV URL" value={connUrl} onChange={e => setConnUrl(e.target.value)} placeholder="https://example.com/caldav/"
                sx={{ input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
            )}
            <TextField size="small" label="Username (or app password)" value={connUser} onChange={e => setConnUser(e.target.value)}
              sx={{ input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
            <TextField size="small" label="Password" type="password" value={connPass} onChange={e => setConnPass(e.target.value)}
              sx={{ input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
          </Box>
        </DialogContent>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, p: 2.5, pt: 0 }}>
          <GradientButton variant="ghost" size="sm" onClick={() => setShowConnForm(false)}>Cancel</GradientButton>
          <GradientButton variant="primary" size="sm" disabled={saving || !connEmail} onClick={saveConnection}>
            {saving ? <CircularProgress size={14} /> : 'Connect'}
          </GradientButton>
        </Box>
      </Dialog>
    </Box>
  );
}
