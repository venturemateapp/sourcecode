import { type KeyboardEvent, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Avatar,
  IconButton,
  TextField,
  Typography,
  CircularProgress,
  Button,
} from '@mui/material';
import { MessageCircle, X, Send, Phone, ArrowUpRight, History } from 'lucide-react';
import { useSupportChat } from '../../contexts/SupportChatContext';
import { AIResponseRenderer } from '../ai-response/AIResponseRenderer';

const QUICK_ACTIONS = [
  'How do I create a business?',
  'What features are available?',
  'I need help with billing',
  'Talk to a human',
];

export function SupportChatFloating() {
  const {
    open, setOpen, messages, sessions, loading, sessionId, isEscalated,
    sendMessage, escalate, switchSession,
  } = useSupportChat();
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [searchParams] = useSearchParams();

  // Auto-open support chat when ?chat=sessionId is in URL
  useEffect(() => {
    const chatParam = searchParams.get('chat');
    if (chatParam) {
      switchSession(chatParam);
      setOpen(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams, switchSession, setOpen]);

  // Listen for direct open events from notification clicks
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ sessionId: string }>).detail;
      if (detail?.sessionId) {
        switchSession(detail.sessionId);
        setOpen(true);
      }
    };
    window.addEventListener('supportchat:open', handler);
    return () => window.removeEventListener('supportchat:open', handler);
  }, [switchSession, setOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleSend = () => {
    const value = inputRef.current?.value?.trim();
    if (!value || loading) return;
    if (inputRef.current) inputRef.current.value = '';
    sendMessage(value);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (action: string) => {
    sendMessage(action);
  };

  const panel = (
    <Box
      sx={{
        width: { xs: '100%', sm: 380 },
        height: { xs: '70vh', sm: 500 },
        borderRadius: { xs: 0, sm: 3 },
        bgcolor: '#0d1a15',
        border: '1px solid rgba(255,255,255,.08)',
        boxShadow: '0 20px 70px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          p: 1.5,
          borderBottom: '1px solid rgba(255,255,255,.08)',
          bgcolor: '#07130f',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <Avatar sx={{ width: 32, height: 32, bgcolor: '#f59e0b' }}>
          <MessageCircle size={16} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>
            VentureMate Support
          </Typography>
          <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>
            {isEscalated ? 'Escalated to human team' : 'AI-powered help'}
          </Typography>
        </Box>
        <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: 'rgba(255,255,255,.5)' }}>
          <X size={18} />
        </IconButton>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 1.5 }}>
        {/* Previous sessions */}
        {sessions.length > 0 && !sessionId && messages.length === 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,.4)', mb: 0.75, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <History size={11} /> Previous conversations
            </Typography>
            {sessions.map(s => (
              <Box key={s.id} onClick={() => switchSession(s.id)}
                sx={{ px: 1.5, py: 1, borderRadius: 1.5, cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,255,255,.04)' }, mb: 0.25 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{s.subject}</Typography>
                <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,.35)' }}>{new Date(s.createdAt).toLocaleDateString()} · {s.status}</Typography>
              </Box>
            ))}
            <Box sx={{ borderTop: '1px solid rgba(255,255,255,.06)', my: 1.5 }} />
          </Box>
        )}

        {messages.length === 0 && (
          <Box sx={{ py: 2, textAlign: 'center' }}>
            <MessageCircle size={28} color="#f59e0b" />
            <Typography sx={{ mt: 1, fontWeight: 700, color: '#fff', fontSize: 14 }}>
              How can we help you?
            </Typography>
            <Typography sx={{ mt: 0.5, mb: 2, px: 1, fontSize: 12, color: 'rgba(255,255,255,.45)' }}>
              Ask questions about VentureMate features, billing, or account issues.
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, px: 1 }}>
              {QUICK_ACTIONS.map(action => (
                <Button
                  key={action}
                  size="small"
                  variant="outlined"
                  onClick={() => handleQuickAction(action)}
                  sx={{
                    textTransform: 'none',
                    fontSize: 12,
                    color: 'rgba(255,255,255,.7)',
                    borderColor: 'rgba(255,255,255,.12)',
                    justifyContent: 'flex-start',
                    '&:hover': { borderColor: '#f59e0b', color: '#f59e0b' },
                  }}
                >
                  {action}
                </Button>
              ))}
            </Box>
          </Box>
        )}

        {messages.map(msg => (
          <Box
            key={msg.id}
            sx={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              mb: 1.5,
            }}
          >
            <Box
              sx={{
                maxWidth: '88%',
                p: 1.25,
                borderRadius: 2.5,
                bgcolor: msg.role === 'user' ? '#f59e0b' : '#13261d',
                color: msg.role === 'user' ? '#000' : 'rgba(255,255,255,.87)',
                fontSize: 13,
                lineHeight: 1.55,
                whiteSpace: 'pre-wrap',
                overflowWrap: 'anywhere',
              }}
            >
              {msg.role === 'assistant' ? <AIResponseRenderer text={msg.content} /> : msg.content}
            </Box>
          </Box>
        ))}
        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'rgba(255,255,255,.4)', p: 1 }}>
            <CircularProgress size={14} sx={{ color: '#f59e0b' }} />
            <Typography sx={{ fontSize: 12 }}>Thinking...</Typography>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {isEscalated && (
        <Box sx={{ px: 1.5, pb: 0.5 }}>
          <Box
            sx={{
              p: 1,
              borderRadius: 2,
              bgcolor: 'rgba(245,158,11,.1)',
              border: '1px solid rgba(245,158,11,.2)',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Phone size={14} color="#f59e0b" />
            <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,.6)', flex: 1 }}>
              A support team member will reach out soon.
            </Typography>
          </Box>
        </Box>
      )}

      {!isEscalated && sessionId && (
        <Box sx={{ px: 1.5, pb: 0.5 }}>
          <Button
            size="small"
            variant="text"
            startIcon={<ArrowUpRight size={14} />}
            onClick={escalate}
            sx={{ textTransform: 'none', fontSize: 11, color: '#f59e0b' }}
          >
            Talk to a human
          </Button>
        </Box>
      )}

      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.75, p: 1.25, borderTop: '1px solid rgba(255,255,255,.08)' }}>
        <TextField
          inputRef={inputRef}
          fullWidth
          multiline
          maxRows={3}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={loading}
          sx={{
            '& .MuiOutlinedInput-root': { bgcolor: '#13261d', fontSize: 13, color: '#fff' },
            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,.1)' },
            '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,.2)' },
            '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#f59e0b' },
          }}
        />
        <IconButton
          onClick={handleSend}
          disabled={loading}
          sx={{ bgcolor: '#f59e0b', color: '#000', '&:hover': { bgcolor: '#d97706' }, width: 40, height: 40 }}
        >
          <Send size={16} />
        </IconButton>
      </Box>
    </Box>
  );

  return (
    <Box
      sx={{
        position: 'fixed',
        right: { xs: 12, sm: 24 },
        bottom: open ? { xs: 0, sm: 24 } : { xs: 72, sm: 24 },
        left: 'auto',
        zIndex: 1100,
      }}
    >
      {open ? panel : (
        <IconButton
          onClick={() => setOpen(true)}
          sx={{
            width: 52,
            height: 52,
            bgcolor: '#f59e0b',
            color: '#000',
            boxShadow: '0 0 20px rgba(245,158,11,.35)',
            animation: 'supportFloat 2.5s ease-in-out infinite',
            '@keyframes supportFloat': {
              '0%, 100%': { boxShadow: '0 0 20px rgba(245,158,11,.3)', transform: 'translateY(0)' },
              '50%': { boxShadow: '0 0 36px rgba(245,158,11,.55)', transform: 'translateY(-3px)' },
            },
            '&:hover': {
              bgcolor: '#d97706',
              boxShadow: '0 0 44px rgba(245,158,11,.7)',
            },
          }}
        >
          <MessageCircle size={22} />
        </IconButton>
      )}
    </Box>
  );
}
