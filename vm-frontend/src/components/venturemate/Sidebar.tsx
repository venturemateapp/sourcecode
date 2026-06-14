import { useState } from 'react';
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Avatar,
  Collapse,
  Badge,
  IconButton,
} from '@mui/material';
import type { ViewType, NavSection } from '../../types/venturemate';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { PlanSelector } from '../subscription/PlanSelector';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../shared/toast';

// Import Lucide icons
import {
  LayoutDashboard,
  Building2,
  ChevronDown,
  ChevronRight,
  Bot,
  FolderOpen,
  Globe,
  Users,
  Landmark,
  Share2,
  Store,
  TrendingUp,
  CreditCard,
  Heart,
  Presentation,
  FileText,
  Palette,
  Target,
  UserCircle,
  Lightbulb,
  BarChart3,
  Calculator,
  Settings,
  LogOut,
  X,
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  LayoutDashboard,
  Building2,
  Bot,
  FolderOpen,
  Globe,
  Users,
  Landmark,
  Share2,
  Store,
  TrendingUp,
  CreditCard,
  Heart,
  Presentation,
  FileText,
  Palette,
  Target,
  UserCircle,
  Lightbulb,
  BarChart3,
  Calculator,
  Settings,
  LogOut,
};

const navSections: NavSection[] = [
  {
    title: 'CORE',
    items: [
      { label: 'Dashboard', icon: 'LayoutDashboard', view: 'dashboard' },
      { label: 'My Businesses', icon: 'Building2', view: 'businesses' },
      { label: 'AI Assistant', icon: 'Bot', view: 'ai-assistant', badge: 3 },
      { label: 'Documents', icon: 'FolderOpen', view: 'documents' },
      { label: 'Websites', icon: 'Globe', view: 'websites' },
    ],
  },
  {
    title: 'GROWTH',
    items: [
      { label: 'CRM', icon: 'Users', view: 'crm', badge: 5 },
      { label: 'Banking', icon: 'Landmark', view: 'banking' },
      { label: 'Social Media', icon: 'Share2', view: 'social' },
      { label: 'Marketplace', icon: 'Store', view: 'marketplace' },
    ],
  },
  {
    title: 'SCALE',
    items: [
      { label: 'Investors', icon: 'TrendingUp', view: 'investors', badge: 5 },
      { label: 'Credit Score', icon: 'CreditCard', view: 'credit-score' },
      { label: 'Health Score', icon: 'Heart', view: 'health-score' },
    ],
  },
  {
    title: 'BUSINESS TOOLS',
    items: [
      { label: 'Pitch Deck', icon: 'Presentation', view: 'pitch-deck' },
      { label: 'Business Plan', icon: 'FileText', view: 'business-plan' },
      { label: 'Branding Kit', icon: 'Palette', view: 'branding-kit' },
      { label: 'Milestones', icon: 'Target', view: 'milestones', badge: 2 },
      { label: 'Team', icon: 'UserCircle', view: 'team' },
    ],
  },
  {
    title: 'AI TOOLS',
    items: [
      { label: 'Generate Idea', icon: 'Lightbulb', view: 'generate-idea' },
      { label: 'Market Research', icon: 'BarChart3', view: 'market-research' },
      { label: 'Financial Forecast', icon: 'Calculator', view: 'financial-forecast' },
    ],
  },
  {
    title: 'ACCOUNT',
    items: [
      { label: 'Settings', icon: 'Settings', view: 'settings' },
    ],
  },
];

interface SidebarProps {
  onClose?: () => void;
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
}

