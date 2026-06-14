// Social Media Data - Accounts, Content Calendar, Analytics

export interface SocialMediaAccount {
  id: string;
  platform: 'instagram' | 'twitter' | 'linkedin' | 'facebook';
  account_name: string;
  followers: number;
  following: number;
  posts_count: number;
  engagement_rate: number;
  connected: boolean;
  last_post_date?: string;
}

export interface ContentCalendarItem {
  id: string;
  content_type: 'post' | 'story' | 'reel' | 'article';
  platform: string;
  content: string;
  scheduled_date: string;
  status: 'draft' | 'scheduled' | 'published';
  engagement?: {
    likes: number;
    comments: number;
    shares: number;
    impressions: number;
  };
}

export interface SocialDashboard {
  total_followers: number;
  total_engagement: number;
  avg_engagement_rate: number;
  posts_this_month: number;
  growth_rate: number;
}

export const platforms = [
  { key: 'instagram', name: 'Instagram', color: '#E4405F' },
  { key: 'twitter', name: 'Twitter', color: '#1DA1F2' },
  { key: 'linkedin', name: 'LinkedIn', color: '#0A66C2' },
  { key: 'facebook', name: 'Facebook', color: '#1877F2' },
] as const;

export const socialStats: SocialDashboard = {
  total_followers: 15420,
  total_engagement: 4850,
  avg_engagement_rate: 4.2,
  posts_this_month: 24,
  growth_rate: 12.5,
};

export const socialAccounts: SocialMediaAccount[] = [
  {
    id: 'social_001',
    platform: 'linkedin',
    account_name: 'NeuroTask AI',
    followers: 8200,
    following: 450,
    posts_count: 156,
    engagement_rate: 5.8,
    connected: true,
    last_post_date: '2024-04-03T14:00:00Z',
  },
  {
    id: 'social_002',
    platform: 'twitter',
    account_name: '@neurotask_ai',
    followers: 4200,
    following: 890,
    posts_count: 342,
    engagement_rate: 3.2,
    connected: true,
    last_post_date: '2024-04-04T09:30:00Z',
  },
  {
    id: 'social_003',
    platform: 'instagram',
    account_name: '@neurotask.ai',
    followers: 2800,
    following: 320,
    posts_count: 89,
    engagement_rate: 6.5,
    connected: true,
    last_post_date: '2024-04-02T18:00:00Z',
  },
  {
    id: 'social_004',
    platform: 'facebook',
    account_name: 'NeuroTask AI',
    followers: 220,
    following: 45,
    posts_count: 34,
    engagement_rate: 2.1,
    connected: false,
  },
];

export const contentCalendar: ContentCalendarItem[] = [
  {
    id: 'content_001',
    content_type: 'article',
    platform: 'linkedin',
    content: 'How AI is transforming workplace productivity in 2024. Our latest insights...',
    scheduled_date: '2024-04-05T10:00:00Z',
    status: 'scheduled',
  },
  {
    id: 'content_002',
    content_type: 'post',
    platform: 'twitter',
    content: 'Just shipped: Multi-workflow automation! Now you can chain multiple actions with a single command.',
    scheduled_date: '2024-04-04T15:00:00Z',
    status: 'published',
    engagement: { likes: 128, comments: 24, shares: 45, impressions: 5200 },
  },
  {
    id: 'content_003',
    content_type: 'reel',
    platform: 'instagram',
    content: 'Behind the scenes: How our AI learns your workflow patterns',
    scheduled_date: '2024-04-06T12:00:00Z',
    status: 'draft',
  },
  {
    id: 'content_004',
    content_type: 'post',
    platform: 'linkedin',
    content: 'Excited to announce we have reached 500+ active users! Thank you to our amazing community.',
    scheduled_date: '2024-04-03T14:00:00Z',
    status: 'published',
    engagement: { likes: 456, comments: 67, shares: 23, impressions: 12500 },
  },
  {
    id: 'content_005',
    content_type: 'story',
    platform: 'instagram',
    content: 'Quick tip: Use keyboard shortcuts to save 10+ hours per week',
    scheduled_date: '2024-04-04T20:00:00Z',
    status: 'scheduled',
  },
];
