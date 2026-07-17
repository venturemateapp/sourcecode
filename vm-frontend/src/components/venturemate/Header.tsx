import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  IconButton,
  Avatar,
  Badge,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Tooltip,
  Button,
} from '@mui/material';
import { Person, CameraAlt, Settings as SettingsIcon, Logout } from '@mui/icons-material';
import {
  Menu as MenuIcon,
  Bell,
  BellRing,
  Search,
  MessageSquare,
  X,
  Check,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';

import { BusinessSwitcher } from './BusinessSwitcher';
import type { ViewType } from '../../types/venturemate';

interface HeaderProps {
  onMenuClick: () => void;
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
}

const viewTitles: Record<ViewType, string> = {
  dashboard: 'Dashboard',
  businesses: 'My Businesses',
  'business-overview': 'Business Overview',
  'ai-assistant': 'AI Assistant',
  'pitch-deck': 'Pitch Deck',
  'business-plan': 'Business Plan',
  'branding-kit': 'Branding Kit',
  'website-builder': 'Website Builder',
  websites: 'Websites',
  milestones: 'Milestones',
  documents: 'Documents',
  team: 'Team',
  'business-settings': 'Settings',
  network: 'Network',
  investors: 'Investors',
  cofounders: 'Co-founders',
  messages: 'Messages',
  'ai-tools': 'AI Tools',
  'generate-idea': 'Generate Idea',
  'market-research': 'Market Research',
  'financial-forecast': 'Financial Forecast',
  crm: 'CRM',
  companies: 'Companies',
  invoices: 'Invoices',
  expenditure: 'Expenditure',
  banking: 'Banking',
  social: 'Social Media',
  marketplace: 'Marketplace',
  'credit-score': 'Credit Score',
  'health-score': 'Health Score',
  account: 'Account',
  profile: 'Profile',
  billing: 'Billing',
  settings: 'Settings',
};

export function Header({
  onMenuClick,
  activeView,
  onViewChange,
}: HeaderProps) {
  const { user, updateProfile, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, deleteAllRead } = useNotifications();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifAnchor, setNotifAnchor] = useState<null | HTMLElement>(null);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const unreadMessages = 0;

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      updateProfile({ avatar: dataUrl });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleUserMenuClick = (action: 'settings' | 'logout') => {
    setUserMenuAnchor(null);
    if (action === 'logout') {
      logout();
      navigate('/vm/auth/signin');
      return;
    }
    onViewChange(action);
  };

  const typeIcon: Record<string, string> = {
    message: '💬',
    milestone: '🎯',
    match: '🤝',
    investor_match: '🤝',
    document_shared: '📄',
    team_invite: '👥',
    connection_request: '🔗',
    'ai-complete': '🤖',
    system: '🔔',
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
  };

  return (
    <Box
      sx={{
        height: { xs: 52, md: 'var(--vm-header-height)' },
        bgcolor: 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: { xs: 1.5, sm: 2, md: 3 },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, md: 2 }, flex: { xs: searchOpen ? 1 : undefined, sm: undefined } }}>
        <IconButton
          onClick={onMenuClick}
          sx={{
            display: { md: 'none' },
            color: 'var(--vm-text-secondary)',
            p: { xs: 0.5, md: 0.75 },
          }}
        >
          <MenuIcon size={20} />
        </IconButton>

        <Box sx={{ display: { xs: searchOpen ? 'none' : 'flex', sm: 'flex' }, alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          <BusinessSwitcher onViewChange={onViewChange} />
          <Typography
            sx={{
              fontSize: { xs: 16, sm: 20 },
              fontWeight: 700,
              color: 'var(--vm-text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: { xs: 120, sm: 'none' },
              display: { xs: 'none', sm: 'block' },
            }}
          >
            {viewTitles[activeView] || 'VentureMate'}
          </Typography>
        </Box>

        <Box
          sx={{
            display: { xs: searchOpen ? 'flex' : 'none', sm: 'none' },
            alignItems: 'center',
            gap: 0.5,
            flex: 1,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              bgcolor: 'var(--vm-bg-secondary)',
              border: '1px solid var(--vm-border-subtle)',
              borderRadius: 2,
              px: 1.5,
              py: 0.5,
              flex: 1,
            }}
          >
            <Search size={14} color="var(--vm-text-muted)" />
            <Typography
              component="input"
              placeholder="Search..."
              autoFocus
              sx={{
                bgcolor: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--vm-text-primary)',
                fontSize: 13,
                width: '100%',
                '&::placeholder': { color: 'var(--vm-text-muted)' },
              }}
            />
          </Box>
          <IconButton onClick={() => setSearchOpen(false)} size="small" sx={{ color: 'var(--vm-text-secondary)', p: 0.5 }}>
            <X size={16} />
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: { xs: 0.25, sm: 1 } }}>
        <IconButton
          onClick={() => setSearchOpen(true)}
          sx={{ display: { xs: searchOpen ? 'none' : 'inline-flex', sm: 'none' }, color: 'var(--vm-text-secondary)', p: { xs: 0.5, md: 0.75 } }}
        >
          <Search size={18} />
        </IconButton>

        <Box
          sx={{
            display: { xs: 'none', sm: 'flex' },
            alignItems: 'center',
            gap: 1,
            bgcolor: 'var(--vm-bg-secondary)',
            border: '1px solid var(--vm-border-subtle)',
            borderRadius: 2,
            px: 2,
            py: 0.75,
            minWidth: { sm: 200, md: 240 },
          }}
        >
          <Search size={16} color="var(--vm-text-muted)" />
          <Typography
            component="input"
            placeholder="Search anything..."
            sx={{
              bgcolor: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--vm-text-primary)',
              fontSize: 13,
              width: '100%',
              '&::placeholder': { color: 'var(--vm-text-muted)' },
            }}
          />
        </Box>

        <Tooltip title="Messages">
          <IconButton
            onClick={() => onViewChange('messages')}
            sx={{ color: 'var(--vm-text-secondary)', p: { xs: 0.5, md: 0.75 } }}
          >
            <Badge
              badgeContent={unreadMessages}
              color="error"
              sx={{ '& .MuiBadge-badge': { fontSize: { xs: 9, md: 10 }, minWidth: { xs: 14, md: 16 }, height: { xs: 14, md: 16 } } }}
            >
              <MessageSquare size={18} />
            </Badge>
          </IconButton>
        </Tooltip>

        <Tooltip title="Notifications">
          <IconButton
            onClick={(e) => setNotifAnchor(e.currentTarget)}
            sx={{ color: 'var(--vm-text-secondary)', p: { xs: 0.5, md: 0.75 } }}
          >
            <Badge
              badgeContent={unreadCount}
              color="error"
              sx={{ '& .MuiBadge-badge': { fontSize: { xs: 9, md: 10 }, minWidth: { xs: 14, md: 16 }, height: { xs: 14, md: 16 } } }}
            >
              {unreadCount > 0 ? <BellRing size={18} /> : <Bell size={18} />}
            </Badge>
          </IconButton>
        </Tooltip>

        <Menu
          anchorEl={notifAnchor}
          open={Boolean(notifAnchor)}
          onClose={() => setNotifAnchor(null)}
          PaperProps={{
            sx: {
              bgcolor: 'var(--vm-bg-secondary)',
              border: '1px solid var(--vm-border-subtle)',
              borderRadius: 2,
              mt: 1.5,
              minWidth: 360,
              maxHeight: 480,
            },
          }}
        >
          <Box sx={{ p: 2, borderBottom: '1px solid var(--vm-border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'var(--vm-text-primary)' }}>
              Notifications {unreadCount > 0 && `(${unreadCount})`}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
              {unreadCount > 0 && (
                <Button size="small" onClick={markAllAsRead} sx={{ fontSize: 11, color: 'var(--vm-primary-400)', minWidth: 'auto', p: 0.5 }}>
                  <Check size={14} style={{ marginRight: 2 }} /> Mark all read
                </Button>
              )}
              <Button size="small" onClick={deleteAllRead} sx={{ fontSize: 11, color: 'var(--vm-text-muted)', minWidth: 'auto', p: 0.5 }}>
                <Trash2 size={14} style={{ marginRight: 2 }} /> Clear read
              </Button>
            </Box>
          </Box>

          <Box sx={{ maxHeight: 360, overflow: 'auto' }}>
            {notifications.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Bell size={32} style={{ opacity: 0.2, margin: '0 auto 8px', color: 'var(--vm-text-muted)' }} />
                <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)' }}>
                  No notifications yet
                </Typography>
              </Box>
            ) : (
              notifications.map((n) => (
                <Box
                  key={n.id}
                  sx={{
                    display: 'flex',
                    gap: 1.5,
                    p: 2,
                    borderBottom: '1px solid var(--vm-border-subtle)',
                    bgcolor: n.read ? 'transparent' : 'rgba(var(--vm-primary-600-rgb), 0.04)',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'var(--vm-bg-tertiary)' },
                  }}
                  onClick={() => {
                    if (!n.read) markAsRead(n.id);
                    if (n.actionUrl) onViewChange(n.actionUrl as ViewType);
                    setNotifAnchor(null);
                  }}
                >
                  <Box sx={{ fontSize: 20, flexShrink: 0, mt: 0.25 }}>
                    {typeIcon[n.type] || '🔔'}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: n.read ? 400 : 600, color: 'var(--vm-text-primary)' }}>
                      {n.title}
                    </Typography>
                    {n.description && (
                      <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)', mt: 0.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {n.description}
                      </Typography>
                    )}
                    <Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)', mt: 0.5 }}>
                      {formatTime(n.createdAt)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flexShrink: 0 }}>
                    {!n.read && (
                      <IconButton
                        size="small"
                        onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}
                        sx={{ color: 'var(--vm-primary-400)', p: 0.5 }}
                      >
                        <Check size={14} />
                      </IconButton>
                    )}
                    <IconButton
                      size="small"
                      onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                      sx={{ color: 'var(--vm-text-muted)', p: 0.5 }}
                    >
                      <Trash2 size={14} />
                    </IconButton>
                  </Box>
                </Box>
              ))
            )}
          </Box>
        </Menu>

        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
        <Avatar
          src={user?.avatar || undefined}
          onClick={(e) => setUserMenuAnchor(e.currentTarget)}
          sx={{
            width: { xs: 28, md: 36 },
            height: { xs: 28, md: 36 },
            cursor: 'pointer',
            border: '2px solid var(--vm-primary-600)',
            ml: { xs: 0.25, md: 1 },
            bgcolor: user?.avatar ? 'transparent' : 'var(--vm-primary-600)',
          }}
        >
          {!user?.avatar && <Person sx={{ fontSize: { xs: 16, md: 20 } }} />}
        </Avatar>
        <Menu
          anchorEl={userMenuAnchor}
          open={Boolean(userMenuAnchor)}
          onClose={() => setUserMenuAnchor(null)}
          onClick={() => setUserMenuAnchor(null)}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          slotProps={{
            paper: {
              sx: {
                bgcolor: 'var(--vm-bg-secondary)',
                border: '1px solid var(--vm-border-subtle)',
                borderRadius: 2,
                mt: 1,
                minWidth: 200,
              },
            },
          }}
        >
          <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid var(--vm-border-subtle)' }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'var(--vm-text-primary)' }}>
              {user?.firstName} {user?.lastName}
            </Typography>
            <Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)', mt: 0.25 }}>
              {user?.email}
            </Typography>
          </Box>
          <MenuItem onClick={() => { fileInputRef.current?.click(); setUserMenuAnchor(null); }} sx={{ py: 1.5, '&:hover': { bgcolor: 'var(--vm-bg-hover)' } }}>
            <ListItemIcon sx={{ minWidth: 32, color: 'var(--vm-text-muted)' }}>
              <CameraAlt sx={{ fontSize: 18 }} />
            </ListItemIcon>
            <ListItemText>
              <Typography sx={{ fontSize: 13, color: 'var(--vm-text-primary)' }}>Change Picture</Typography>
            </ListItemText>
          </MenuItem>
          <MenuItem onClick={() => handleUserMenuClick('settings')} sx={{ py: 1.5, '&:hover': { bgcolor: 'var(--vm-bg-hover)' } }}>
            <ListItemIcon sx={{ minWidth: 32, color: 'var(--vm-text-muted)' }}>
              <SettingsIcon sx={{ fontSize: 18 }} />
            </ListItemIcon>
            <ListItemText>
              <Typography sx={{ fontSize: 13, color: 'var(--vm-text-primary)' }}>Settings</Typography>
            </ListItemText>
          </MenuItem>
          <Divider sx={{ borderColor: 'var(--vm-border-subtle)' }} />
          <MenuItem onClick={() => handleUserMenuClick('logout')} sx={{ py: 1.5, '&:hover': { bgcolor: 'var(--vm-bg-hover)' } }}>
            <ListItemIcon sx={{ minWidth: 32, color: 'var(--vm-text-muted)' }}>
              <Logout sx={{ fontSize: 18 }} />
            </ListItemIcon>
            <ListItemText>
              <Typography sx={{ fontSize: 13, color: '#ef4444' }}>Log out</Typography>
            </ListItemText>
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );
}
