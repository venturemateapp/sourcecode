import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { graphqlRequest } from '../lib/api';
import { useAuth } from './AuthContext';

interface SupportMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface SupportChatResult {
  supportChat: {
    message: string;
    sessionId: string;
    isEscalated: boolean;
  };
}

interface SupportSession {
  id: string;
  subject: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastMessage: string;
}

interface SupportChatContextValue {
  open: boolean;
  setOpen: (v: boolean) => void;
  messages: SupportMessage[];
  sessions: SupportSession[];
  sessionId: string | null;
  isEscalated: boolean;
  loading: boolean;
  sendMessage: (prompt: string) => Promise<void>;
  resetChat: () => void;
  switchSession: (id: string) => Promise<void>;
  escalate: () => Promise<void>;
}

const SupportChatContext = createContext<SupportChatContextValue | undefined>(undefined);

export function SupportChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [sessions, setSessions] = useState<SupportSession[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isEscalated, setIsEscalated] = useState(false);
  const [loading, setLoading] = useState(false);

  const q = useCallback(async <T,>(query: string, vars?: Record<string, unknown>) => graphqlRequest<T>(query, vars), []);

  // Load existing sessions on mount
  useEffect(() => {
    if (!user?.id) return;
    q<{ mySupportSessions: SupportSession[] }>('query Q($u:ID!){mySupportSessions(userId:$u){id subject status createdAt updatedAt}}', { u: user.id })
      .then(d => setSessions(d.mySupportSessions)).catch(() => {});
  }, [user?.id, q]);

  // Load messages when switching to an existing session
  const loadMessages = useCallback(async (sid: string) => {
    try {
      const d = await q<{ supportSessionMessages: Array<{ role: string; content: string }> }>(
        'query Q($s:ID!){supportSessionMessages(sessionId:$s){role content createdAt}}', { s: sid });
      setMessages(d.supportSessionMessages.map((m, i) => ({
        id: `hist-${i}`, role: m.role as 'user' | 'assistant', content: m.content,
      })));
    } catch { /* ignore */ }
  }, [q]);

  const switchSession = useCallback(async (id: string) => {
    setSessionId(id);
    setIsEscalated(false);
    await loadMessages(id);
    const s = sessions.find(s => s.id === id);
    if (s?.status === 'escalated' || s?.status === 'closed') setIsEscalated(true);
  }, [sessions, loadMessages]);

  const sendMessage = useCallback(async (prompt: string) => {
    if (!user || loading) return;

    const userMessage: SupportMessage = { id: `user-${Date.now()}`, role: 'user', content: prompt };
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      const data = await q<SupportChatResult>('mutation M($u:ID!,$n:String!,$e:String!,$p:String!,$s:String){supportChat(userId:$u name:$n email:$e prompt:$p sessionId:$s){message sessionId isEscalated}}', {
        u: user.id, n: `${user.firstName} ${user.lastName}`, e: user.email, p: prompt, s: sessionId || null,
      });
      const result = data.supportChat;
      setSessionId(result.sessionId);
      const botMessage: SupportMessage = {
        id: `bot-${Date.now()}`, role: 'assistant',
        content: result.isEscalated
          ? `${result.message}\n\n---\n*Your issue has been escalated to our support team. They will contact you at ${user.email} shortly.*`
          : result.message,
      };
      setMessages(prev => [...prev, botMessage]);
      setIsEscalated(result.isEscalated);

      // Refresh sessions list
      try {
        const d = await q<{ mySupportSessions: SupportSession[] }>('query Q($u:ID!){mySupportSessions(userId:$u){id subject status createdAt updatedAt}}', { u: user.id });
        setSessions(d.mySupportSessions);
      } catch { /* ignore */ }
    } catch {
      setMessages(prev => [...prev, { id: `bot-${Date.now()}`, role: 'assistant', content: "I'm having trouble connecting right now. Please try again later or email support@venturemate.com directly." }]);
    } finally {
      setLoading(false);
    }
  }, [user, loading, sessionId, q]);

  const resetChat = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    setIsEscalated(false);
  }, []);

  const escalate = useCallback(async () => {
    if (!user) return;
    let sid = sessionId;
    // If no session exists, send a message first to create one
    if (!sid) {
      try {
        const d = await q<{ supportChat: { sessionId: string } }>('mutation M($u:ID!,$n:String!,$e:String!,$p:String!){supportChat(userId:$u name:$n email:$e prompt:$p){sessionId}}', {
          u: user.id, n: `${user.firstName} ${user.lastName}`, e: user.email, p: 'I need to speak with a human support agent.',
        });
        sid = d.supportChat.sessionId;
        setSessionId(sid);
      } catch { return; }
    }
    try {
      await q('mutation M($u:ID!,$s:ID!){supportEscalate(userId:$u sessionId:$s)}', { u: user.id, s: sid });
      setIsEscalated(true);
      setMessages(prev => [...prev, { id: `bot-${Date.now()}`, role: 'assistant', content: `Your request has been escalated. Our support team will contact you at ${user.email}.` }]);
    } catch { /* ignore */ }
  }, [user, sessionId, q]);

  return (
    <SupportChatContext.Provider value={{
      open, setOpen, messages, sessions, sessionId, isEscalated, loading,
      sendMessage, resetChat, switchSession, escalate,
    }}>
      {children}
    </SupportChatContext.Provider>
  );
}

export function useSupportChat() {
  const ctx = useContext(SupportChatContext);
  if (!ctx) throw new Error('useSupportChat must be used within SupportChatProvider');
  return ctx;
}
