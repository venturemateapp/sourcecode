// Navigation Structure matching VM sidebar
import type { NavSection } from '../types/venturemate';

export const navSections: NavSection[] = [
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
