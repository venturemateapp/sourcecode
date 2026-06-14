import { useState, useRef, useEffect } from 'react';
import { Box, Typography, TextField, Avatar, Chip, IconButton } from '@mui/material';
import type { ViewType } from '../../types/venturemate';
import {
  Send,
  Bot,
  Presentation,
  FileText,
  TrendingUp,
  BarChart3,
  Globe,
  Target,
  Paperclip,
  X,
  File as FileIcon,
  Image as ImageIcon,
  AlertCircle,
} from 'lucide-react';
import { graphqlRequest, uploadFile } from '../../lib/api';
import { useBusiness } from '../../contexts/BusinessContext';
import { useAuth } from '../../contexts/AuthContext';
import { NoBusinessSelected } from '../../components/venturemate/NoBusinessSelected';

interface AIAssistantProps {
  onViewChange?: (view: ViewType) => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  attachments?: Attachment[];
}

interface Attachment {
  id: string;
  name: string;
  type: 'image' | 'document' | 'file';
  size: string;
  url?: string;
}

const quickActions = [
  { label: 'Generate Pitch Deck', icon: Presentation, prompt: 'Help me create a pitch deck for my startup' },
  { label: 'Write Business Plan', icon: FileText, prompt: 'Write a business plan for my company' },
  { label: 'Market Research', icon: TrendingUp, prompt: 'Do market research for my industry' },
  { label: 'Financial Forecast', icon: BarChart3, prompt: 'Create financial projections for my business' },
  { label: 'Website Copy', icon: Globe, prompt: 'Write website copy for my landing page' },
  { label: 'Milestone Plan', icon: Target, prompt: 'Create a milestone roadmap' },
];

const EXECUTE_AGENT_MUTATION = `
  mutation ExecuteAgentQuery($userId: ID!, $businessId: ID!, $prompt: String!) {
    executeAgentQuery(userId: $userId, businessId: $businessId, prompt: $prompt) {
      message
    }
  }
`;

interface AgentResponse {
  executeAgentQuery: {
    message: string;
  };
}

