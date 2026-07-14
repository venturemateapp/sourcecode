// VentureMate - Complete Type Definitions

// User & Authentication
export interface User {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  role: 'founder' | 'investor' | 'cofounder';
  bio: string;
  location: string;
  skills: string[];
  experience: Experience[];
  linkedIn?: string;
  twitter?: string;
  website?: string;
  onboarded?: boolean;
  status?: string;
  isAdmin?: boolean;
  preferredCurrency?: string;
  createdAt: string;
  lastActive: string;
}

export interface Experience {
  id: string;
  company: string;
  role: string;
  duration: string;
  description: string;
}

// Business / Startup
export interface Business {
  id: string;
  userId: string;
  name: string;
  tagline: string;
  description: string;
  industry: string;
  stage: 'idea' | 'mvp' | 'beta' | 'launched' | 'scaling' | 'profitable';
  foundedDate: string;
  location: string;
  website?: string;
  brandKit: BrandKit;
  pitchDeck: PitchDeck;
  businessPlan: BusinessPlan;
  milestones: Milestone[];
  team: TeamMember[];
  documents: Document[];
  websiteConfig: WebsiteConfig;
  financials: Financials;
  metrics: Metrics;
  aiGenerated: AIGeneratedContent;
  status: 'active' | 'archived' | 'acquired';
  createdAt: string;
}

// Branding Kit
export interface BrandKit {
  logo: string;
  logoWhite: string;
  logoIcon: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  darkColor: string;
  fontHeading: string;
  fontBody: string;
  patterns: string[];
  socialBanners: SocialBanner[];
}

export interface SocialBanner {
  id: string;
  platform: 'linkedin' | 'twitter' | 'facebook' | 'instagram';
  url: string;
}

// Pitch Deck
export interface PitchDeck {
  id: string;
  title: string;
  slides: Slide[];
  template: string;
  lastModified: string;
  exportFormats: ('pdf' | 'pptx' | 'key')[];
  shareLink?: string;
  views: number;
}

export interface Slide {
  id: string;
  type: 'title' | 'problem' | 'solution' | 'market' | 'product' | 'business-model' | 'traction' | 'team' | 'financials' | 'competition' | 'roadmap' | 'ask' | 'closing' | 'custom';
  title: string;
  content: string;
  bullets?: string[];
  image?: string;
  chart?: ChartData;
  order: number;
  layout: string;
}

export interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'doughnut';
  labels: string[];
  datasets: Dataset[];
}

export interface Dataset {
  label: string;
  data: number[];
  color?: string;
}

// Business Plan
export interface BusinessPlan {
  id: string;
  title: string;
  sections: PlanSection[];
  executiveSummary: string;
  lastModified: string;
  version: string;
  exportFormats: ('pdf' | 'docx' | 'md')[];
}

export interface PlanSection {
  id: string;
  title: string;
  content: string;
  subsections?: PlanSection[];
  aiGenerated: boolean;
  order: number;
}

// Milestones
export interface Milestone {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  priority: 'low' | 'medium' | 'high' | 'critical';
  dueDate: string;
  completedDate?: string;
  assignee?: string;
  category: 'product' | 'marketing' | 'funding' | 'team' | 'legal' | 'operations';
  aiSuggestions?: string[];
  dependencies?: string[];
}

// Team
export interface TeamMember {
  id: string;
  userId?: string;
  name: string;
  email: string;
  role: string;
  title: string;
  avatar: string;
  equity: number;
  status: 'active' | 'pending' | 'former';
  joinedDate: string;
  responsibilities: string[];
}

// Documents
export interface Document {
  id: string;
  name: string;
  type: 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'image' | 'other';
  size: string;
  url: string;
  category: 'legal' | 'financial' | 'marketing' | 'product' | 'hr' | 'other';
  uploadedBy: string;
  uploadedAt: string;
  lastModified: string;
  tags: string[];
  sharedWith: string[];
}

// Website Builder
export interface WebsiteConfig {
  id: string;
  subdomain: string;
  customDomain?: string;
  status: 'draft' | 'published' | 'archived';
  template: string;
  pages: Page[];
  seo: SEOConfig;
  analytics: AnalyticsConfig;
  lastPublished?: string;
}

export interface Page {
  id: string;
  slug: string;
  title: string;
  sections: Section[];
  isHome: boolean;
  metaDescription: string;
}

export interface Section {
  id: string;
  type: 'hero' | 'features' | 'carousel' | 'testimonials' | 'pricing' | 'team' | 'contact' | 'cta' | 'about' | 'stats' | 'faq' | 'image' | 'video' | 'custom';
  content?: Record<string, unknown>;
  props?: Record<string, unknown>;
  order: number;
  visible: boolean;
}

export interface SEOConfig {
  title: string;
  description: string;
  keywords: string[];
  ogImage?: string;
}

export interface AnalyticsConfig {
  googleAnalyticsId?: string;
  facebookPixelId?: string;
  hotjarId?: string;
}

// Financials
export interface Financials {
  fundingRaised: number;
  fundingRounds: FundingRound[];
  revenue: RevenueData;
  expenses: ExpenseData;
  runway: number;
  burnRate: number;
  projections: FinancialProjection[];
}

export interface FundingRound {
  id: string;
  name: string;
  type: 'pre-seed' | 'seed' | 'series-a' | 'series-b' | 'series-c' | 'angel' | 'grant' | 'other';
  amount: number;
  date: string;
  investors: string[];
  valuation?: number;
}

export interface RevenueData {
  currentMRR: number;
  currentARR: number;
  growthRate: number;
  history: MonthlyData[];
}

export interface ExpenseData {
  monthlyBurn: number;
  breakdown: ExpenseCategory[];
}

