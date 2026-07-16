import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { graphqlRequest } from '../lib/api';
import { useAuth } from './AuthContext';

interface SupportMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface SupportSession {
  id: string;
  subject: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface SupportChatResult {
  supportChat: {
    message: string;
    sessionId: string;
    isEscalated: boolean;
  };
}

interface SupportChatContextValue {
  open: boolean;
  setOpen: (v: boolean) => void;
  messages: SupportMessage[];
  sessionId: string | null;
  isEscalated: boolean;
  loading: boolean;
  sendMessage: (prompt: string) => Promise<void>;
  resetChat: () => void;
  escalate: () => Promise<void>;
}

const SupportChatContext = createContext<SupportChatContextValue | undefined>(undefined);

const SUPPORT_CHAT_MUTATION = `
  mutation SupportChat($userId: ID!, $name: String!, $email: String!, $prompt: String!, $sessionId: String) {
    supportChat(userId: $userId, name: $name, email: $email, prompt: $prompt, sessionId: $sessionId) {
      message
      sessionId
      isEscalated
    }
  }
`;

const ESCALATE_MUTATION = `
  mutation SupportEscalate($userId: ID!, $sessionId: ID!) {
    supportEscalate(userId: $userId, sessionId: $sessionId)
  }
`;

export function SupportChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isEscalated, setIsEscalated] = useState(false);
  const [loading, setLoading] = useState(false);

  const sendMessage = useCallback(async (prompt: string) => {
    if (!user || loading) return;

    const userMessage: SupportMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: prompt,
    };
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      const data = await graphqlRequest<SupportChatResult>(SUPPORT_CHAT_MUTATION, {
        userId: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        prompt,
        sessionId: sessionId || null,
      });

      const result = data.supportChat;
      setSessionId(result.sessionId);

      const botMessage: SupportMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: result.isEscalated
          ? `${result.message}\n\n---\n*Your issue has been escalated to our support team. They will contact you at ${user.email} shortly.*`
          : result.message,
      };
      setMessages(prev => [...prev, botMessage]);
      setIsEscalated(result.isEscalated);
    } catch {
      const errMsg: SupportMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again later or email ops@venturemate.net directly.",
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  }, [user, loading, sessionId]);

  const resetChat = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    setIsEscalated(false);
  }, []);

  const escalate = useCallback(async () => {
    if (!user || !sessionId) return;
    try {
      await graphqlRequest(ESCALATE_MUTATION, { userId: user.id, sessionId });
      setIsEscalated(true);
      setMessages(prev => [...prev, {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: `Your request has been escalated. Our support team will contact you at ${user.email}.`,
      }]);
    } catch {
      // ignore
    }
  }, [user, sessionId]);

  return (
    <SupportChatContext.Provider
      value={{
        open,
        setOpen,
        messages,
        sessionId,
        isEscalated,
        loading,
        sendMessage,
        resetChat,
        escalate,
      }}
    >
      {children}
    </SupportChatContext.Provider>
  );
}

export function useSupportChat() {
  const ctx = useContext(SupportChatContext);
  if (!ctx) throw new Error('useSupportChat must be used within SupportChatProvider');
  return ctx;
}
