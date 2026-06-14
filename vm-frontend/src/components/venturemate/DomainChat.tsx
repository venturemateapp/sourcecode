import { useState, useRef, useEffect } from 'react';
import { Box, Typography, IconButton, TextField, Avatar, Button } from '@mui/material';
import { Bot, Send, X, ChevronUp, Check, RotateCcw, Sparkles, Paperclip, File as FileIcon, Image as ImageIcon } from 'lucide-react';
import { graphqlRequest, uploadFile } from '../../lib/api';
import { useBusiness } from '../../contexts/BusinessContext';

interface ProposedChange {
  id: string;
  type: string;
  field: string | null;
  summary: string;
  currentValue: string | null;
  newValue: string;
}

interface ProposalResponse {
  proposeAgentAction: {
    message: string;
    proposals: ProposedChange[] | null;
  };
}

interface ApplyResult {
  applyAgentProposal: {
    success: boolean;
    message: string;
  };
}

interface Attachment {
  id: string;
  name: string;
  type: 'image' | 'document' | 'file';
  size: string;
  url?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  proposals?: ProposedChange[];
  attachments?: Attachment[];
}

interface DomainChatProps {
  domain: string;
  placeholder?: string;
}

const PROPOSE_MUTATION = `
  mutation ProposeAgentAction($userId: ID!, $businessId: ID!, $prompt: String!, $domain: String) {
    proposeAgentAction(userId: $userId, businessId: $businessId, prompt: $prompt, domain: $domain) {
      message
      proposals {
        id
        type
        field
        summary
        currentValue
        newValue
      }
    }
  }
`;

const APPLY_MUTATION = `
  mutation ApplyAgentProposal($userId: ID!, $businessId: ID!, $changes: String!) {
    applyAgentProposal(userId: $userId, businessId: $businessId, changes: $changes) {
      success
      message
    }
  }
`;