export interface ExpenseCategory {
  category: string;
  amount: number;
  percentage: number;
}

export interface MonthlyData {
  month: string;
  value: number;
}

export interface FinancialProjection {
  year: number;
  revenue: number;
  expenses: number;
  profit: number;
  customers: number;
}

// Metrics
export interface Metrics {
  totalUsers: number;
  activeUsers: number;
  retentionRate: number;
  churnRate: number;
  nps: number;
  cac: number;
  ltv: number;
  customMetrics: CustomMetric[];
}

export interface CustomMetric {
  id: string;
  name: string;
  value: number;
  target: number;
  unit: string;
}

// AI Generated Content
export interface AIGeneratedContent {
  ideas: GeneratedIdea[];
  marketResearch?: MarketResearch;
  competitorAnalysis?: CompetitorAnalysis;
  financialForecast?: FinancialForecast;
}

export interface GeneratedIdea {
  id: string;
  title: string;
  description: string;
  industry: string;
  marketSize: string;
  difficulty: 'easy' | 'medium' | 'hard';
  potential: 'low' | 'medium' | 'high' | 'moonshot';
  generatedAt: string;
}

export interface MarketResearch {
  id: string;
  marketSize: string;
  tam: number;
  sam: number;
  som: number;
  trends: string[];
  opportunities: string[];
  threats: string[];
  generatedAt: string;
}

export interface CompetitorAnalysis {
  id: string;
  competitors: Competitor[];
  swot: SWOTAnalysis;
  generatedAt: string;
}

export interface Competitor {
  id: string;
  name: string;
  website: string;
  strengths: string[];
  weaknesses: string[];
  marketShare?: number;
  funding?: string;
}

export interface SWOTAnalysis {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export interface FinancialForecast {
  id: string;
  assumptions: string[];
  projections: FinancialProjection[];
  scenarios: Scenario[];
  generatedAt: string;
}

export interface Scenario {
  name: 'conservative' | 'moderate' | 'optimistic';
  projections: FinancialProjection[];
}

// Investors
export interface Investor {
  id: string;
  name: string;
  type: 'angel' | 'vc' | 'pe' | 'corporate' | 'accelerator' | 'incubator' | 'family-office';
  logo: string;
  location: string;
  focusIndustries: string[];
  stages: string[];
  checkSize: {
    min: number;
    max: number;
  };
  aum?: number;
  portfolio: PortfolioCompany[];
  team: InvestorTeamMember[];
  thesis: string;
  criteria: string[];
  matchScore?: number;
  status: 'connected' | 'pending' | 'not-connected';
  connectedAt?: string;
}

export interface PortfolioCompany {
  name: string;
  logo: string;
  industry: string;
  stage: string;
  exit?: 'ipo' | 'acquired' | 'none';
}

export interface InvestorTeamMember {
  id: string;
  name: string;
  role: string;
  avatar: string;
  linkedIn?: string;
}

// Co-founders
export interface CoFounder {
  id: string;
  userId: string;
  name: string;
  avatar: string;
  location: string;
  title: string;
  bio: string;
  skills: string[];
  lookingFor: string[];
  availability: 'full-time' | 'part-time' | 'advisor' | 'open';
  commitment: 'co-founder' | 'early-employee' | 'advisor';
  previousExperience: Experience[];
  education: Education[];
  matchScore?: number;
  status: 'connected' | 'pending' | 'not-connected';
  linkedIn?: string;
  portfolio?: string;
  github?: string;
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  year: string;
}

// Messaging
export interface Conversation {
  id: string;
  participants: Participant[];
  type: 'direct' | 'group';
  title?: string;
  lastMessage: Message;
  unreadCount: number;
  updatedAt: string;
  businessId?: string;
}

export interface Participant {
  id: string;
  name: string;
  avatar: string;
  role: 'founder' | 'investor' | 'cofounder';
}

export interface Message {
  id: string;
  senderId: string;
  content: string;
  type: 'text' | 'file' | 'image' | 'system';
  attachments?: Attachment[];
  timestamp: string;
  readBy: string[];
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: string;
  url: string;
}

// AI Tools
export interface AITool {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'content' | 'research' | 'design' | 'code' | 'strategy';
  inputs: ToolInput[];
  outputs: string[];
  usageCount: number;
}

export interface ToolInput {
  name: string;
  type: 'text' | 'select' | 'multiselect' | 'number' | 'file';
  label: string;
  placeholder?: string;
  options?: string[];
  required: boolean;
}

// Dashboard Views
export type ViewType = 
  | 'dashboard' 
  | 'businesses'
  | 'business-overview'
  | 'ai-assistant'
  | 'pitch-deck'
  | 'business-plan'
  | 'branding-kit'
  | 'website-builder'
  | 'websites'
  | 'milestones'
  | 'documents'
  | 'team'
  | 'business-settings'
  | 'network'
  | 'investors'
  | 'cofounders'
  | 'messages'
  | 'ai-tools'
  | 'generate-idea'
  | 'market-research'
  | 'financial-forecast'
  // Growth features from VM
  | 'crm'
  | 'banking'
  | 'social'
  | 'marketplace'
  // Scale features from VM
  | 'credit-score'
  | 'health-score'
  | 'account'
  | 'profile'
  | 'billing'
  | 'settings';

// Navigation
export interface NavSection {
  title: string;
  items: NavItem[];
}

export interface NavItem {
  label: string;
  icon: string;
  view: ViewType;
  badge?: number;
  children?: NavItem[];
}

// Notifications
export interface AppNotification {
  id: string;
  userId: string;
  type: 'message' | 'milestone' | 'match' | 'system' | 'ai-complete' | 'investor_match' | 'document_shared' | 'team_invite' | 'connection_request';
  title: string;
  description: string;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
  createdAt: string;
}