export function Sidebar({ onClose, activeView, onViewChange }: SidebarProps) {
  const { user, logout } = useAuth();
  const { planName, isFree } = useSubscription();
  const navigate = useNavigate();
  const [expandedSections, setExpandedSections] = useState<string[]>((['CORE', 'GROWTH', 'SCALE', 'BUSINESS TOOLS']));
  const [planSelectorOpen, setPlanSelectorOpen] = useState(false);

  const toggleSection = (title: string) => {
    setExpandedSections(prev =>
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    );
  };

  const toast = useToast();
  const comingSoon: ViewType[] = ['social', 'marketplace', 'crm'];

  const handleViewChange = (view: ViewType) => {
    if (comingSoon.includes(view)) {
      toast.info('Coming Soon', { description: 'We\'re building something great here — stay tuned!' });
      return;
    }
    onViewChange(view);
    onClose?.();
  };

  return (
    <Box
      sx={{
        width: { xs: 280, md: 260 },
        height: '100%',
        bgcolor: 'transparent',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto',
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
        borderRight: '1px solid var(--vm-border-subtle)',
      }}
    >
      {/* Logo */}
      <Box sx={{ p: 2.5, borderBottom: '1px solid var(--vm-border-subtle)', position: 'relative' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            component="img"
            src="/ventureMate-logo3.png"
            sx={{
              height: { xs: 36, md: 40 },
              width: 'auto',
              objectFit: 'contain',
            }}
          />
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: 18,
                fontWeight: 700,
                color: 'var(--vm-text-primary)',
                letterSpacing: '-0.5px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              VentureMate
            </Typography>
            <Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)' }}>
              AI Startup OS
            </Typography>
          </Box>
        </Box>

        {/* Mobile close button */}
        {onClose && (
          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: 'var(--vm-text-secondary)',
              display: { md: 'none' },
            }}
          >
            <X size={20} />
          </IconButton>
        )}
        
        {/* Upgrade Button */}
        <Box
          component="button"
          onClick={() => handleViewChange('billing')}
          sx={{
            mt: 2,
            width: '100%',
            py: 1,
            px: 2,
            borderRadius: 1.5,
            border: '1px solid var(--vm-primary-600)',
            background: 'linear-gradient(135deg, var(--vm-primary-900) 0%, transparent 100%)',
            color: 'var(--vm-primary-400)',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            transition: 'all 0.2s',
            '&:hover': {
              bgcolor: 'var(--vm-primary-900)',
              boxShadow: '0 0 12px rgba(16, 185, 129, 0.3)',
            },
          }}
        >
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              bgcolor: '#22c55e',
              boxShadow: '0 0 6px #22c55e',
              animation: 'pulse 2s infinite',
              '@keyframes pulse': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.5 },
              },
            }}
          />
          Upgrade to Scale
        </Box>
      </Box>

      {/* Navigation */}
      <Box sx={{ flex: 1, py: 1 }}>
        {navSections.map((section) => {
          const isExpanded = expandedSections.includes(section.title);
          const hasChildren = section.items.some(item => item.children);

          return (
            <Box key={section.title}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  px: 2.5,
                  py: 1.5,
                  cursor: hasChildren ? 'pointer' : 'default',
                  borderRadius: 1,
                  mx: 1,
                  minHeight: { xs: 44, md: 'auto' },
                  transition: 'background-color 0.2s',
                  ...(hasChildren ? {
                    '&:hover': { bgcolor: 'var(--vm-bg-hover)' },
                    '&:active': { bgcolor: 'var(--vm-bg-tertiary)' },
                  } : {}),
                }}
                onClick={() => hasChildren && toggleSection(section.title)}
              >
                <Typography
                  sx={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--vm-text-muted)',
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                  }}
                >
                  {section.title}
                </Typography>
                {hasChildren && (
                  isExpanded ? <ChevronDown size={14} color="var(--vm-text-muted)" /> : <ChevronRight size={14} color="var(--vm-text-muted)" />
                )}
              </Box>

              <Collapse in={isExpanded}>
                <List dense disablePadding>
                  {section.items.map((item) => {
                    const Icon = iconMap[item.icon];
                    const isActive = activeView === item.view;

                    return (
                      <ListItemButton
                        key={item.view}
                        selected={isActive}
                        onClick={() => handleViewChange(item.view)}
                        sx={{
                          mx: 1.5,
                          mb: 0.5,
                          borderRadius: 2,
                          py: { xs: 0.75, md: 0.5 },
                          minHeight: { xs: 44, md: 'auto' },
                          '&:hover': {
                            bgcolor: 'var(--vm-bg-hover)',
                          },
                          '&.Mui-selected': {
                            bgcolor: 'var(--vm-primary-900)',
                            '&::before': {
                              content: '""',
                              position: 'absolute',
                              left: 0,
                              top: '50%',
                              transform: 'translateY(-50%)',
                              width: 3,
                              height: 20,
                              bgcolor: 'var(--vm-primary-500)',
                              borderRadius: '0 4px 4px 0',
                            },
                          },
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            minWidth: 36,
                            color: isActive ? 'var(--vm-primary-400)' : 'var(--vm-text-muted)',
                          }}
                        >
                          {Icon && <Icon size={18} />}
                        </ListItemIcon>
                        <ListItemText
                          primary={item.label}
                          primaryTypographyProps={{
                            fontSize: 13,
                            fontWeight: isActive ? 600 : 500,
                            color: isActive ? 'var(--vm-text-primary)' : 'var(--vm-text-secondary)',
                          }}
                        />
                        {item.badge && (
                          <Badge
                            badgeContent={item.badge}
                            sx={{
                              '& .MuiBadge-badge': {
                                bgcolor: 'var(--vm-primary-600)',
                                color: 'white',
                                fontSize: 10,
                                fontWeight: 600,
                                minWidth: 18,
                                height: 18,
                              },
                            }}
                          />
                        )}
                      </ListItemButton>
                    );
                  })}
                </List>
              </Collapse>
            </Box>
          );
        })}
      </Box>

      {/* AI Assistant Card */}
      <Box sx={{ p: 2 }}>
        <Box
          sx={{
            background: 'linear-gradient(135deg, var(--vm-primary-900) 0%, var(--vm-bg-tertiary) 100%)',
            borderRadius: 3,
            p: 2.5,
            border: '1px solid var(--vm-border-primary)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Decorative glow */}
          <Box
            sx={{
              position: 'absolute',
              top: -30,
              right: -30,
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'radial-gradient(circle, var(--vm-primary-600) 0%, transparent 70%)',
              opacity: 0.3,
            }}
          />
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1.5,
                bgcolor: 'var(--vm-primary-600)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bot size={18} color="white" />
            </Box>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'var(--vm-text-primary)' }}>
              AI Assistant
            </Typography>
          </Box>
          
          <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)', mb: 2, lineHeight: 1.5 }}>
            I can help with pitch decks, business plans, and investor outreach.
          </Typography>
          
          <Box
            component="button"
            onClick={() => handleViewChange('ai-assistant')}
            sx={{
              width: '100%',
              py: 1,
              px: 2,
              borderRadius: 1.5,
              border: '1px solid var(--vm-primary-600)',
              bgcolor: 'transparent',
              color: 'var(--vm-primary-400)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': {
                bgcolor: 'var(--vm-primary-900)',
              },
            }}
          >
            Start Chat
          </Box>
        </Box>
      </Box>

      {/* User Profile */}
      <Box
        sx={{
          p: 2,
          borderTop: '1px solid var(--vm-border-subtle)',
          cursor: 'pointer',
          '&:hover': { bgcolor: 'var(--vm-bg-hover)' },
        }}
        onClick={() => handleViewChange('settings')}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            src={user?.avatar}
            sx={{
              width: 36,
              height: 36,
              border: '2px solid var(--vm-primary-600)',
            }}
          />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--vm-text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user?.firstName} {user?.lastName}
            </Typography>
            <Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)' }}>
              {user?.role === 'founder' ? 'Founder' : user?.role}
            </Typography>
          </Box>
          <Settings size={16} color="var(--vm-text-muted)" />
        </Box>
      </Box>

      {/* Subscription Plan */}
      <Box sx={{ px: 2, pb: 1 }}>
        <Box
          onClick={() => setPlanSelectorOpen(true)}
          sx={{
            display: 'flex', alignItems: 'center', gap: 1.5, py: 1.5, px: 1.5,
            borderRadius: 2, cursor: 'pointer',
            bgcolor: isFree ? 'rgba(251, 191, 36, 0.08)' : 'rgba(52, 211, 153, 0.08)',
            border: '1px solid',
            borderColor: isFree ? 'rgba(251, 191, 36, 0.2)' : 'rgba(52, 211, 153, 0.2)',
            '&:hover': { bgcolor: isFree ? 'rgba(251, 191, 36, 0.12)' : 'rgba(52, 211, 153, 0.12)' },
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', mb: 0.3 }}>
              PLAN
            </Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: isFree ? '#fbbf24' : '#34d399', textTransform: 'capitalize' }}>
              {planName.replace('_', ' ')}
            </Typography>
          </Box>
          {isFree && (
            <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#fbbf24', px: 1, py: 0.3, borderRadius: 1, bgcolor: 'rgba(251, 191, 36, 0.15)' }}>
              Upgrade
            </Typography>
          )}
        </Box>
      </Box>

      {/* Logout */}
      <Box
        sx={{
          px: 2,
          pb: 2,
          cursor: 'pointer',
          '&:hover': { bgcolor: 'var(--vm-bg-hover)' },
        }}
        onClick={() => {
          logout();
          navigate('/vm/auth/signin');
          onClose?.();
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--vm-text-muted)',
            }}
          >
            <LogOut size={18} />
          </Box>
          <Typography
            sx={{
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--vm-text-secondary)',
            }}
          >
            Log out
          </Typography>
        </Box>
      </Box>

      {/* Plan Selector Dialog */}
      <PlanSelector
        open={planSelectorOpen}
        onClose={() => setPlanSelectorOpen(false)}
        userId={user?.id || ''}
        currentPlanName={planName}
      />
    </Box>
  );
}