export function AIAssistant(_props: AIAssistantProps) {
  const { selectedBusiness, userId } = useBusiness();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>(() => {
    const name = selectedBusiness?.name || 'your business';
    return [
      {
        id: '1',
        role: 'assistant',
        content: `Hi ${user?.firstName || 'there'}! I'm your VentureMate AI assistant. I can help you with:

• Creating pitch decks and business plans
• Market research and competitor analysis  
• Financial forecasting and projections
• Website copy and branding
• Milestone planning and tracking
• Updating your business information

What would you like to work on for **${name}** today?`,
        timestamp: new Date(),
        suggestions: ['Create a pitch deck', 'Analyze my market', 'Update my business description'],
      },
    ];
  });

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileStoreRef = useRef<Map<string, File>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() && attachments.length === 0) return;

    let prompt = input;
    const uploadedAttachments: Attachment[] = [];

    if (attachments.length > 0 && selectedBusiness) {
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
        } catch {
          // file upload failed, skip
        }
      }
      if (uploadedAttachments.length > 0) {
        const fileList = uploadedAttachments.map(f => `- ${f.name} (${f.url})`).join('\n');
        prompt = `${input}\n\n[Attached files:\n${fileList}\n]`;
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
      attachments: uploadedAttachments.length > 0 ? uploadedAttachments : (attachments.length > 0 ? attachments : undefined),
    };

    setAttachments([]);
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    setError(null);

    try {
      const data = await graphqlRequest<AgentResponse>(EXECUTE_AGENT_MUTATION, {
        userId: userId || '',
        businessId: selectedBusiness?.id || '',
        prompt,
      });

      const response = data.executeAgentQuery.message;
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        suggestions: ['Tell me more', 'What else can you do?', 'Save this'],
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get AI response');
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date(),
        suggestions: ['Try again', 'Contact support'],
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickAction = (prompt: string) => {
    setInput(prompt);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const type = file.type.startsWith('image') ? 'image' :
        file.type.includes('pdf') || file.type.includes('doc') ? 'document' : 'file';

      const id = Date.now().toString() + Math.random().toString();
      fileStoreRef.current.set(id, file);

      const newAttachment: Attachment = {
        id,
        name: file.name,
        type,
        size: (file.size / 1024).toFixed(1) + ' KB',
        url: type === 'image' ? URL.createObjectURL(file) : undefined,
      };

      setAttachments(prev => [...prev, newAttachment]);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (id: string) => {
    fileStoreRef.current.delete(id);
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  if (!selectedBusiness) {
    return <NoBusinessSelected message="Select a business to use the AI assistant." />;
  }

  return (
    <Box sx={{ height: 'calc(100vh - 140px)', display: 'flex', flexDirection: 'column', px: { xs: 1, sm: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: { xs: 2, sm: 3 } }}>
        <Box
          sx={{
            width: { xs: 40, sm: 48 },
            height: { xs: 40, sm: 48 },
            borderRadius: 2.5,
            background: 'linear-gradient(135deg, var(--vm-primary-600) 0%, var(--vm-primary-400) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Bot size={24} color="white" />
        </Box>
        <Box sx={{ minWidth: 0 }}>
<Typography sx={{ fontSize: { xs: 14, sm: 16 }, fontWeight: 700, color: 'var(--vm-text-primary)' }}>
              AI Assistant
            </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: '#22c55e',
                boxShadow: '0 0 8px #22c55e',
              }}
            />
            <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)' }}>
              Online
            </Typography>
            {selectedBusiness && (
              <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)', ml: 1 }}>
                · Working on: {selectedBusiness.name}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 1.5, mb: { xs: 2, sm: 3 }, flexWrap: 'wrap' }}>
        {quickActions.map((action) => (
          <Box
            key={action.label}
            onClick={() => handleQuickAction(action.prompt)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              py: { xs: 0.75, sm: 1 },
              px: { xs: 1.5, sm: 2 },
              borderRadius: 2,
              border: '1px solid var(--vm-border-subtle)',
              bgcolor: 'var(--vm-bg-secondary)',
              color: 'var(--vm-text-secondary)',
              fontSize: { xs: 11, sm: 12 },
              cursor: 'pointer',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
              '&:hover': {
                borderColor: 'var(--vm-primary-600)',
                bgcolor: 'var(--vm-bg-tertiary)',
              },
            }}
          >
            <action.icon size={14} />
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
              {action.label}
            </Box>
            <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
              {action.label.split(' ')[0]}
            </Box>
          </Box>
        ))}
      </Box>

      {error && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            p: 1.5,
            mb: 2,
            borderRadius: 2,
            bgcolor: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            color: '#ef4444',
            fontSize: 13,
          }}
        >
          <AlertCircle size={16} />
          {error}
        </Box>
      )}

      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          mb: { xs: 2, sm: 3 },
          pr: 1,
          mx: { xs: -1, sm: 0 },
          px: { xs: 1, sm: 0 },
        }}
      >
        {messages.map((message) => (
          <Box
            key={message.id}
            sx={{
              display: 'flex',
              gap: { xs: 1.5, sm: 2 },
              mb: { xs: 2, sm: 3 },
              flexDirection: message.role === 'user' ? 'row-reverse' : 'row',
            }}
          >
            <Avatar
              src={message.role === 'user' ? user?.avatar : undefined}
              sx={{
                width: { xs: 32, sm: 36 },
                height: { xs: 32, sm: 36 },
                bgcolor: message.role === 'assistant' ? 'var(--vm-primary-600)' : undefined,
                flexShrink: 0,
              }}
            >
              {message.role === 'assistant' && <Bot size={18} color="white" />}
            </Avatar>
            <Box sx={{ maxWidth: { xs: '85%', sm: '80%', md: '70%' }, minWidth: 0 }}>
              <Box
                sx={{
                  p: { xs: 2, sm: 2.5 },
                  borderRadius: 3,
                  bgcolor: message.role === 'user' ? 'var(--vm-primary-600)' : 'var(--vm-bg-secondary)',
                  color: message.role === 'user' ? 'white' : 'var(--vm-text-primary)',
                  border: message.role === 'assistant' ? '1px solid var(--vm-border-subtle)' : 'none',
                  wordBreak: 'break-word',
                }}
              >
                <Typography sx={{ fontSize: { xs: 13, sm: 14 }, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {message.content}
                </Typography>
              </Box>
              {message.attachments && message.attachments.length > 0 && (
                <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
                  {message.attachments.map((file) => (
                    <Box
                      key={file.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        py: 0.5,
                        px: 1,
                        borderRadius: 1.5,
                        bgcolor: message.role === 'user' ? 'rgba(255,255,255,0.2)' : 'var(--vm-bg-tertiary)',
                        border: '1px solid',
                        borderColor: message.role === 'user' ? 'rgba(255,255,255,0.3)' : 'var(--vm-border-subtle)',
                      }}
                    >
                      {file.type === 'image' && file.url ? (
                        <Box
                          component="img"
                          src={file.url}
                          sx={{ width: 40, height: 40, borderRadius: 1, objectFit: 'cover' }}
                        />
                      ) : (
                        <FileIcon size={16} color={message.role === 'user' ? 'white' : 'var(--vm-primary-400)'} />
                      )}
                      <Typography
                        sx={{
                          fontSize: 11,
                          color: message.role === 'user' ? 'white' : 'var(--vm-text-secondary)',
                          maxWidth: 100,
                        }}
                        noWrap
                      >
                        {file.name}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
              {message.suggestions && (
                <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
                  {message.suggestions.map((suggestion, idx) => (
                    <Chip
                      key={idx}
                      size="small"
                      label={suggestion}
                      onClick={() => setInput(suggestion)}
                      sx={{
                        bgcolor: 'var(--vm-bg-tertiary)',
                        color: 'var(--vm-primary-400)',
                        fontSize: 11,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'var(--vm-primary-900)' },
                      }}
                    />
                  ))}
                </Box>
              )}
              <Typography
                sx={{
                  fontSize: 11,
                  color: 'var(--vm-text-muted)',
                  mt: 0.5,
                  textAlign: message.role === 'user' ? 'right' : 'left',
                }}
              >
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Typography>
            </Box>
          </Box>
        ))}
        {isTyping && (
          <Box sx={{ display: 'flex', gap: { xs: 1.5, sm: 2 }, mb: { xs: 2, sm: 3 } }}>
            <Avatar sx={{ width: { xs: 32, sm: 36 }, height: { xs: 32, sm: 36 }, bgcolor: 'var(--vm-primary-600)' }}>
              <Bot size={18} color="white" />
            </Avatar>
            <Box
              sx={{
                p: 2,
                borderRadius: 3,
                bgcolor: 'var(--vm-bg-secondary)',
                border: '1px solid var(--vm-border-subtle)',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  bgcolor: 'var(--vm-primary-500)',
                  animation: 'bounce 1s infinite',
                  '@keyframes bounce': {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-4px)' },
                  },
                }}
              />
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  bgcolor: 'var(--vm-primary-500)',
                  animation: 'bounce 1s infinite 0.2s',
                }}
              />
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  bgcolor: 'var(--vm-primary-500)',
                  animation: 'bounce 1s infinite 0.4s',
                }}
              />
            </Box>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {attachments.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          {attachments.map((file) => (
            <Box
              key={file.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                py: 0.75,
                px: 1.5,
                borderRadius: 2,
                bgcolor: 'var(--vm-bg-tertiary)',
                border: '1px solid var(--vm-border-subtle)',
              }}
            >
              {file.type === 'image' ? <ImageIcon size={16} color="var(--vm-primary-400)" /> : <FileIcon size={16} color="var(--vm-primary-400)" />}
              <Typography sx={{ fontSize: 12, color: 'var(--vm-text-secondary)', maxWidth: 120 }} noWrap>
                {file.name}
              </Typography>
              <Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)' }}>
                {file.size}
              </Typography>
              <IconButton size="small" onClick={() => removeAttachment(file.id)} sx={{ p: 0.5, ml: 0.5 }}>
                <X size={14} color="var(--vm-text-muted)" />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: { xs: 1, sm: 1.5 },
          borderRadius: 3,
          bgcolor: 'var(--vm-bg-secondary)',
          border: '1px solid var(--vm-border-subtle)',
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx"
          style={{ display: 'none' }}
        />
        <IconButton
          onClick={() => fileInputRef.current?.click()}
          sx={{
            width: { xs: 36, sm: 40 },
            height: { xs: 36, sm: 40 },
            color: 'var(--vm-text-muted)',
            flexShrink: 0,
            '&:hover': { color: 'var(--vm-primary-400)', bgcolor: 'var(--vm-bg-tertiary)' },
          }}
        >
          <Paperclip size={20} />
        </IconButton>
        <TextField
          fullWidth
          placeholder="Ask me anything or attach files..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          multiline
          maxRows={4}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: 'transparent',
              color: 'var(--vm-text-primary)',
              '& fieldset': { border: 'none' },
              '&:hover fieldset': { border: 'none' },
              '&.Mui-focused fieldset': { border: 'none' },
            },
            '& .MuiInputBase-input': {
              fontSize: { xs: 14, sm: 15 },
              px: { xs: 0.5, sm: 1 },
            },
          }}
        />
        <IconButton
          onClick={handleSend}
          disabled={!input.trim() && attachments.length === 0}
          sx={{
            width: { xs: 40, sm: 44 },
            height: { xs: 40, sm: 44 },
            bgcolor: (input.trim() || attachments.length > 0) ? 'var(--vm-primary-600)' : 'var(--vm-bg-tertiary)',
            color: 'white',
            flexShrink: 0,
            '&:hover': { bgcolor: (input.trim() || attachments.length > 0) ? 'var(--vm-primary-500)' : 'var(--vm-bg-tertiary)' },
          }}
        >
          <Send size={20} />
        </IconButton>
      </Box>
    </Box>
  );
}
