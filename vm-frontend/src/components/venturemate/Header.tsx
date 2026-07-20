import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, IconButton, Avatar, Badge, Menu, MenuItem, ListItemText, Divider, Tooltip, Button } from '@mui/material';
import { Person, Logout } from '@mui/icons-material';
import { Menu as MenuIcon, Bell, BellRing, X, CheckCircle } from 'lucide-react';
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
  dashboard: 'Dashboard', businesses: 'My Businesses', 'business-overview': 'Business Overview',
  'ai-assistant': 'AI Assistant', 'pitch-deck': 'Pitch Deck', 'business-plan': 'Business Plan',
  'branding-kit': 'Branding Kit', 'website-builder': 'Website Builder', websites: 'Websites',
  milestones: 'Milestones', documents: 'Documents', team: 'Team', 'business-settings': 'Business Settings',
  network: 'Network', investors: 'Investors', cofounders: 'Co-Founders', messages: 'Messages',
  'ai-tools': 'AI Tools', 'generate-idea': 'Generate Idea', 'market-research': 'Market Research',
  'financial-forecast': 'Financial Forecast', crm: 'CRM', companies: 'Companies', invoices: 'Invoices',
  expenditure: 'Expenses', banking: 'Banking', social: 'Social', marketplace: 'Marketplace',
  'credit-score': 'Credit Score', 'health-score': 'Health Score', account: 'Account',
  billing: 'Billing', settings: 'Settings', 'email-settings': 'Email Settings', calendar: 'Calendar',
  'custom-objects': 'Custom Objects', workflows: 'Workflows',
};

