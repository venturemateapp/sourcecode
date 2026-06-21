import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Avatar,
  TextField,
  Badge,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
} from '@mui/material';
import { GradientButton } from '../../components/shared/buttons';
import {
  Search,
  ArrowLeft,
  MoreVertical,
  Phone,
  Video,
  Paperclip,
  Send,
  FileText,
  Image as ImageIcon,
  X,
  Smile,
  Check,
  CheckCheck,
  Filter,
  Plus,
} from 'lucide-react';
import type { ViewType, Conversation, Message } from '../../types/venturemate';

// Inline mock data (replaces ../../data imports)
const businesses = [
  {
    id: 'biz_001',
    name: 'NeuroTask AI',
    tagline: 'AI-powered task automation',
    brandKit: { primaryColor: '#059669', secondaryColor: '#10b981' },
    team: [
      { id: 'tm_001', userId: 'usr_002', name: 'Sarah Kim', email: 'sarah@example.com', role: 'cofounder', title: 'Engineering Leader', avatar: '/img1.jpeg', equity: 30, status: 'active', joinedDate: '2024-01-20', responsibilities: ['Engineering'] },
      { id: 'tm_002', userId: 'usr_001', name: 'Alex Chen', email: 'alex@example.com', role: 'founder', title: 'CEO', avatar: '/img2.jpeg', equity: 40, status: 'active', joinedDate: '2024-01-01', responsibilities: ['Leadership'] },
    ],
  },
  {
    id: 'biz_002',
    name: 'GreenCart',
    tagline: 'Sustainable grocery delivery',
    brandKit: { primaryColor: '#16a34a', secondaryColor: '#22c55e' },
    team: [
      { id: 'tm_003', userId: 'usr_003', name: 'Mike Johnson', email: 'mike@example.com', role: 'cofounder', title: 'CTO', avatar: '/img3.jpeg', equity: 35, status: 'active', joinedDate: '2024-02-01', responsibilities: ['Technology'] },
    ],
  },
];

const conversations = [
  {
    id: 'conv_001',
    participants: [
      { id: 'usr_001', name: 'Alex Chen', avatar: '/img1.jpeg', role: 'founder' as const },
      { id: 'inv_001', name: 'Sequoia Capital', avatar: '/img1.jpeg', role: 'investor' as const },
    ],
    type: 'direct' as const,
    lastMessage: { id: 'msg_001', senderId: 'inv_001', content: 'Thanks for sharing the deck. We would love to schedule a partner meeting next week.', type: 'text' as const, timestamp: '2024-04-03T18:30:00Z', readBy: ['usr_001'] },
    unreadCount: 0,
    updatedAt: '2024-04-03T18:30:00Z',
    businessId: 'biz_001',
  },
  {
    id: 'conv_002',
    participants: [
      { id: 'usr_001', name: 'Alex Chen', avatar: '/img1.jpeg', role: 'founder' as const },
      { id: 'usr_101', name: 'Sarah Kim', avatar: '/img1.jpeg', role: 'cofounder' as const },
    ],
    type: 'direct' as const,
    lastMessage: { id: 'msg_002', senderId: 'usr_101', content: 'I have some ideas for the ML pipeline. Can we discuss tomorrow?', type: 'text' as const, timestamp: '2024-04-04T05:00:00Z', readBy: [] },
    unreadCount: 1,
    updatedAt: '2024-04-04T05:00:00Z',
    businessId: 'biz_001',
  },
];

const investors = [
  {
    id: 'inv_001',
    name: 'Sequoia Capital',
    type: 'vc' as const,
    logo: '/img1.jpeg',
    location: 'Menlo Park, CA',
    focusIndustries: ['AI/ML', 'SaaS'],
    stages: ['seed', 'series-a'],
    checkSize: { min: 1000000, max: 100000000 },
    portfolio: [],
    team: [],
    thesis: 'Backing bold founders',
    criteria: ['Strong technical team'],
    matchScore: 92,
    status: 'connected' as const,
    connectedAt: '2024-03-15T00:00:00Z',
  },
];

