import { useState } from 'react';
import { Box, ListItemButton, ListItemIcon, ListItemText, Typography, Avatar, IconButton } from '@mui/material';
import type { ViewType, NavSection } from '../../types/venturemate';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { PlanSelector } from '../subscription/PlanSelector';
import { useNavigate } from 'react-router-dom';

import {
  LayoutDashboard, Building2, ChevronDown, ChevronRight, Bot, FolderOpen, Globe, Users,
  Landmark, Share2, Store, TrendingUp, CreditCard, Heart, Presentation, FileText, Receipt,
  Palette, Target, UserCircle, Lightbulb, Calculator, Calendar,
  LogOut, X, Sparkles,
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  LayoutDashboard, Building2, Bot, FolderOpen, Globe, Users, Landmark, Share2, Store,
  TrendingUp, CreditCard, Heart, Presentation, FileText, Receipt, Palette, Target,
  UserCircle, Lightbulb, Calculator, Calendar,
};

const NAV_SECTIONS: NavSection[] = [
  { title: 'INSIGHTS', items: [{ label: 'Dashboard', icon: 'LayoutDashboard', view: 'dashboard' as ViewType }] },
  { title: 'CORE', items: [
    { label: 'Businesses', icon: 'Building2', view: 'businesses' as ViewType },
    { label: 'AI Assistant', icon: 'Bot', view: 'ai-assistant' as ViewType },
    { label: 'Documents', icon: 'FolderOpen', view: 'documents' as ViewType },
    { label: 'Website Builder', icon: 'Globe', view: 'website-builder' as ViewType },
    { label: 'Team', icon: 'Users', view: 'team' as ViewType },
  ]},
  { title: 'GROWTH', items: [
    { label: 'CRM', icon: 'Users', view: 'crm' as ViewType },
    { label: 'Companies', icon: 'Building2', view: 'companies' as ViewType },
    { label: 'Invoices', icon: 'Receipt', view: 'invoices' as ViewType },
    { label: 'Expenses', icon: 'Calculator', view: 'expenditure' as ViewType },
    { label: 'Banking', icon: 'Landmark', view: 'banking' as ViewType },
    { label: 'Social', icon: 'Share2', view: 'social' as ViewType },
    { label: 'Marketplace', icon: 'Store', view: 'marketplace' as ViewType },
  ]},
  { title: 'SCALE', items: [
    { label: 'Credit Score', icon: 'TrendingUp', view: 'credit-score' as ViewType },
  ]},
  { title: 'BUSINESS TOOLS', items: [
    { label: 'Pitch Deck', icon: 'Presentation', view: 'pitch-deck' as ViewType },
    { label: 'Business Plan', icon: 'FileText', view: 'business-plan' as ViewType },
    { label: 'Branding Kit', icon: 'Palette', view: 'branding-kit' as ViewType },
    { label: 'Milestones', icon: 'Target', view: 'milestones' as ViewType },
    { label: 'Investors', icon: 'TrendingUp', view: 'investors' as ViewType },
    { label: 'Co-Founders', icon: 'UserCircle', view: 'cofounders' as ViewType },
  ]},
  { title: 'AI TOOLS', items: [
  ]},
  { title: 'ACCOUNT', items: [
    { label: 'Billing', icon: 'CreditCard', view: 'billing' as ViewType },
    { label: 'Settings', icon: 'Settings', view: 'settings' as ViewType },
    { label: 'Email Settings', icon: 'Mail', view: 'email-settings' as ViewType },
    { label: 'Calendar', icon: 'Calendar', view: 'calendar' as ViewType },
  ]},
];

function NavItem({ item, activeView, onNavigate, collapsed }: {
  item: NavSection['items'][0]; activeView: ViewType; onNavigate: (view: ViewType) => void; collapsed: boolean;
}) {
  const Icon = iconMap[item.icon] || LayoutDashboard;
  const isActive = activeView === item.view;
  return (
    <ListItemButton
      onClick={() => onNavigate(item.view)}
      sx={{
        mx: 0.75, my: 0.25, borderRadius: 1.5, px: collapsed ? 1 : 1.5, py: 0.75,
        minHeight: 36,
        bgcolor: isActive ? 'rgba(16,185,129,.1)' : 'transparent',
        borderLeft: isActive ? '2px solid var(--vm-primary-400)' : '2px solid transparent',
        transition: 'all .15s ease',
        '&:hover': { bgcolor: isActive ? 'rgba(16,185,129,.15)' : 'rgba(255,255,255,.04)' },
      }}
    >
      <ListItemIcon sx={{ minWidth: collapsed ? 0 : 32, color: isActive ? 'var(--vm-primary-400)' : 'var(--vm-text-muted)', justifyContent: 'center' }}>
        {Icon && <Icon size={collapsed ? 18 : 16} />}
      </ListItemIcon>
      {!collapsed && (
        <ListItemText
          primary={item.label}
          primaryTypographyProps={{
            fontSize: 12,
            fontWeight: isActive ? 700 : 500,
            color: isActive ? 'var(--vm-text-primary)' : 'var(--vm-text-secondary)',
          }}
        />
      )}
    </ListItemButton>
  );
}

