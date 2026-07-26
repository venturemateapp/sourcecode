import { CardSkeleton } from '../../components/shared/Skeleton';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Typography, TextField, IconButton, CircularProgress, Select, MenuItem, FormControl, InputLabel, Tooltip, Avatar } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { GradientButton } from '../../components/shared/buttons';
import { Modal } from '../../components/shared/Modal';
import { graphqlRequest } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useBusiness } from '../../contexts/BusinessContext';
import { Calendar, Plus, Trash2, RefreshCw, Building2, ChevronLeft, ChevronRight, CheckSquare, Clock } from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  eachDayOfInterval,
} from 'date-fns';
import type { CrmTask } from '../../types/venturemate';
import { useConfirm } from '../../components/shared/useConfirm';

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
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<CrmTask[]>([]);
  const [eventForm, setEventForm] = useState<{ open: boolean; type: 'event' | 'task'; title: string; date: string; startTime: string; endTime: string; description: string; assignedTo: string }>({ open: false, type: 'event', title: '', date: '', startTime: '09:00', endTime: '10:00', description: '', assignedTo: '' });

  const assignableUsers = [
    ...(user ? [{ name: `${user.firstName} ${user.lastName}`.trim() || user.email, email: user.email }] : []),
    ...(selectedBusiness?.team?.filter(m => m.status === 'active').map(m => ({ name: m.name, email: m.email })) || []),
  ].filter((v, i, a) => a.findIndex(x => x.email === v.email) === i);

  const { confirmAction, dialog } = useConfirm();

  const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // --- Month navigation ---
  const nextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));
  const prevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const goToToday = () => setCurrentMonth(new Date());

  // --- Build the calendar grid days (42 cells: 6 weeks × 7 days) ---
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const q = useCallback(async <T,>(query: string, vars?: Record<string, unknown>) => graphqlRequest<T>(query, vars), []);

  const loadAll = useCallback(async () => {
    if (!bizId) return;
    setLoading(true);
    try {
      const from = startOfMonth(currentMonth);
      const to = endOfMonth(currentMonth);

      const [acctData, evData, taskData] = await Promise.allSettled([
        q<{ calendarAccounts: CalendarAccount[] }>('query Q($b:ID!){calendarAccounts(businessId:$b){id email provider caldavUrl syncEnabled lastSyncedAt}}', { b: bizId }),
        q<{ calendarEvents: CalendarEvent[] }>('query Q($b:ID!,$f:String!,$t:String!){calendarEvents(businessId:$b from:$f to:$t){id title description location startTime endTime isAllDay status contactId}}', { b: bizId, f: from.toISOString(), t: to.toISOString() }),
        q<{ crmTasks: CrmTask[] }>('query T($b:ID!){crmTasks(businessId:$b){id title description dueDate status}}', { b: bizId }),
      ]);
      if (acctData.status === 'fulfilled') setAccounts(acctData.value.calendarAccounts);
      if (evData.status === 'fulfilled') setEvents(evData.value.calendarEvents);
      if (taskData.status === 'fulfilled') setTasks(taskData.value.crmTasks);
    } catch { /* ignore */ }
    setLoading(false);
  }, [bizId, q, currentMonth]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const saveConnection = async () => {
    if (!user || !bizId || !connEmail) return;
    setSaving(true);
    try {
      let url = connUrl;
      if (connProvider === 'icloud') url = `https://caldav.icloud.com/`;
      else if (connProvider === 'fastmail') url = `https://caldav.fastmail.com/`;
      else if (connProvider === 'gmail') url = `https://apidata.googleusercontent.com/caldav/v2/`;
      else if (connProvider === 'outlook') url = `https://outlook.office365.com/caldav/`;
      else if (connProvider === 'yahoo') url = `https://caldav.calendar.yahoo.com/`;

      await q('mutation M($u:ID!,$b:ID!,$e:String!,$p:String!,$c:String!,$n:String!,$w:String!){createCalendarAccount(userId:$u businessId:$b email:$e provider:$p caldavUrl:$c username:$n password:$w){id}}', {
        u: user.id, b: bizId, e: connEmail, p: connProvider, c: url || connUrl,
        n: connUser || connEmail, w: connPass,
      });
      setShowConnForm(false);
      setConnEmail(''); setConnUrl(''); setConnUser(''); setConnPass('');
      await loadAll();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const deleteAccount = async (id: string) => {
    if (!user) return;
    confirmAction({ title: 'Remove Calendar', message: 'Are you sure you want to remove this calendar account?' }, async () => {
      await q('mutation M($i:ID!,$u:ID!){deleteCalendarAccount(id:$i userId:$u)}', { i: id, u: user.id });
      await loadAll();
    });
  };

  const syncNow = async (id: string) => {
    setSyncingId(id);
    await q('mutation M($i:ID!){syncCalendarAccount(id:$i)}', { i: id });
    setTimeout(() => { setSyncingId(null); loadAll(); }, 3000);
  };

  const saveEvent = async () => {
    if (!bizId || !user || !eventForm.title || !eventForm.date) return;
    setSaving(true);
    try {
      if (eventForm.type === 'event' && accounts.length > 0) {
        const startTime = new Date(`${eventForm.date}T${eventForm.startTime}:00`).toISOString();
        const endTime = new Date(`${eventForm.date}T${eventForm.endTime}:00`).toISOString();
        await q('mutation M($b:ID!,$a:ID!,$t:String!,$d:String,$s:String!,$e:String!,$i:Boolean){createCalendarEvent(businessId:$b accountId:$a title:$t description:$d startTime:$s endTime:$e isAllDay:$i){id}}', {
          b: bizId, a: accounts[0].id, t: eventForm.title, d: eventForm.description || '',
          s: startTime, e: endTime, i: false,
        });
      } else {
        await q('mutation M($b:ID!,$t:String!,$d:String,$s:String,$u:String){createCrmTask(businessId:$b title:$t description:$d status:$s assignedTo:$u){id}}', {
          b: bizId, t: eventForm.title, d: eventForm.description || '',
          s: eventForm.type === 'task' ? 'pending' : 'done', u: eventForm.assignedTo || user.id,
        });
      }
      setEventForm({ open: false, type: 'event', title: '', date: '', startTime: '09:00', endTime: '10:00', description: '', assignedTo: '' });
      await loadAll();
    } catch (err) {
      console.error('Failed to save:', err);
    }
    setSaving(false);
  };

  const getEventsForDay = (day: Date) => events.filter(e => {
    const ed = new Date(e.startTime);
    return isSameDay(ed, day);
  });

  const getTasksForDay = (day: Date) => tasks.filter(t => t.dueDate && isSameDay(new Date(t.dueDate), day));

  if (!bizId) return <Box sx={{ p: 4, textAlign: 'center', color: 'var(--vm-text-muted)' }}><Building2 size={40} /><Typography sx={{ mt: 1 }}>Select a business</Typography></Box>;

  const eventCount = events.length;
  const monthLabel = format(currentMonth, 'MMMM yyyy');

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', mb: 3, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1.5, sm: 0 } }}>
        <Box>
          <Typography sx={{ fontSize: { xs: 20, sm: 24, md: 28 }, fontWeight: 800, color: 'var(--vm-text-primary)' }}>Calendar</Typography>
          <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)' }}>{accounts.length} calendars · {eventCount + tasks.filter(t => t.dueDate && isSameMonth(new Date(t.dueDate), currentMonth)).length} items this month</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <GradientButton variant="ghost" size="sm" onClick={prevMonth}>
            <ChevronLeft size={16} />
          </GradientButton>
          <GradientButton variant="ghost" size="sm" onClick={goToToday}>Today</GradientButton>
          <GradientButton variant="ghost" size="sm" onClick={nextMonth}>
            <ChevronRight size={16} />
          </GradientButton>
          <GradientButton variant="outline" size="sm" startIcon={<CheckSquare size={14} />} onClick={() => setEventForm({ open: true, type: 'task', title: '', date: format(new Date(), 'yyyy-MM-dd'), startTime: '09:00', endTime: '10:00', description: '', assignedTo: '' })}>Add Task</GradientButton>
          <GradientButton variant="outline" size="sm" startIcon={<Clock size={14} />} onClick={() => setEventForm({ open: true, type: 'event', title: '', date: format(new Date(), 'yyyy-MM-dd'), startTime: '09:00', endTime: '10:00', description: '', assignedTo: '' })} disabled={accounts.length === 0} title={accounts.length === 0 ? 'Connect a calendar first' : ''}>Add Event</GradientButton>
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

      {/* Month / Year label */}
      <Typography sx={{ fontSize: { xs: 18, sm: 22 }, fontWeight: 700, color: 'var(--vm-text-primary)', mb: 1.5 }}>
        {monthLabel}
      </Typography>

      {/* Calendar grid */}
      {loading ? <CardSkeleton count={4} type='card' /> : (
        <Box>
          {/* Day-of-week header row */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: { xs: 0.5, sm: 1 }, mb: 0.5 }}>
            {dayHeaders.map(d => (
              <Box key={d} sx={{ textAlign: 'center', py: 0.75 }}>
                <Typography sx={{ fontSize: { xs: 11, sm: 12 }, fontWeight: 700, color: 'var(--vm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {d}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Day cells */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: { xs: 0.5, sm: 1 } }}>
            {calendarDays.map((day, idx) => {
              const dayEvents = getEventsForDay(day);
              const dayTasks = getTasksForDay(day);
              const dayItems = [
                ...dayEvents.map(e => ({ id: e.id, type: 'event' as const, title: e.title, startTime: e.startTime, isAllDay: e.isAllDay })),
                ...dayTasks.map(t => ({ id: t.id, type: 'task' as const, title: t.title, startTime: t.dueDate || '', isAllDay: true })),
              ].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
              const inMonth = isSameMonth(day, currentMonth);
              const today = isToday(day);
              const dayNum = day.getDate();

              return (
                <Box
                  key={idx}
                  sx={{
                    bgcolor: today ? 'rgba(16,185,129,.06)' : 'var(--vm-bg-secondary)',
                    border: today
                      ? '1px solid rgba(16,185,129,.3)'
                      : '1px solid var(--vm-border-subtle)',
                    borderRadius: 2.5,
                    p: { xs: 0.5, sm: 1 },
                    minHeight: { xs: 60, sm: 80, md: 100 },
                    opacity: inMonth ? 1 : 0.35,
                    transition: 'opacity 0.15s',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Day number */}
                  <Typography
                    sx={{
                      fontSize: { xs: 12, sm: 13, md: 14 },
                      fontWeight: today ? 800 : 600,
                      color: today ? '#10b981' : inMonth ? 'var(--vm-text-primary)' : 'var(--vm-text-muted)',
                      lineHeight: 1.2,
                      mb: 0.25,
                    }}
                  >
                    {dayNum}
                  </Typography>

                  {/* Event/task dots (up to 3 visible, then +N more) */}
                  {dayItems.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25, mt: 'auto', pt: 0.25 }}>
                      {dayItems.slice(0, 3).map(item => (
                        <Tooltip key={item.id} title={`${item.type === 'task' ? '📋 ' : '📅 '}${item.title}`}>
                          <Box
                            sx={{
                              width: { xs: 5, sm: 6 },
                              height: { xs: 5, sm: 6 },
                              borderRadius: '50%',
                              bgcolor: item.type === 'task' ? '#8b5cf6' : item.isAllDay ? '#10b981' : '#3b82f6',
                              flexShrink: 0,
                            }}
                          />
                        </Tooltip>
                      ))}
                      {dayItems.length > 3 && (
                        <Typography sx={{ fontSize: 9, color: 'var(--vm-text-muted)', lineHeight: '6px' }}>
                          +{dayItems.length - 3}
                        </Typography>
                      )}
                    </Box>
                  )}

                  {/* Show first item title on larger screens */}
                  {dayItems.length > 0 && (
                    <Box sx={{ display: { xs: 'none', md: 'block' }, mt: 'auto' }}>
                      <Typography
                        sx={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: 'var(--vm-text-primary)',
                          lineHeight: 1.3,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '100%',
                        }}
                      >
                        {dayItems[0].title}
                      </Typography>
                      {dayItems[0].type === 'event' && !dayItems[0].isAllDay && (
                        <Typography sx={{ fontSize: 9, color: 'var(--vm-text-muted)', lineHeight: 1.2 }}>
                          {new Date(dayItems[0].startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </Typography>
                      )}
                    </Box>
                  )}
                </Box>
              );
            })}
          </Box>
        </Box>
      )}

      {/* Add Event/Task Modal */}
      <Modal open={eventForm.open} onClose={() => setEventForm({ ...eventForm, open: false })} title={eventForm.type === 'event' ? 'Add Event' : 'Add Task'} icon={eventForm.type === 'event' ? <Clock size={20} /> : <CheckSquare size={20} />}
        actions={<><GradientButton variant="ghost" size="sm" onClick={() => setEventForm({ ...eventForm, open: false })}>Cancel</GradientButton>
          <GradientButton variant="primary" size="sm" disabled={saving || !eventForm.title || !eventForm.date} onClick={saveEvent}>
            {saving ? <CircularProgress size={14} /> : 'Save'}
          </GradientButton></>}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField size="small" label="Title" value={eventForm.title} onChange={e => setEventForm({ ...eventForm, title: e.target.value })}
            sx={{ input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
          <DatePicker label="Date" format="dd/MM/yyyy" value={eventForm.date ? new Date(eventForm.date) : null}
            onChange={(date) => setEventForm({ ...eventForm, date: date ? format(date, 'yyyy-MM-dd') : '' })}
            slotProps={{ textField: { size: 'small', sx: { input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } } } }} />
          {eventForm.type === 'event' && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField size="small" label="Start Time" type="time" value={eventForm.startTime} onChange={e => setEventForm({ ...eventForm, startTime: e.target.value })}
                sx={{ flex: 1, input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
              <TextField size="small" label="End Time" type="time" value={eventForm.endTime} onChange={e => setEventForm({ ...eventForm, endTime: e.target.value })}
                sx={{ flex: 1, input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
            </Box>
          )}
          {eventForm.type === 'task' && (
            <>
              <FormControl size="small">
                <InputLabel sx={{ color: 'var(--vm-text-muted)' }}>Assigned To</InputLabel>
                <Select value={eventForm.assignedTo} label="Assigned To" onChange={e => setEventForm({ ...eventForm, assignedTo: e.target.value })}
                  sx={{ color: 'var(--vm-text-primary)', '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }}>
                  <MenuItem value=""><em>Unassigned</em></MenuItem>
                  {assignableUsers.map(u => (
                    <MenuItem key={u.email} value={u.name}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 22, height: 22, fontSize: 9, bgcolor: 'var(--vm-primary-600)' }}>{u.name[0]}</Avatar>
                        <Box>
                          <Typography sx={{ fontSize: 13, lineHeight: 1.2 }}>{u.name}</Typography>
                          <Typography sx={{ fontSize: 10, color: 'var(--vm-text-muted)', lineHeight: 1.2 }}>{u.email}</Typography>
                        </Box>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small">
                <InputLabel sx={{ color: 'var(--vm-text-muted)' }}>Status</InputLabel>
                <Select value="pending" label="Status" sx={{ color: 'var(--vm-text-primary)', '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }}>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="done">Done</MenuItem>
                </Select>
              </FormControl>
            </>
          )}
          <TextField size="small" label="Description" multiline rows={2} value={eventForm.description} onChange={e => setEventForm({ ...eventForm, description: e.target.value })}
            sx={{ textarea: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
        </Box>
      </Modal>

      <Modal open={showConnForm} onClose={() => setShowConnForm(false)} title="Connect Calendar" icon={<Calendar size={20} />}
        actions={<><GradientButton variant="ghost" size="sm" onClick={() => setShowConnForm(false)}>Cancel</GradientButton>
          <GradientButton variant="primary" size="sm" disabled={saving || !connEmail} onClick={saveConnection}>
            {saving ? <CircularProgress size={14} /> : 'Connect'}
          </GradientButton></>}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <FormControl size="small" fullWidth>
            <InputLabel sx={{ color: 'var(--vm-text-muted)' }}>Provider</InputLabel>
            <Select value={connProvider} label="Provider" onChange={e => setConnProvider(e.target.value)}
              sx={{ color: 'var(--vm-text-primary)', '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }}>
              <MenuItem value="gmail">Gmail</MenuItem>
              <MenuItem value="outlook">Outlook</MenuItem>
              <MenuItem value="yahoo">Yahoo</MenuItem>
              <MenuItem value="icloud">iCloud</MenuItem>
              <MenuItem value="fastmail">FastMail</MenuItem>
              <MenuItem value="caldav">Custom CalDAV</MenuItem>
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
      </Modal>
      {dialog}
    </Box>
  );
}