export function DomainChat({ domain, placeholder }: DomainChatProps) {
  const { selectedBusiness, userId, refreshBusiness } = useBusiness();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [applyingIdx, setApplyingIdx] = useState<number | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileStoreRef = useRef<Map<string, File>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

const handleSend = async () => {
    if ((!input.trim() && attachments.length === 0) || !selectedBusiness) return;

    let prompt = input;
    const uploadedAttachments: Attachment[] = [];

    if (attachments.length > 0) {
      for (const att of attachments) {
        const file = fileStoreRef.current.get(att.id);
        if (!file) continue;
        try {
          const result = await uploadFile(file, selectedBusiness.id, 'other', '');
          uploadedAttachments.push({
            id: result.document.id,
            name: result.document.name,
            type: result.document.type === 'image' ? 'image' : 'document',
            size: result.document.size,
            url: result.document.url,
          });
        } catch { /* skip failed uploads */ }
      }
      if (uploadedAttachments.length > 0) {
        const fileList = uploadedAttachments.map(f => `- ${f.name} (${f.url})`).join('\n');
        prompt = `${input}\n\n[Attached files:\n${fileList}\n]`;
      }
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      attachments: uploadedAttachments.length > 0 ? uploadedAttachments : (attachments.length > 0 ? attachments : undefined),
    };
    setMessages(prev => [...prev, userMsg]);
    setAttachments([]);
    setInput('');
    setLoading(true);

    try {
      const data = await graphqlRequest<ProposalResponse>(PROPOSE_MUTATION, {
        userId,
        businessId: selectedBusiness.id,
        prompt,
        domain,
      });

      const resp = data.proposeAgentAction;
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: resp.message,
        proposals: resp.proposals || undefined,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyProposals = async (msgIdx: number) => {
    const msg = messages[msgIdx];
    if (!msg?.proposals?.length) return;
    setApplyingIdx(msgIdx);

    try {
      const data = await graphqlRequest<ApplyResult>(APPLY_MUTATION, {
        userId,
        businessId: selectedBusiness!.id,
        changes: JSON.stringify(msg.proposals),
      });

      const result = data.applyAgentProposal;
      setMessages(prev => {
        const next = [...prev];
        if (next[msgIdx]) {
          next[msgIdx] = {
            ...next[msgIdx],
            content: next[msgIdx].content + `\n\n✅ ${result.message}`,
            proposals: undefined,
          };
        }
        return next;
      });

      refreshBusiness();
    } catch {
      setMessages(prev => {
        const next = [...prev];
        if (next[msgIdx]) {
          next[msgIdx] = {
            ...next[msgIdx],
            content: next[msgIdx].content + '\n\n❌ Failed to apply changes.',
          };
        }
        return next;
      });
    } finally {
      setApplyingIdx(null);
    }
  };

  const handleDiscardProposals = (msgIdx: number) => {
    setMessages(prev => {
      const next = [...prev];
      if (next[msgIdx]) {
        next[msgIdx] = {
          ...next[msgIdx],
          content: next[msgIdx].content + '\n\n*(Changes discarded)*',
          proposals: undefined,
        };
      }
      return next;
    });
  };

  if (!selectedBusiness) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: { xs: 0, sm: 24 },
        right: { xs: 0, sm: 24 },
        left: { xs: 0, sm: 'auto' },
        zIndex: 1200,
        display: 'flex',
        flexDirection: 'column',
        alignItems: { xs: 'stretch', sm: 'flex-end' },
        p: { xs: 1.5, sm: 0 },
      }}
    >
      {open && (
        <Box
          sx={{
            width: { xs: '100%', sm: 400 },
            height: { xs: '70vh', sm: 480 },
            mb: { xs: 0, sm: 2 },
            borderRadius: { xs: 2, sm: 3 },
            bgcolor: 'var(--vm-bg-primary)',
            border: '1px solid var(--vm-border-subtle)',
            boxShadow: { xs: 'none', sm: '0 8px 32px rgba(0,0,0,0.15)' },
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              p: 2,
              borderBottom: '1px solid var(--vm-border-subtle)',
              bgcolor: 'var(--vm-bg-secondary)',
            }}
          >
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 2,
                background: 'linear-gradient(135deg, var(--vm-primary-600), var(--vm-primary-400))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={16} color="white" />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'var(--vm-text-primary)' }}>
                AI Assistant
              </Typography>
              <Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)', textTransform: 'capitalize' }}>
                {domain} · {selectedBusiness.name}
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: 'var(--vm-text-muted)' }}>
              <X size={18} />
            </IconButton>
          </Box>

          <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
            {messages.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 6, color: 'var(--vm-text-muted)' }}>
                <Bot size={40} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
                <Typography sx={{ fontSize: 13 }}>
                  Ask me anything about your {domain}.
                  I can suggest changes and you can approve them.
                </Typography>
              </Box>
            )}
            {messages.map((msg, idx) => (
              <Box key={msg.id} sx={{ mb: 2 }}>
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1.5,
                    flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                  }}
                >
                  <Avatar
                    sx={{
                      width: 28,
                      height: 28,
                      bgcolor: msg.role === 'assistant' ? 'var(--vm-primary-600)' : 'var(--vm-bg-tertiary)',
                      flexShrink: 0,
                      fontSize: 12,
                    }}
                  >
                    {msg.role === 'assistant' ? <Bot size={14} color="white" /> : 'U'}
                  </Avatar>
                  <Box
                    sx={{
                      maxWidth: '80%',
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: msg.role === 'user' ? 'var(--vm-primary-600)' : 'var(--vm-bg-secondary)',
                      color: msg.role === 'user' ? 'white' : 'var(--vm-text-primary)',
                      border: msg.role === 'assistant' ? '1px solid var(--vm-border-subtle)' : 'none',
                    }}
                  >
                    <Typography sx={{ fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                      {msg.content}
                    </Typography>
                  </Box>
                </Box>

                {msg.proposals && msg.proposals.length > 0 && (
                  <Box sx={{ mt: 1, ml: 5 }}>
                    {msg.proposals.map((p) => (
                      <Box
                        key={p.id}
                        sx={{
                          p: 1.5,
                          mb: 1,
                          borderRadius: 2,
                          bgcolor: 'var(--vm-bg-tertiary)',
                          border: '1px solid var(--vm-border-subtle)',
                        }}
                      >
                        <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'var(--vm-text-primary)' }}>
                          {p.summary}
                        </Typography>
                        {p.currentValue && (
                          <Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)', mt: 0.5 }}>
                            Current: {p.currentValue}
                          </Typography>
                        )}
                        <Typography sx={{ fontSize: 11, color: 'var(--vm-primary-400)', mt: 0.25 }}>
                          New: {p.newValue.length > 100 ? p.newValue.slice(0, 100) + '...' : p.newValue}
                        </Typography>
                      </Box>
                    ))}
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => handleApplyProposals(idx)}
                        disabled={applyingIdx === idx}
                        sx={{
                          fontSize: 12,
                          bgcolor: 'var(--vm-primary-600)',
                          '&:hover': { bgcolor: 'var(--vm-primary-500)' },
                        }}
                        startIcon={<Check size={14} />}
                      >
                        {applyingIdx === idx ? 'Applying...' : 'Apply All'}
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleDiscardProposals(idx)}
                        disabled={applyingIdx === idx}
                        sx={{
                          fontSize: 12,
                          color: 'var(--vm-text-muted)',
                          borderColor: 'var(--vm-border-subtle)',
                        }}
                        startIcon={<RotateCcw size={14} />}
                      >
                        Discard
                      </Button>
                    </Box>
                  </Box>
                )}
              </Box>
            ))}
            {loading && (
              <Box sx={{ display: 'flex', gap: 1, ml: 5, mb: 2 }}>
                <Box sx={{ display: 'flex', gap: 0.5, p: 1.5, borderRadius: 2, bgcolor: 'var(--vm-bg-secondary)' }}>
                  {[0, 1, 2].map((i) => (
                    <Box
                      key={i}
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        bgcolor: 'var(--vm-primary-500)',
                        animation: 'bounce 1s infinite',
                        animationDelay: `${i * 0.2}s`,
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}
            <div ref={messagesEndRef} />
          </Box>

          <Box sx={{ p: 2, borderTop: '1px solid var(--vm-border-subtle)' }}>
            {attachments.length > 0 && (
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                {attachments.map((file) => (
                  <Box key={file.id} sx={{
                    display: 'flex', alignItems: 'center', gap: 0.5,
                    py: 0.25, px: 1, borderRadius: 1.5,
                    bgcolor: 'var(--vm-bg-tertiary)', border: '1px solid var(--vm-border-subtle)',
                  }}>
                    {file.type === 'image' ? <ImageIcon size={12} color="var(--vm-primary-400)" /> : <FileIcon size={12} color="var(--vm-primary-400)" />}
                    <Typography sx={{ fontSize: 10, color: 'var(--vm-text-secondary)', maxWidth: 80 }} noWrap>{file.name}</Typography>
                    <IconButton size="small" onClick={() => { fileStoreRef.current.delete(file.id); setAttachments(prev => prev.filter(a => a.id !== file.id)); }} sx={{ p: 0.25 }}>
                      <X size={10} color="var(--vm-text-muted)" />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                const files = e.target.files;
                if (!files) return;
                Array.from(files).forEach((file) => {
                  const type = file.type.startsWith('image') ? 'image' : 'document';
                  const id = Date.now().toString() + Math.random().toString();
                  fileStoreRef.current.set(id, file);
                  setAttachments(prev => [...prev, { id, name: file.name, type, size: (file.size / 1024).toFixed(1) + ' KB', url: type === 'image' ? URL.createObjectURL(file) : undefined }]);
                });
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx"
              style={{ display: 'none' }}
            />
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
              <IconButton
                onClick={() => fileInputRef.current?.click()}
                sx={{ color: 'var(--vm-text-muted)', width: 32, height: 32, flexShrink: 0, '&:hover': { color: 'var(--vm-primary-400)' } }}
              >
                <Paperclip size={16} />
              </IconButton>
              <TextField
                fullWidth
                size="small"
                placeholder={placeholder || `Ask about your ${domain}...`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'var(--vm-bg-secondary)',
                    color: 'var(--vm-text-primary)',
                    fontSize: 13,
                    '& fieldset': { border: '1px solid var(--vm-border-subtle)' },
                    '&:hover fieldset': { borderColor: 'var(--vm-primary-400)' },
                  },
                }}
              />
              <IconButton
                onClick={handleSend}
                disabled={(!input.trim() && attachments.length === 0) || loading}
                sx={{
                  bgcolor: (input.trim() || attachments.length > 0) ? 'var(--vm-primary-600)' : 'var(--vm-bg-tertiary)',
                  color: 'white',
                  '&:hover': { bgcolor: 'var(--vm-primary-500)' },
                  width: 36,
                  height: 36,
                }}
              >
                <Send size={16} />
              </IconButton>
            </Box>
          </Box>
        </Box>
      )}

      {!open && (
        <Box
          onClick={() => setOpen(true)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            py: 1.5,
            px: 2,
            borderRadius: { xs: 2, sm: 3 },
            bgcolor: 'var(--vm-primary-600)',
            color: 'white',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            alignSelf: { xs: 'flex-end', sm: 'auto' },
            m: { xs: 1.5, sm: 0 },
            '&:hover': { bgcolor: 'var(--vm-primary-500)' },
          }}
        >
          <Bot size={18} />
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
            AI Help
          </Typography>
          <ChevronUp size={16} />
        </Box>
      )}
    </Box>
  );
}