export function Header({ onMenuClick, activeView, onViewChange }: HeaderProps) {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, deleteAllRead } = useNotifications();
  const navigate = useNavigate();


  const [notifAnchor, setNotifAnchor] = useState<null | HTMLElement>(null);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_showNotifDot, _setShowNotifDot] = useState(true);

  const initials = user ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() : 'VM';
  const userName = user ? `${user.firstName} ${user.lastName}`.trim() : 'User';

  return (
    <Box sx={{
      px: { xs: 1.25, sm: 2 }, py: 1,
      display: 'flex', alignItems: 'center', gap: 1.5,
      borderBottom: '1px solid rgba(255,255,255,.06)',
      bgcolor: 'rgba(7,17,15,.6)',
      backdropFilter: 'blur(16px)',
      minHeight: 56,
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      {/* Mobile menu */}
      <IconButton onClick={onMenuClick} size="small" sx={{ color: 'var(--vm-text-muted)', display: { md: 'none' } }}>
        <MenuIcon size={20} />
      </IconButton>

      {/* Title */}
      <Typography sx={{ color: 'var(--vm-text-primary)', fontSize: { xs: 14, sm: 16 }, fontWeight: 800, whiteSpace: 'nowrap' }}>
        {viewTitles[activeView] || 'VentureMate'}
      </Typography>

      {/* BusinessSwitcher */}
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <BusinessSwitcher onViewChange={onViewChange} />
      </Box>

      {/* Spacer */}
      <Box sx={{ flex: 1 }} />

      {/* Notifications */}
      <Tooltip title="Notifications">
        <IconButton size="small" onClick={e => setNotifAnchor(e.currentTarget)} sx={{ color: 'var(--vm-text-muted)', position: 'relative' }}>
          <Badge badgeContent={unreadCount} color="error" sx={{ '& .MuiBadge-badge': { fontSize: 9, minWidth: 16, height: 16 } }}>
            {unreadCount > 0 ? <BellRing size={18} /> : <Bell size={18} />}
          </Badge>
        </IconButton>
      </Tooltip>

      {/* User avatar */}
      <Tooltip title={userName}>
        <Avatar
          src={user?.avatar || undefined}
          onClick={e => setUserMenuAnchor(e.currentTarget)}
          sx={{
            width: 30, height: 30, bgcolor: user?.avatar ? 'transparent' : 'var(--vm-primary-700)', fontSize: 11, fontWeight: 800,
            cursor: 'pointer', transition: 'opacity .2s', '&:hover': { opacity: .8 },
          }}
        >
          {!user?.avatar && initials}
        </Avatar>
      </Tooltip>

      {/* Notifications menu */}
      <Menu
        anchorEl={notifAnchor} open={Boolean(notifAnchor)} onClose={() => setNotifAnchor(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }} anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{ paper: { sx: {
          bgcolor: '#0a1a14', border: '1px solid rgba(255,255,255,.08)', borderRadius: 2.5, minWidth: 320, maxWidth: 380, maxHeight: 400, mt: 1,
          backgroundImage: 'linear-gradient(180deg, rgba(16,185,129,.03), transparent)',
        }}}}
      >
        <Box sx={{ px: 1.5, py: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
          <Typography sx={{ color: '#fff', fontSize: 13, fontWeight: 800 }}>Notifications</Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {unreadCount > 0 && <Button size="small" onClick={() => markAllAsRead()} sx={{ color: 'var(--vm-primary-400)', fontSize: 10, textTransform: 'none', minWidth: 'auto' }}>Mark all read</Button>}
            {notifications.length > 0 && <Button size="small" onClick={() => deleteAllRead()} sx={{ color: '#ef4444', fontSize: 10, textTransform: 'none', minWidth: 'auto' }}>Clear all</Button>}
          </Box>
        </Box>
        {notifications.length === 0 ? (
          <Box sx={{ py: 3, textAlign: 'center' }}>
            <Bell size={24} style={{ opacity: .3, marginBottom: 8 }} />
            <Typography sx={{ color: 'rgba(255,255,255,.4)', fontSize: 12 }}>No notifications</Typography>
          </Box>
        ) : (
          notifications.slice(0, 10).map(n => (
            <MenuItem key={n.id} onClick={() => { if (n.actionUrl) { navigate(n.actionUrl); const chatMatch = n.actionUrl.match(/chat=([^&]+)/); if (chatMatch) window.dispatchEvent(new CustomEvent('supportchat:open', { detail: { sessionId: chatMatch[1] } })); } setNotifAnchor(null); }} sx={{
              px: 1.5, py: 1.25, borderBottom: '1px solid rgba(255,255,255,.04)', alignItems: 'flex-start',
              bgcolor: n.read ? 'transparent' : 'rgba(16,185,129,.04)',
            }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ color: '#fff', fontSize: 12, fontWeight: n.read ? 500 : 700, lineHeight: 1.4 }}>{n.title}</Typography>
                <Typography sx={{ color: 'rgba(255,255,255,.5)', fontSize: 11, mt: 0.25, lineHeight: 1.4 }}>{n.description}</Typography>
                <Typography sx={{ color: 'rgba(255,255,255,.25)', fontSize: 10, mt: 0.5 }}>
                  {new Date(n.createdAt).toLocaleDateString()} {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, ml: 1 }}>
                {!n.read && (
                  <IconButton size="small" onClick={e => { e.stopPropagation(); markAsRead(n.id); }} sx={{ color: 'var(--vm-primary-400)', '&:hover': { color: '#34d399' }, width: 24, height: 24 }}>
                    <CheckCircle size={14} />
                  </IconButton>
                )}
                <IconButton size="small" onClick={e => { e.stopPropagation(); deleteNotification(n.id); }} sx={{ color: 'rgba(255,255,255,.2)', '&:hover': { color: '#ef4444' }, width: 24, height: 24 }}>
                  <X size={12} />
                </IconButton>
              </Box>
            </MenuItem>
          ))
        )}
      </Menu>

      {/* User menu */}
      <Menu
        anchorEl={userMenuAnchor} open={Boolean(userMenuAnchor)} onClose={() => setUserMenuAnchor(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }} anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{ paper: { sx: { bgcolor: '#0a1a14', border: '1px solid rgba(255,255,255,.08)', borderRadius: 2.5, minWidth: 200, mt: 1 }}}}
      >
        <MenuItem onClick={() => { setUserMenuAnchor(null); onViewChange('settings'); }} sx={{ gap: 1.5, py: 1 }}>
          <Person fontSize="small" sx={{ color: 'rgba(255,255,255,.5)' }} />
          <ListItemText primary="Settings" primaryTypographyProps={{ fontSize: 12, fontWeight: 600 }} />
        </MenuItem>
        <Divider sx={{ borderColor: 'rgba(255,255,255,.06)' }} />
        <MenuItem onClick={() => { setUserMenuAnchor(null); logout(); navigate('/vm/auth/signin'); }} sx={{ gap: 1.5, py: 1 }}>
          <Logout fontSize="small" sx={{ color: '#ef444480' }} />
          <ListItemText primary="Sign out" primaryTypographyProps={{ fontSize: 12, fontWeight: 600, color: '#ef4444cc' }} />
        </MenuItem>
      </Menu>
    </Box>
  );
}
