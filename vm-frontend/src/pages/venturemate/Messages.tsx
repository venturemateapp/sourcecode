import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Typography, Card, TextField, IconButton, Chip } from '@mui/material';
import { GradientButton } from '../../components/shared/buttons';
import { CardSkeleton } from '../../components/shared/Skeleton';
import { graphqlRequest } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useBusiness } from '../../contexts/BusinessContext';
import { Send, MessageCircle, Plus, User } from 'lucide-react';
import { API_CONFIG } from '../../lib/constants';

interface Conversation {
  id: string;
  businessId: string;
  userId: string;
  subject: string;
  status: string;
  senderName: string;
  senderEmail: string;
  lastMessage: string;
  createdAt: string;
  updatedAt: string;
}

interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

declare global { interface Window { __ws?: WebSocket } }

export function MessagesPage() {
  const { user } = useAuth();
  const { selectedBusiness } = useBusiness();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newMsg, setNewMsg] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [wsConnected, setWsConnected] = useState(false);

  const q = useCallback(async <T,>(query: string, vars?: Record<string, unknown>) => graphqlRequest<T>(query, vars), []);

  const loadConvos = useCallback(async () => {
    if (!user) return;
    try {
      const d = await q<{ chatConversations: Conversation[] }>('query Q($u:ID!,$a:Boolean!){chatConversations(userId:$u isAdmin:$a){id businessId userId subject status senderName senderEmail lastMessage createdAt updatedAt}}', { u: user.id, a: user.isAdmin || false });
      setConversations(d.chatConversations);
    } catch { /* ignore */ }
    setLoading(false);
  }, [user, q]);

  const loadMessages = useCallback(async (convId: string) => {
    try {
      const d = await q<{ chatMessages: ChatMessage[] }>('query Q($c:ID!){chatMessages(conversationId:$c){id conversationId senderId content createdAt}}', { c: convId });
      setMessages(d.chatMessages);
    } catch { /* ignore */ }
  }, [q]);

  useEffect(() => { loadConvos(); }, [loadConvos]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // WebSocket
  useEffect(() => {
    if (!user) return;
    const wsUrl = API_CONFIG.GRAPHQL_URL.replace(/^http/, 'ws').replace('/graphql', '/ws/chat') +
      `?userId=${user.id}${user.isAdmin ? '&admin=true' : ''}`;

    const connect = () => {
      const ws = new WebSocket(wsUrl);
      ws.onopen = () => { setWsConnected(true); window.__ws = ws; };
      ws.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.type === 'new_message' && data.conversationId === activeConv) {
          setMessages(prev => [...prev, { id: `ws-${Date.now()}`, conversationId: data.conversationId, senderId: data.senderId, content: data.content, createdAt: new Date().toISOString() }]);
          loadConvos();
        }
        if (data.type === 'new_conversation') {
          loadConvos();
          if (activeConv === data.conversationId) {
            setMessages(prev => [...prev, { id: `ws-${Date.now()}`, conversationId: data.conversationId, senderId: data.senderId || '', content: data.content || '', createdAt: new Date().toISOString() }]);
          }
        }
      };
      ws.onclose = () => { setWsConnected(false); window.__ws = undefined; setTimeout(connect, 3000); };
      ws.onerror = () => ws.close();
    };
    connect();
    return () => { window.__ws?.close(); };
  }, [user, activeConv, loadConvos]);

  const sendMessage = async () => {
    if (!input.trim() || !activeConv || !user) return;
    setSending(true);
    if (window.__ws) {
      window.__ws.send(JSON.stringify({
        type: 'new_message',
        conversationId: activeConv,
        content: input,
        senderName: `${user.firstName} ${user.lastName}`,
      }));
    } else {
      // Fallback: use supportChat mutation
      try {
        const d = await q<{ supportChat: { message: string } }>('mutation M($u:ID!,$n:String!,$e:String!,$p:String!,$s:String){supportChat(userId:$u name:$n email:$e prompt:$p sessionId:$s){message}}', {
          u: user.id, n: `${user.firstName} ${user.lastName}`, e: user.email, p: input, s: activeConv,
        });
        setMessages(prev => [...prev, { id: `ws-${Date.now()}`, conversationId: activeConv, senderId: user.id, content: input, createdAt: new Date().toISOString() }]);
        setMessages(prev => [...prev, { id: `ws-${Date.now()}`, conversationId: activeConv, senderId: '', content: d.supportChat.message, createdAt: new Date().toISOString() }]);
      } catch { /* ignore */ }
    }
    setInput('');
    setSending(false);
  };

  const startConversation = async () => {
    if (!newSubject.trim() || !user) return;
    if (window.__ws) {
      const payload = JSON.stringify({
        type: 'new_conversation',
        subject: newSubject,
        content: newMsg,
        senderName: `${user.firstName} ${user.lastName}`,
        businessId: selectedBusiness?.id || '',
      });
      window.__ws.send(payload);
    } else {
      // Fallback: use supportChat mutation
      try {
        await q('mutation M($u:ID!,$n:String!,$e:String!,$p:String!){supportChat(userId:$u name:$n email:$e prompt:$p){sessionId message}}', {
          u: user.id, n: `${user.firstName} ${user.lastName}`, e: user.email, p: `${newSubject}: ${newMsg}`,
        });
      } catch { /* ignore */ }
    }
    setShowNew(false);
    setNewSubject('');
    setNewMsg('');
    setTimeout(loadConvos, 500);
  };

  return (
    <Box sx={{ display: 'flex', gap: 2, height: { xs: 'auto', md: 'calc(100vh - 160px)' }, flexDirection: { xs: 'column', md: 'row' }, p: { xs: 1, sm: 2 } }}>
      {/* Conversations list */}
      <Card sx={{ width: { xs: '100%', md: 320 }, flexShrink: 0, bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: { xs: 240, md: 'none' } }}>
        <Box sx={{ px: 1.5, py: 1.25, borderBottom: '1px solid var(--vm-border-subtle)', display: 'flex', alignItems: 'center', gap: 1 }}>
          <MessageCircle size={16} color="var(--vm-primary-400)" />
          <Typography sx={{ flex: 1, fontSize: 14, fontWeight: 700, color: 'var(--vm-text-primary)' }}>
            {user?.isAdmin ? 'Support Requests' : 'Messages'}
          </Typography>
          {!user?.isAdmin && (
            <IconButton size="small" onClick={() => setShowNew(true)} sx={{ color: 'var(--vm-primary-400)' }}>
              <Plus size={18} />
            </IconButton>
          )}
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: wsConnected ? '#22c55e' : '#ef4444' }} />
        </Box>
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {loading ? <CardSkeleton count={5} type='list-item' /> : conversations.length === 0 ? (
            <Typography sx={{ p: 2, textAlign: 'center', fontSize: 12, color: 'var(--vm-text-muted)' }}>No conversations yet</Typography>
          ) : conversations.map(cv => (
            <Box key={cv.id} onClick={() => { setActiveConv(cv.id); loadMessages(cv.id); }}
              sx={{ px: 1.5, py: 1.25, cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,.04)', transition: 'all .1s ease',
                bgcolor: activeConv === cv.id ? 'rgba(16,185,129,.1)' : 'transparent', borderLeft: activeConv === cv.id ? '3px solid #10b981' : '3px solid transparent',
                '&:hover': { bgcolor: 'rgba(255,255,255,.02)' } }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'var(--vm-text-primary)' }}>{cv.subject}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                <User size={11} color="var(--vm-text-muted)" />
                <Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)', flex: 1 }}>{cv.senderName}</Typography>
                <Chip label={cv.status} size="small" sx={{ bgcolor: cv.status === 'active' ? 'rgba(52,211,153,.12)' : 'rgba(148,163,184,.12)', color: cv.status === 'active' ? '#34d399' : '#94a3b8', fontSize: 8, height: 16 }} />
              </Box>
              {cv.lastMessage && <Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)', mt: 0.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cv.lastMessage}</Typography>}
            </Box>
          ))}
        </Box>
      </Card>

      {/* Chat area */}
      <Card sx={{ flex: 1, bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: { xs: 300, md: 'auto' } }}>
        {!activeConv ? (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 1, color: 'var(--vm-text-muted)' }}>
            <MessageCircle size={40} />
            <Typography sx={{ fontSize: 14 }}>{user?.isAdmin ? 'Select a conversation to reply' : 'Start a conversation with support'}</Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ px: 2, py: 1.25, borderBottom: '1px solid var(--vm-border-subtle)', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ flex: 1, fontSize: 14, fontWeight: 700, color: 'var(--vm-text-primary)' }}>
                {conversations.find(c => c.id === activeConv)?.subject || 'Chat'}
              </Typography>
              <Chip label={conversations.find(c => c.id === activeConv)?.status || ''} size="small" sx={{ fontSize: 10 }} />
            </Box>
            <Box sx={{ flex: 1, overflow: 'auto', p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
              {messages.map(m => (
                <Box key={m.id} sx={{ display: 'flex', justifyContent: m.senderId === user?.id ? 'flex-end' : 'flex-start' }}>
                  <Box sx={{ maxWidth: '75%', p: 1.25, borderRadius: 2.5, fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere',
                    bgcolor: m.senderId === user?.id ? 'var(--vm-primary-600)' : 'rgba(255,255,255,.06)',
                    color: m.senderId === user?.id ? '#fff' : 'var(--vm-text-primary)',
                  }}>{m.content}</Box>
                </Box>
              ))}
              <div ref={messagesEndRef} />
            </Box>
            <Box sx={{ display: 'flex', gap: 1, p: 1.5, borderTop: '1px solid var(--vm-border-subtle)' }}>
              <TextField fullWidth size="small" value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder={'Type a message...'}
                disabled={sending}
                sx={{ input: { color: 'var(--vm-text-primary)', fontSize: 13 }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
              <IconButton onClick={sendMessage} disabled={sending || !input.trim()}
                sx={{ bgcolor: 'var(--vm-primary-600)', color: '#fff', '&:hover': { bgcolor: 'var(--vm-primary-500)' }, '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,.05)' } }}>
                <Send size={16} />
              </IconButton>
            </Box>
          </>
        )}
      </Card>

      {/* New conversation dialog */}
      {showNew && (
        <Box sx={{ position: 'fixed', inset: 0, zIndex: 1500, bgcolor: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}
          onClick={() => setShowNew(false)}>
          <Card sx={{ maxWidth: 440, width: '100%', p: 2.5, bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3 }}
            onClick={e => e.stopPropagation()}>
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: 'var(--vm-text-primary)', mb: 1.5 }}>New Support Request</Typography>
            <TextField fullWidth size="small" label="Subject" value={newSubject} onChange={e => setNewSubject(e.target.value)}
              sx={{ mb: 1.5, input: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
            <TextField fullWidth size="small" label="Message" multiline rows={3} value={newMsg} onChange={e => setNewMsg(e.target.value)}
              sx={{ mb: 2, textarea: { color: 'var(--vm-text-primary)' }, label: { color: 'var(--vm-text-muted)' }, '& fieldset': { borderColor: 'var(--vm-border-subtle)' } }} />
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <GradientButton variant="ghost" size="sm" onClick={() => setShowNew(false)}>Cancel</GradientButton>
              <GradientButton variant="primary" size="sm" disabled={!newSubject.trim()} onClick={startConversation}>Send</GradientButton>
            </Box>
          </Card>
        </Box>
      )}
    </Box>
  );
}