const cofounders = [
  {
    id: 'cf_001',
    userId: 'usr_101',
    name: 'Sarah Kim',
    avatar: '/img1.jpeg',
    location: 'San Francisco, CA',
    title: 'Engineering Leader',
    bio: 'Ex-OpenAI research engineer.',
    skills: ['Machine Learning', 'Python'],
    lookingFor: ['AI Startup'],
    availability: 'full-time' as const,
    commitment: 'co-founder' as const,
    previousExperience: [],
    education: [],
    matchScore: 95,
    status: 'connected' as const,
  },
];

interface MessagesProps {
  onViewChange?: (_view: ViewType) => void;
}

// Extended mock messages for each conversation
const conversationMessages: Record<string, Message[]> = {
  'conv_001': [
    { id: 'm1', senderId: 'usr_001', content: 'Hi team, thanks for considering our pitch.', type: 'text', timestamp: '2024-04-03T10:00:00Z', readBy: ['inv_001'] },
    { id: 'm2', senderId: 'inv_001', content: 'Thanks for sharing the deck. We would love to schedule a partner meeting next week.', type: 'text', timestamp: '2024-04-03T18:30:00Z', readBy: ['usr_001'] },
  ],
  'conv_002': [
    { id: 'm1', senderId: 'usr_001', content: 'Hey Sarah, how is the model training going?', type: 'text', timestamp: '2024-04-04T04:00:00Z', readBy: ['usr_101'] },
    { id: 'm2', senderId: 'usr_101', content: 'I have some ideas for the ML pipeline. Can we discuss tomorrow?', type: 'text', timestamp: '2024-04-04T05:00:00Z', readBy: [] },
  ],
  'conv_003': [
    { id: 'm1', senderId: 'usr_001', content: 'Thank you for the introduction!', type: 'text', timestamp: '2024-04-02T13:00:00Z', readBy: ['inv_021'] },
    { id: 'm2', senderId: 'inv_021', content: 'Your traction looks solid. Lets set up a call with the full partnership.', type: 'text', timestamp: '2024-04-02T14:00:00Z', readBy: ['usr_001'] },
  ],
  'conv_004': [
    { id: 'm1', senderId: 'usr_002', content: 'Team, the new model is ready for testing.', type: 'text', timestamp: '2024-04-03T21:00:00Z', readBy: ['usr_001', 'usr_003'] },
    { id: 'm2', senderId: 'usr_002', content: 'Deployed the new ML model. 15% improvement in accuracy!', type: 'text', timestamp: '2024-04-03T22:00:00Z', readBy: ['usr_001', 'usr_003'] },
  ],
  'conv_005': [
    { id: 'm1', senderId: 'cf_004', content: 'Should we start with the brand identity?', type: 'text', timestamp: '2024-04-01T09:00:00Z', readBy: ['cf_007', 'usr_001'] },
    { id: 'm2', senderId: 'cf_007', content: 'I have some initial brand concepts. Sharing the Figma link now.', type: 'text', timestamp: '2024-04-01T10:00:00Z', readBy: ['usr_001'] },
  ],
};

// Common emojis
const commonEmojis = ['😀', '😂', '🥰', '😎', '🤔', '👍', '👎', '👏', '🙏', '🔥', '💯', '❤️', '🎉', '✅', '⚠️', '🚀', '💡', '📊', '💰', '🤝', '👋', '😊', '😉', '🤯', '💪'];

