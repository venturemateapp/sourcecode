import { useState, useMemo } from 'react';
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Avatar,
  Badge,
  IconButton,
} from '@mui/material';
import { Person } from '@mui/icons-material';
import type { ViewType, NavSection } from '../../types/venturemate';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { useBusiness } from '../../contexts/BusinessContext';
import { PlanSelector } from '../subscription/PlanSelector';
import { useNavigate } from 'react-router-dom';


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
  Receipt,
  Palette,
  Target,
  UserCircle,
  Lightbulb,
  BarChart3,
  Calculator,
  Calendar,
  Settings,
  LogOut,
  Shield,
  Mail,
  X,
  Grid3x3,
  Workflow,
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
  Receipt,
  Palette,
  Target,
  UserCircle,
  Lightbulb,
  BarChart3,
  Calculator,
  Calendar,
  Grid3x3,
  Workflow,
  Settings,
  LogOut,
  Shield,
  Mail,
};

const navSections: NavSection[] = [
  {
    title: 'INSIGHTS',
    items: [
      { label: 'Dashboard', icon: 'BarChart3', view: 'dashboards' },
    ],
  },
  {
    title: 'CORE',
    items: [
      { label: 'Dashboard', icon: 'LayoutDashboard', view: 'dashboard' },
      { label: 'My Businesses', icon: 'Building2', view: 'businesses' },
      { label: 'AI Assistant', icon: 'Bot', view: 'ai-assistant' },
      { label: 'Documents', icon: 'FolderOpen', view: 'documents' },
      { label: 'Websites', icon: 'Globe', view: 'websites' },
    ],
  },
  {
    title: 'GROWTH',
    items: [
      { label: 'CRM', icon: 'Users', view: 'crm' },
      { label: 'Companies', icon: 'Building2', view: 'companies' },
      { label: 'Invoices', icon: 'FileText', view: 'invoices' },
      { label: 'Expenditure', icon: 'Receipt', view: 'expenditure' },
      { label: 'Banking', icon: 'Landmark', view: 'banking' },
      { label: 'Social Media', icon: 'Share2', view: 'social' },
      { label: 'Marketplace', icon: 'Store', view: 'marketplace' },
      { label: 'Custom Objects', icon: 'Grid3x3', view: 'custom-objects' },
      { label: 'Workflows', icon: 'Workflow', view: 'workflows' },
    ],
  },
  {
    title: 'SCALE',
    items: [
      { label: 'Investors', icon: 'TrendingUp', view: 'investors' },
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
      { label: 'Milestones', icon: 'Target', view: 'milestones' },
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
      { label: 'Calendar', icon: 'Calendar', view: 'calendar' },
      { label: 'Email Sync', icon: 'Mail', view: 'email-settings' },
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
  const { selectedBusiness } = useBusiness();
  const navigate = useNavigate();
  const [expandedSections, setExpandedSections] = useState<string[]>((['CORE', 'GROWTH', 'SCALE', 'BUSINESS TOOLS']));
  const [planSelectorOpen, setPlanSelectorOpen] = useState(false);

  const toggleSection = (title: string) => {
    setExpandedSections(prev =>
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    );
  };

  const badgeCounts: Record<string, number> = useMemo(() => ({
    documents: selectedBusiness?.documents?.length || 0,
    milestones: selectedBusiness?.milestones?.filter(m => m.status === 'pending' || m.status === 'overdue').length || 0,
  }), [selectedBusiness?.documents?.length, selectedBusiness?.milestones]);

  const handleViewChange = (view: ViewType) => {
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

              {isExpanded && (
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
                          transition: 'none',
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
                        {badgeCounts[item.view] !== undefined && (
                          <Badge
                            badgeContent={badgeCounts[item.view]}
                            sx={{
                              '& .MuiBadge-badge': {
                                bgcolor: badgeCounts[item.view] > 0 ? 'var(--vm-primary-600)' : 'var(--vm-bg-tertiary)',
                                color: badgeCounts[item.view] > 0 ? 'white' : 'var(--vm-text-muted)',
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
              )}
            </Box>
          );
        })}
      </Box>

      {/* Ask AI Floating Button */}
      <Box
        component="button"
        onClick={() => handleViewChange('ai-assistant')}
        sx={{
          mx: 2,
          mb: 1,
          py: 2,
          px: 3,
          borderRadius: '999px',
          border: '1px solid var(--vm-primary-600)',
          background: 'linear-gradient(135deg, var(--vm-primary-900) 0%, #064e3b 100%)',
          color: 'var(--vm-primary-400)',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1.5,
          position: 'relative',
          boxShadow: '0 0 24px rgba(16, 185, 129, 0.3)',
          animation: 'askAiPulse 2.5s ease-in-out infinite',
          '@keyframes askAiPulse': {
            '0%, 100%': { boxShadow: '0 0 16px rgba(16, 185, 129, 0.25)', transform: 'scale(1)' },
            '50%': { boxShadow: '0 0 32px rgba(16, 185, 129, 0.5)', transform: 'scale(1.02)' },
          },
          '&:hover': {
            bgcolor: 'var(--vm-primary-900)',
            boxShadow: '0 0 40px rgba(16, 185, 129, 0.6)',
          },
        }}
      >
        <Bot size={18} color="var(--vm-primary-400)" />
        Ask AI
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
            src={user?.avatar || undefined}
            sx={{
              width: 36,
              height: 36,
              border: '2px solid var(--vm-primary-600)',
              bgcolor: user?.avatar ? 'transparent' : 'var(--vm-primary-600)',
            }}
          >
            {!user?.avatar && <Person sx={{ fontSize: 18 }} />}
          </Avatar>
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

      {/* Admin link */}
      {user?.isAdmin && (
        <Box
          sx={{ px: 2, pb: 1, cursor: 'pointer', '&:hover': { bgcolor: 'var(--vm-bg-hover)' } }}
          onClick={() => { navigate('/vm/admin'); onClose?.(); }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1 }}>
            <Box sx={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
              <Shield size={18} />
            </Box>
            <Typography sx={{ fontSize: 13, fontWeight: 500, color: '#f59e0b' }}>Admin Dashboard</Typography>
          </Box>
        </Box>
      )}

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