export function Sidebar({ activeView, onNavigate, onClose }: {
  activeView: ViewType; onNavigate: (view: ViewType) => void; onClose?: () => void;
}) {
  const { user, logout } = useAuth();
  const { planName, isFree } = useSubscription();
  const [collapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [showPlanSelector, setShowPlanSelector] = useState(false);
  const navigate = useNavigate();

  const toggleSection = (title: string) => setExpandedSections(prev => ({ ...prev, [title]: !prev[title] }));

  const initials = user ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() : 'VM';
  const userName = user ? `${user.firstName} ${user.lastName}`.trim() : 'User';

  return (
    <Box sx={{
      height: '100%', display: 'flex', flexDirection: 'column',
      bgcolor: 'rgba(7,17,15,.95)',
      backdropFilter: 'blur(16px)',
      borderRight: '1px solid rgba(255,255,255,.06)',
    }}>
      {/* Logo */}
      <Box sx={{ px: collapsed ? 1 : 1.75, py: 1.5, display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid rgba(255,255,255,.06)', minHeight: 56 }}>
        {onClose && (
          <IconButton size="small" onClick={onClose} sx={{ color: 'var(--vm-text-muted)', mr: 0.5, display: { md: 'none' } }}>
            <X size={18} />
          </IconButton>
        )}
        <Box component="img" src="/VentureMate-logo.png" alt="VentureMate" sx={{
          width: collapsed ? 28 : 32, height: collapsed ? 28 : 'auto', flexShrink: 0,
          objectFit: 'contain',
        }} />
        {!collapsed && (
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ color: 'white', fontSize: 13, fontWeight: 900, lineHeight: 1.2 }}>VentureMate</Typography>
            <Typography sx={{ color: 'rgba(255,255,255,.35)', fontSize: 8, fontWeight: 600, letterSpacing: 0.5 }}>AI STARTUP OS</Typography>
          </Box>
        )}
      </Box>

      {/* Plan upgrade banner */}
      {!collapsed && isFree && (
        <Box
          onClick={() => setShowPlanSelector(true)}
          sx={{
            mx: 1, mt: 1, p: 1, borderRadius: 1.5,
            background: 'linear-gradient(135deg, rgba(16,185,129,.12), rgba(5,150,105,.08))',
            border: '1px solid rgba(16,185,129,.2)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 1,
            transition: 'all .2s',
            '&:hover': { background: 'linear-gradient(135deg, rgba(16,185,129,.18), rgba(5,150,105,.12))' },
          }}
        >
          <Sparkles size={14} color="var(--vm-primary-400)" />
          <Box>
            <Typography sx={{ color: 'var(--vm-text-primary)', fontSize: 10, fontWeight: 700 }}>Free plan</Typography>
            <Typography sx={{ color: 'var(--vm-primary-400)', fontSize: 9, fontWeight: 600 }}>Upgrade to Scale →</Typography>
          </Box>
        </Box>
      )}

      {/* Navigation */}
      <Box sx={{ flex: 1, overflow: 'auto', py: 0.5 }}>
        {NAV_SECTIONS.map(section => {
          const isExpanded = expandedSections[section.title] !== false;
          return (
            <Box key={section.title} sx={{ mb: 0.5 }}>
              {!collapsed && (
                <ListItemButton
                  onClick={() => toggleSection(section.title)}
                  sx={{ px: 1.5, py: 0.4, '&:hover': { bgcolor: 'transparent' } }}
                >
                  <Typography sx={{
                    color: 'rgba(255,255,255,.3)', fontSize: 9, fontWeight: 700,
                    letterSpacing: 1.2, textTransform: 'uppercase', flex: 1,
                  }}>
                    {section.title}
                  </Typography>
                  {isExpanded ? <ChevronDown size={12} style={{ opacity: .3 }} /> : <ChevronRight size={12} style={{ opacity: .3 }} />}
                </ListItemButton>
              )}
              {isExpanded && section.items.map(item => (
                <NavItem key={item.view} item={item} activeView={activeView} onNavigate={onNavigate} collapsed={collapsed} />
              ))}
            </Box>
          );
        })}
      </Box>

      {/* User section */}
      <Box sx={{
        p: collapsed ? 1 : 1.5,
        borderTop: '1px solid rgba(255,255,255,.06)',
        display: 'flex', alignItems: 'center', gap: 1,
      }}>
        <Avatar sx={{
          width: collapsed ? 28 : 32, height: collapsed ? 28 : 32,
          bgcolor: 'var(--vm-primary-700)', fontSize: 11, fontWeight: 800,
          cursor: 'pointer',
          '&:hover': { opacity: .8 },
        }} onClick={() => navigate('/vm/settings')}>
          {initials}
        </Avatar>
        {!collapsed && (
          <>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ color: 'var(--vm-text-primary)', fontSize: 11, fontWeight: 700, lineHeight: 1.3 }}>{userName}</Typography>
              <Typography sx={{ color: 'rgba(255,255,255,.3)', fontSize: 9, textTransform: 'uppercase', letterSpacing: .3 }}>{planName || 'Free'}</Typography>
            </Box>
            <IconButton size="small" onClick={() => { logout(); navigate('/vm/auth/signin'); }} sx={{ color: 'rgba(255,255,255,.3)', '&:hover': { color: '#ef4444' } }}>
              <LogOut size={14} />
            </IconButton>
          </>
        )}
      </Box>

      {showPlanSelector && <PlanSelector open={showPlanSelector} onClose={() => setShowPlanSelector(false)} userId={user?.id || ''} currentPlanName={planName} />}
    </Box>
  );
}