export function MessagesPage({ onViewChange: _onViewChange }: MessagesProps) {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(conversations[0]);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [messageInput, setMessageInput] = useState('');
  const [emojiAnchorEl, setEmojiAnchorEl] = useState<null | HTMLElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'investors' | 'cofounders'>('all');
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>(conversationMessages);
  const [conversationsList, setConversationsList] = useState<Conversation[]>(conversations);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [newChatModalOpen, setNewChatModalOpen] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState('');
  const [newChatType, setNewChatType] = useState<'all' | 'investors' | 'cofounders' | 'team'>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConversation, messagesMap]);

  const getOtherParticipant = (conversation: Conversation) => {
    return conversation.participants.find(p => p.id !== 'usr_001') || conversation.participants[0];
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString('en-GB', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
    }
  };

  const filteredConversations = conversationsList.filter(conv => {
    const other = getOtherParticipant(conv);
    const matchesSearch = other.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (conv.lastMessage?.content || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    switch (activeFilter) {
      case 'unread':
        return conv.unreadCount > 0;
      case 'investors':
        return other.role === 'investor';
      case 'cofounders':
        return other.role === 'cofounder';
      default:
        return true;
    }
  });

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...files].slice(0, 5)); // Max 5 files
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const removeSelectedFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon size={20} color="var(--vm-primary-400)" />;
    return <FileText size={20} color="var(--vm-primary-400)" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const handleSendMessage = () => {
    if ((!messageInput.trim() && selectedFiles.length === 0) || !selectedConversation) return;
    
    const timestamp = new Date().toISOString();
    const newMessages: Message[] = [];
    
    // Add text message if exists
    if (messageInput.trim()) {
      newMessages.push({
        id: `msg_${Date.now()}`,
        senderId: 'usr_001',
        content: messageInput.trim(),
        type: 'text',
        timestamp,
        readBy: [],
      });
    }
    
    // Add file messages
    selectedFiles.forEach((file, idx) => {
      newMessages.push({
        id: `msg_${Date.now()}_${idx}`,
        senderId: 'usr_001',
        content: `📎 ${file.name} (${formatFileSize(file.size)})`,
        type: 'file',
        timestamp,
        readBy: [],
      });
    });
    
    // Add messages to conversation
    setMessagesMap((prev) => ({
      ...prev,
      [selectedConversation.id]: [...(prev[selectedConversation.id] || []), ...newMessages],
    }));
    
    // Update conversation last message
    if (newMessages.length > 0) {
      setConversationsList((prev) =>
        prev.map((conv) =>
          conv.id === selectedConversation.id
            ? { ...conv, lastMessage: newMessages[newMessages.length - 1], updatedAt: timestamp }
            : conv
        )
      );
    }
    
    setMessageInput('');
    setSelectedFiles([]);
  };

  const getMessages = (conversationId: string): Message[] => {
    return messagesMap[conversationId] || [];
  };

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      {/* Conversations Sidebar */}
      <Box
        sx={{
          width: { md: 360 },
          display: { xs: mobileView === 'chat' ? 'none' : 'flex', md: 'flex' },
          flexDirection: 'column',
          bgcolor: 'var(--vm-bg-secondary)',
          borderRight: '1px solid var(--vm-border-subtle)',
        }}
      >
        {/* Header */}
        <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, borderBottom: '1px solid var(--vm-border-subtle)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography sx={{ fontSize: { xs: 20, sm: 24 }, fontWeight: 700, color: 'var(--vm-text-primary)' }}>
              Messages
            </Typography>
            <GradientButton 
              variant="primary" 
              size="sm"
              onClick={() => setNewChatModalOpen(true)}
            >
              <Plus size={18} />
            </GradientButton>
          </Box>
          
          {/* Search */}
          <TextField
            fullWidth
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} color="var(--vm-text-muted)" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton 
                    size="small"
                    onClick={(e) => setFilterAnchorEl(e.currentTarget)}
                    sx={{ color: activeFilter !== 'all' ? 'var(--vm-primary-400)' : 'var(--vm-text-muted)' }}
                  >
                    <Filter size={16} />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: 'var(--vm-bg-tertiary)',
                borderRadius: 2,
                color: 'var(--vm-text-primary)',
                '& fieldset': { borderColor: 'transparent' },
                '&:hover fieldset': { borderColor: 'var(--vm-border-subtle)' },
                '&.Mui-focused fieldset': { borderColor: 'var(--vm-primary-600)' },
              },
            }}
          />
          
          {/* Filter Menu */}
          <Menu
            anchorEl={filterAnchorEl}
            open={Boolean(filterAnchorEl)}
            onClose={() => setFilterAnchorEl(null)}
            PaperProps={{
              sx: {
                bgcolor: 'var(--vm-bg-secondary)',
                border: '1px solid var(--vm-border-subtle)',
                mt: 1,
              },
            }}
          >
            {[
              { value: 'all', label: 'All Messages' },
              { value: 'unread', label: 'Unread Only' },
              { value: 'investors', label: 'Investors' },
              { value: 'cofounders', label: 'Co-founders' },
            ].map((filter) => (
              <MenuItem
                key={filter.value}
                onClick={() => {
                  setActiveFilter(filter.value as any);
                  setFilterAnchorEl(null);
                }}
                sx={{
                  color: activeFilter === filter.value ? 'var(--vm-primary-400)' : 'var(--vm-text-primary)',
                  bgcolor: activeFilter === filter.value ? 'var(--vm-primary-900)' : 'transparent',
                }}
              >
                {filter.label}
              </MenuItem>
            ))}
          </Menu>
        </Box>

        {/* Conversations List */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {filteredConversations.map((conversation) => {
            const other = getOtherParticipant(conversation);
            const isSelected = selectedConversation?.id === conversation.id;
            const lastMessage = conversation.lastMessage;
            
            return (
              <Box
                key={conversation.id}
                onClick={() => {
                  setSelectedConversation(conversation);
                  setMobileView('chat');
                }}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 2,
                  p: 2,
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--vm-border-subtle)',
                  bgcolor: isSelected ? 'var(--vm-bg-tertiary)' : 'transparent',
                  '&:hover': { bgcolor: isSelected ? 'var(--vm-bg-tertiary)' : 'var(--vm-bg-hover)' },
                }}
              >
                <Badge
                  badgeContent={conversation.unreadCount}
                  color="primary"
                  invisible={conversation.unreadCount === 0}
                  sx={{
                    '& .MuiBadge-badge': {
                      bgcolor: 'var(--vm-primary-600)',
                      fontSize: 10,
                      minWidth: 18,
                      height: 18,
                    },
                  }}
                >
                  <Avatar src={other.avatar} sx={{ width: 48, height: 48 }} />
                </Badge>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography
                      sx={{
                        fontSize: 14,
                        fontWeight: conversation.unreadCount > 0 ? 600 : 500,
                        color: 'var(--vm-text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {conversation.title || other.name}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)', flexShrink: 0, ml: 1 }}>
                      {formatTime(lastMessage?.timestamp || conversation.updatedAt)}
                    </Typography>
                  </Box>
                  <Typography
                    sx={{
                      fontSize: 13,
                      color: conversation.unreadCount > 0 ? 'var(--vm-text-primary)' : 'var(--vm-text-muted)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontWeight: conversation.unreadCount > 0 ? 500 : 400,
                    }}
                  >
                    {lastMessage?.content || 'No messages yet'}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* Chat Area */}
      {selectedConversation && (
        <Box sx={{
          flex: 1,
          display: { xs: mobileView === 'chat' ? 'flex' : 'none', md: 'flex' },
          flexDirection: 'column',
          bgcolor: 'var(--vm-bg-primary)',
        }}>
          {/* Chat Header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              borderBottom: '1px solid var(--vm-border-subtle)',
              bgcolor: 'var(--vm-bg-secondary)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton
                onClick={() => setMobileView('list')}
                sx={{ display: { xs: 'inline-flex', md: 'none' }, color: 'var(--vm-text-muted)' }}
              >
                <ArrowLeft size={20} />
              </IconButton>
              <Avatar src={getOtherParticipant(selectedConversation).avatar} sx={{ width: 40, height: 40 }} />
              <Box>
                <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'var(--vm-text-primary)' }}>
                  {selectedConversation.title || getOtherParticipant(selectedConversation).name}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: '#22c55e',
                    }}
                  />
                  <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>
                    Active now
                  </Typography>
                </Box>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton sx={{ color: 'var(--vm-text-muted)', '&:hover': { color: 'var(--vm-text-primary)' } }}>
                <Phone size={20} />
              </IconButton>
              <IconButton sx={{ color: 'var(--vm-text-muted)', '&:hover': { color: 'var(--vm-text-primary)' } }}>
                <Video size={20} />
              </IconButton>
              <IconButton sx={{ color: 'var(--vm-text-muted)', '&:hover': { color: 'var(--vm-text-primary)' } }}>
                <MoreVertical size={20} />
              </IconButton>
            </Box>
          </Box>

          {/* Messages */}
          <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
            {getMessages(selectedConversation.id).map((message, idx, arr) => {
              const isMe = message.senderId === 'usr_001';
              const showAvatar = idx === 0 || arr[idx - 1].senderId !== message.senderId;
              
              return (
                <Box
                  key={message.id}
                  sx={{
                    display: 'flex',
                    justifyContent: isMe ? 'flex-end' : 'flex-start',
                    mb: 2,
                    gap: 1.5,
                  }}
                >
                  {!isMe && showAvatar && (
                    <Avatar
                      src={selectedConversation.participants.find(p => p.id === message.senderId)?.avatar}
                      sx={{ width: 32, height: 32, mt: 0.5 }}
                    />
                  )}
                  {!isMe && !showAvatar && <Box sx={{ width: 32 }} />}
                  
                  <Box sx={{ maxWidth: '70%' }}>
                    <Box
                      sx={{
                        px: 2.5,
                        py: 1.5,
                        borderRadius: 3,
                        bgcolor: isMe ? 'var(--vm-primary-600)' : 'var(--vm-bg-tertiary)',
                        color: isMe ? 'white' : 'var(--vm-text-primary)',
                        borderBottomRightRadius: isMe ? 0 : 12,
                        borderBottomLeftRadius: isMe ? 12 : 0,
                      }}
                    >
                      <Typography sx={{ fontSize: 14, lineHeight: 1.5 }}>
                        {message.content}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        mt: 0.5,
                        justifyContent: isMe ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)' }}>
                        {formatTime(message.timestamp)}
                      </Typography>
                      {isMe && (
                        message.readBy.length > 0 ? (
                          <CheckCheck size={14} color="var(--vm-primary-400)" />
                        ) : (
                          <Check size={14} color="var(--vm-text-muted)" />
                        )
                      )}
                    </Box>
                  </Box>
                </Box>
              );
            })}
            <div ref={messagesEndRef} />
          </Box>

          {/* Message Input */}
          <Box
            sx={{
              p: 2,
              borderTop: '1px solid var(--vm-border-subtle)',
              bgcolor: 'var(--vm-bg-secondary)',
            }}
          >
            {/* Selected Files */}
            {selectedFiles.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {selectedFiles.map((file, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      px: 1.5,
                      py: 0.75,
                      bgcolor: 'var(--vm-bg-tertiary)',
                      borderRadius: 2,
                      border: '1px solid var(--vm-border-subtle)',
                    }}
                  >
                    {getFileIcon(file.type)}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        sx={{
                          fontSize: 12,
                          color: 'var(--vm-text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: 120,
                        }}
                      >
                        {file.name}
                      </Typography>
                      <Typography sx={{ fontSize: 10, color: 'var(--vm-text-muted)' }}>
                        {formatFileSize(file.size)}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => removeSelectedFile(index)}
                      sx={{ color: 'var(--vm-text-muted)', p: 0.5 }}
                    >
                      <X size={14} />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
              />
              <IconButton 
                sx={{ color: selectedFiles.length > 0 ? 'var(--vm-primary-400)' : 'var(--vm-text-muted)' }}
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip size={20} />
              </IconButton>
              <TextField
                fullWidth
                placeholder={selectedFiles.length > 0 ? 'Add a message (optional)...' : 'Type a message...'}
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'var(--vm-bg-tertiary)',
                    borderRadius: 3,
                    color: 'var(--vm-text-primary)',
                    '& fieldset': { borderColor: 'transparent' },
                    '&:hover fieldset': { borderColor: 'var(--vm-border-subtle)' },
                    '&.Mui-focused fieldset': { borderColor: 'var(--vm-primary-600)' },
                  },
                }}
              />
              <IconButton 
                sx={{ color: emojiAnchorEl ? 'var(--vm-primary-400)' : 'var(--vm-text-muted)' }}
                onClick={(e) => setEmojiAnchorEl(e.currentTarget)}
              >
                <Smile size={20} />
              </IconButton>
              {/* Emoji Picker Menu */}
              <Menu
                anchorEl={emojiAnchorEl}
                open={Boolean(emojiAnchorEl)}
                onClose={() => setEmojiAnchorEl(null)}
                PaperProps={{
                  sx: {
                    bgcolor: 'var(--vm-bg-secondary)',
                    border: '1px solid var(--vm-border-subtle)',
                    p: 1,
                    width: 280,
                  },
                }}
              >
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0.5 }}>
                  {commonEmojis.map((emoji) => (
                    <Box
                      key={emoji}
                      onClick={() => {
                        setMessageInput((prev) => prev + emoji);
                        setEmojiAnchorEl(null);
                      }}
                      sx={{
                        p: 1,
                        borderRadius: 1,
                        cursor: 'pointer',
                        textAlign: 'center',
                        fontSize: 24,
                        '&:hover': { bgcolor: 'var(--vm-bg-tertiary)' },
                      }}
                    >
                      {emoji}
                    </Box>
                  ))}
                </Box>
              </Menu>
              <GradientButton
                variant="primary"
                size="sm"
                onClick={handleSendMessage}
                disabled={!messageInput.trim() && selectedFiles.length === 0}
              >
                <Send size={18} />
              </GradientButton>
            </Box>
          </Box>
        </Box>
      )}

      {/* Empty State (shown when no conversation is selected, hidden on mobile in chat view) */}
      {!selectedConversation && (
        <Box
          sx={{
            flex: 1,
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'var(--vm-bg-primary)',
          }}
        >
          <Box
            sx={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              bgcolor: 'var(--vm-bg-tertiary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 3,
            }}
          >
            <Send size={48} color="var(--vm-primary-400)" />
          </Box>
          <Typography sx={{ fontSize: 20, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 1 }}>
            Your Messages
          </Typography>
          <Typography sx={{ fontSize: 14, color: 'var(--vm-text-muted)', textAlign: 'center', maxWidth: 400 }}>
            Your conversations with investors and co-founders will appear here.
            <br />
            Select a conversation to start chatting.
          </Typography>
        </Box>
      )}

      {/* New Chat Modal */}
      <Dialog
        open={newChatModalOpen}
        onClose={() => setNewChatModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'var(--vm-bg-secondary)',
            color: 'var(--vm-text-primary)',
            borderRadius: 3,
            maxHeight: '80vh',
          },
        }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid var(--vm-border-subtle)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography sx={{ fontSize: 18, fontWeight: 600 }}>
              New Message
            </Typography>
            <IconButton 
              onClick={() => setNewChatModalOpen(false)}
              sx={{ color: 'var(--vm-text-muted)' }}
            >
              <X size={20} />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {/* Search */}
          <Box sx={{ p: 2, borderBottom: '1px solid var(--vm-border-subtle)' }}>
            <TextField
              fullWidth
              placeholder="Search investors or co-founders..."
              value={newChatSearch}
              onChange={(e) => setNewChatSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={18} color="var(--vm-text-muted)" />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'var(--vm-bg-tertiary)',
                  borderRadius: 2,
                  color: 'var(--vm-text-primary)',
                  '& fieldset': { borderColor: 'transparent' },
                  '&:hover fieldset': { borderColor: 'var(--vm-border-subtle)' },
                  '&.Mui-focused fieldset': { borderColor: 'var(--vm-primary-600)' },
                },
              }}
            />
          </Box>
          
          {/* Filter Tabs */}
          <Box sx={{ display: 'flex', gap: 1, px: 2, py: 1, borderBottom: '1px solid var(--vm-border-subtle)' }}>
            {[
              { value: 'all', label: 'All' },
              { value: 'investors', label: 'Investors' },
              { value: 'cofounders', label: 'Co-founders' },
              { value: 'team', label: 'Team' },
            ].map((tab) => (
              <Box
                key={tab.value}
                onClick={() => setNewChatType(tab.value as any)}
                sx={{
                  px: 2,
                  py: 0.75,
                  borderRadius: 2,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 500,
                  bgcolor: newChatType === tab.value ? 'var(--vm-primary-900)' : 'transparent',
                  color: newChatType === tab.value ? 'var(--vm-primary-400)' : 'var(--vm-text-muted)',
                  '&:hover': { bgcolor: newChatType === tab.value ? 'var(--vm-primary-900)' : 'var(--vm-bg-tertiary)' },
                }}
              >
                {tab.label}
              </Box>
            ))}
          </Box>
          
          {/* Contacts List */}
          <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
            {/* Investors */}
            {(newChatType === 'all' || newChatType === 'investors') && (
              <>
                <Typography sx={{ px: 2, py: 1, fontSize: 12, fontWeight: 600, color: 'var(--vm-text-muted)', textTransform: 'uppercase' }}>
                  Investors
                </Typography>
                {investors
                  .filter((inv) => inv.name.toLowerCase().includes(newChatSearch.toLowerCase()))
                  .slice(0, 5)
                  .map((investor) => (
                    <Box
                      key={investor.id}
                      onClick={() => {
                        // Create new conversation
                        const newConv: Conversation = {
                          id: `conv_${Date.now()}`,
                          participants: [
                            { id: 'usr_001', name: 'You', avatar: '/img1.jpeg', role: 'founder' },
                            { id: investor.id, name: investor.name, avatar: investor.logo, role: 'investor' },
                          ],
                          type: 'direct',
                          lastMessage: {
                            id: `msg_${Date.now()}`,
                            senderId: 'system',
                            content: 'Started a conversation',
                            type: 'system',
                            timestamp: new Date().toISOString(),
                            readBy: [],
                          },
                          unreadCount: 0,
                          updatedAt: new Date().toISOString(),
                        };
                        setConversationsList((prev) => [newConv, ...prev]);
                        setMessagesMap((prev) => ({ ...prev, [newConv.id]: [] }));
                        setSelectedConversation(newConv);
                        setNewChatModalOpen(false);
                        setNewChatSearch('');
                      }}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        px: 2,
                        py: 1.5,
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--vm-border-subtle)',
                        '&:hover': { bgcolor: 'var(--vm-bg-tertiary)' },
                      }}
                    >
                      <Avatar src={investor.logo} sx={{ width: 40, height: 40 }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontSize: 14, fontWeight: 500, color: 'var(--vm-text-primary)' }}>
                          {investor.name}
                        </Typography>
                        <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>
                          {investor.type} • {investor.location}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
              </>
            )}
            
            {/* Co-founders */}
            {(newChatType === 'all' || newChatType === 'cofounders') && (
              <>
                <Typography sx={{ px: 2, py: 1, fontSize: 12, fontWeight: 600, color: 'var(--vm-text-muted)', textTransform: 'uppercase' }}>
                  Co-founders
                </Typography>
                {cofounders
                  .filter((cf) => cf.name.toLowerCase().includes(newChatSearch.toLowerCase()))
                  .slice(0, 5)
                  .map((cofounder) => (
                    <Box
                      key={cofounder.id}
                      onClick={() => {
                        // Create new conversation
                        const newConv: Conversation = {
                          id: `conv_${Date.now()}`,
                          participants: [
                            { id: 'usr_001', name: 'You', avatar: '/img1.jpeg', role: 'founder' },
                            { id: cofounder.id, name: cofounder.name, avatar: cofounder.avatar, role: 'cofounder' },
                          ],
                          type: 'direct',
                          lastMessage: {
                            id: `msg_${Date.now()}`,
                            senderId: 'system',
                            content: 'Started a conversation',
                            type: 'system',
                            timestamp: new Date().toISOString(),
                            readBy: [],
                          },
                          unreadCount: 0,
                          updatedAt: new Date().toISOString(),
                        };
                        setConversationsList((prev) => [newConv, ...prev]);
                        setMessagesMap((prev) => ({ ...prev, [newConv.id]: [] }));
                        setSelectedConversation(newConv);
                        setNewChatModalOpen(false);
                        setNewChatSearch('');
                      }}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        px: 2,
                        py: 1.5,
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--vm-border-subtle)',
                        '&:hover': { bgcolor: 'var(--vm-bg-tertiary)' },
                      }}
                    >
                      <Avatar src={cofounder.avatar} sx={{ width: 40, height: 40 }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontSize: 14, fontWeight: 500, color: 'var(--vm-text-primary)' }}>
                          {cofounder.name}
                        </Typography>
                        <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>
                          {cofounder.title} • {cofounder.location}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
              </>
            )}
            
            {/* Team Members */}
            {(newChatType === 'all' || newChatType === 'team') && (
              <>
                <Typography sx={{ px: 2, py: 1, fontSize: 12, fontWeight: 600, color: 'var(--vm-text-muted)', textTransform: 'uppercase' }}>
                  Team Members
                </Typography>
                {businesses
                  .flatMap((biz) => biz.team)
                  .filter((member) => 
                    member.name.toLowerCase().includes(newChatSearch.toLowerCase()) &&
                    member.userId !== 'usr_001' // Exclude current user
                  )
                  .slice(0, 8)
                  .map((member) => (
                    <Box
                      key={member.id}
                      onClick={() => {
                        // Create new conversation
                        const newConv: Conversation = {
                          id: `conv_${Date.now()}`,
                          participants: [
                            { id: 'usr_001', name: 'You', avatar: '/img1.jpeg', role: 'founder' },
                            { id: member.id, name: member.name, avatar: member.avatar, role: 'cofounder' },
                          ],
                          type: 'direct',
                          lastMessage: {
                            id: `msg_${Date.now()}`,
                            senderId: 'system',
                            content: 'Started a conversation',
                            type: 'system',
                            timestamp: new Date().toISOString(),
                            readBy: [],
                          },
                          unreadCount: 0,
                          updatedAt: new Date().toISOString(),
                        };
                        setConversationsList((prev) => [newConv, ...prev]);
                        setMessagesMap((prev) => ({ ...prev, [newConv.id]: [] }));
                        setSelectedConversation(newConv);
                        setNewChatModalOpen(false);
                        setNewChatSearch('');
                      }}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        px: 2,
                        py: 1.5,
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--vm-border-subtle)',
                        '&:hover': { bgcolor: 'var(--vm-bg-tertiary)' },
                      }}
                    >
                      <Avatar src={member.avatar} sx={{ width: 40, height: 40 }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontSize: 14, fontWeight: 500, color: 'var(--vm-text-primary)' }}>
                          {member.name}
                        </Typography>
                        <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>
                          {member.title} • {member.role}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
              </>
            )}
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
