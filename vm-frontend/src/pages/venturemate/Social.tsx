import { Box, Typography, Card, Chip } from '@mui/material';
import { GradientButton } from '../../components/shared/buttons';
import {
  Sparkles,
  Calendar,
  TrendingUp,
  Users,
  Heart,
  MessageCircle,
  Share2,
  Plus,
  Globe,
} from 'lucide-react';


const platforms = [
  { key: 'instagram', name: 'Instagram', color: '#E4405F' },
  { key: 'twitter', name: 'Twitter', color: '#1DA1F2' },
  { key: 'linkedin', name: 'LinkedIn', color: '#0A66C2' },
  { key: 'facebook', name: 'Facebook', color: '#1877F2' },
];

const socialStats = { total_followers: 15420, total_engagement: 4850, avg_engagement_rate: 4.2, posts_this_month: 24, growth_rate: 12.5 };

const socialAccounts = [
  { id: 'social_001', platform: 'linkedin', account_name: 'NeuroTask AI', followers: 8200, following: 450, posts_count: 156, engagement_rate: 5.8, connected: true, last_post_date: '2024-04-03T14:00:00Z' },
  { id: 'social_002', platform: 'twitter', account_name: '@neurotask_ai', followers: 4200, following: 890, posts_count: 342, engagement_rate: 3.2, connected: true, last_post_date: '2024-04-04T09:30:00Z' },
  { id: 'social_003', platform: 'instagram', account_name: '@neurotask.ai', followers: 2800, following: 320, posts_count: 89, engagement_rate: 6.5, connected: true, last_post_date: '2024-04-02T18:00:00Z' },
  { id: 'social_004', platform: 'facebook', account_name: 'NeuroTask AI', followers: 220, following: 45, posts_count: 34, engagement_rate: 2.1, connected: false },
];

const contentCalendar = [
  { id: 'content_001', content_type: 'article', platform: 'linkedin', content: 'How AI is transforming workplace productivity in 2024. Our latest insights...', scheduled_date: '2024-04-05T10:00:00Z', status: 'scheduled' },
  { id: 'content_002', content_type: 'post', platform: 'twitter', content: 'Just shipped: Multi-workflow automation! Now you can chain multiple actions with a single command.', scheduled_date: '2024-04-04T15:00:00Z', status: 'published', engagement: { likes: 128, comments: 24, shares: 45, impressions: 5200 } },
  { id: 'content_003', content_type: 'reel', platform: 'instagram', content: 'Behind the scenes: How our AI learns your workflow patterns', scheduled_date: '2024-04-06T12:00:00Z', status: 'draft' },
  { id: 'content_004', content_type: 'post', platform: 'linkedin', content: 'Excited to announce we have reached 500+ active users! Thank you to our amazing community.', scheduled_date: '2024-04-03T14:00:00Z', status: 'published', engagement: { likes: 456, comments: 67, shares: 23, impressions: 12500 } },
  { id: 'content_005', content_type: 'story', platform: 'instagram', content: 'Quick tip: Use keyboard shortcuts to save 10+ hours per week', scheduled_date: '2024-04-04T20:00:00Z', status: 'scheduled' },
];

const platformIcons: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  instagram: Globe,
  twitter: Globe,
  linkedin: Globe,
  facebook: Globe,
};

export function SocialPage() {

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return '#22c55e';
      case 'scheduled': return '#3b82f6';
      case 'draft': return '#6b7280';
      default: return '#6b7280';
    }
  };

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', mb: { xs: 3, md: 4 }, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 2, sm: 0 } }}>
        <Box>
          <Typography sx={{ fontSize: { xs: 16, sm: 18, md: 24 }, fontWeight: 700, color: 'var(--vm-text-primary)', mb: 1 }}>
            Social Media
          </Typography>
          <Typography sx={{ fontSize: { xs: 12, sm: 13, md: 15 }, color: 'var(--vm-text-muted)' }}>
            Manage accounts, schedule content, and track engagement
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: { xs: 1, sm: 2 }, width: { xs: '100%', sm: 'auto' }, '& > *': { flex: { xs: 1, sm: 'none' } }, justifyContent: 'center' }}>
          <GradientButton variant="outline" size="md">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Sparkles size={18} />
              AI Generate
            </Box>
          </GradientButton>
          <GradientButton variant="primary" size="md">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Plus size={18} />
              New Post
            </Box>
          </GradientButton>
        </Box>
      </Box>

      {/* Stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: { xs: 2, md: 3 }, mb: { xs: 3, md: 4 } }}>
        {[
          { label: 'Total Followers', value: socialStats.total_followers.toLocaleString(), icon: Users, color: '#3b82f6' },
          { label: 'Engagement', value: socialStats.total_engagement.toLocaleString(), icon: Heart, color: '#e91e63' },
          { label: 'Avg Rate', value: `${socialStats.avg_engagement_rate}%`, icon: TrendingUp, color: '#22c55e' },
          { label: 'This Month', value: socialStats.posts_this_month.toString(), icon: Calendar, color: '#f59e0b' },
        ].map((stat) => (
          <Card
            key={stat.label}
            sx={{
              bgcolor: 'var(--vm-bg-secondary)',
              border: '1px solid var(--vm-border-subtle)',
              borderRadius: 3,
              p: { xs: 2, sm: 3 },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box
                sx={{
                  width: { xs: 36, sm: 44 },
                  height: { xs: 36, sm: 44 },
                  borderRadius: 2,
                  bgcolor: `${stat.color}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <stat.icon size={22} color={stat.color} />
              </Box>
            </Box>
<Typography sx={{ fontSize: { xs: 16, sm: 20 }, fontWeight: 700, color: 'var(--vm-text-primary)' }}>
               {stat.value}
             </Typography>
             <Typography sx={{ fontSize: { xs: 10, sm: 12 }, color: 'var(--vm-text-muted)' }}>
               {stat.label}
             </Typography>
          </Card>
        ))}
      </Box>

      {/* Connected Accounts */}
<Typography sx={{ fontSize: { xs: 16, sm: 20 }, fontWeight: 700, color: 'var(--vm-text-primary)', mb: { xs: 1, md: 3 } }}>
          Connected Accounts
        </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: { xs: 2, md: 3 }, mb: { xs: 3, md: 4 } }}>
        {socialAccounts.map((account) => {
          const PlatformIcon = platformIcons[account.platform];
          const platformData = platforms.find(p => p.key === account.platform);

          return (
            <Card
              key={account.id}
              sx={{
                bgcolor: 'var(--vm-bg-secondary)',
                border: account.connected ? `2px solid ${platformData?.color}` : '1px solid var(--vm-border-subtle)',
                borderRadius: 3,
                p: { xs: 2, sm: 3 },
                opacity: account.connected ? 1 : 0.6,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box
                  sx={{
                    width: { xs: 40, sm: 48 },
                    height: { xs: 40, sm: 48 },
                    borderRadius: 2,
                    bgcolor: `${platformData?.color}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {PlatformIcon && <PlatformIcon size={24} color={platformData?.color} />}
                </Box>
                <Chip
                  size="small"
                  label={account.connected ? 'Connected' : 'Disconnected'}
                  sx={{
                    bgcolor: account.connected ? 'rgba(34, 197, 94, 0.2)' : 'var(--vm-bg-tertiary)',
                    color: account.connected ? '#22c55e' : 'var(--vm-text-muted)',
                    fontSize: 10,
                    fontWeight: 600,
                    '& .MuiChip-label': { whiteSpace: 'normal', py: 0.5 },
                  }}
                />
              </Box>
<Typography sx={{ fontSize: { xs: 11, sm: 12, md: 14 }, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 0.5 }}>
                 {account.account_name}
               </Typography>
               <Typography sx={{ fontSize: { xs: 14, sm: 16, md: 20 }, fontWeight: 700, color: 'var(--vm-text-primary)', mb: 1 }}>
                 {account.followers.toLocaleString()}
               </Typography>
              <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>
                followers • {account.engagement_rate}% engagement
              </Typography>
            </Card>
          );
        })}
      </Box>

      {/* Content Calendar */}
      <Typography sx={{ fontSize: 18, fontWeight: 700, color: 'var(--vm-text-primary)', mb: 3 }}>
        Content Calendar
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: { xs: 2, md: 3 } }}>
        {contentCalendar.map((content) => {
          const platformData = platforms.find(p => p.key === content.platform);

          return (
            <Card
              key={content.id}
              sx={{
                bgcolor: 'var(--vm-bg-secondary)',
                border: '1px solid var(--vm-border-subtle)',
                borderRadius: 3,
                p: { xs: 2, sm: 3 },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: platformData?.color,
                    }}
                  />
                  <Typography sx={{ fontSize: 13, color: 'var(--vm-text-secondary)', textTransform: 'capitalize' }}>
                    {content.platform}
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  label={content.status}
                  sx={{
                    bgcolor: `${getStatusColor(content.status)}20`,
                    color: getStatusColor(content.status),
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: 'capitalize',
                    '& .MuiChip-label': { whiteSpace: 'normal', py: 0.5 },
                  }}
                />
              </Box>

              <Typography sx={{ fontSize: { xs: 12, sm: 13 }, color: 'var(--vm-text-primary)', mb: 2, lineHeight: 1.5 }}>
                {content.content}
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>
                  {new Date(content.scheduled_date).toLocaleString('en-GB')}
                </Typography>

                {content.engagement && (
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Heart size={14} color="var(--vm-text-muted)" />
                      <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>
                        {content.engagement.likes}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <MessageCircle size={14} color="var(--vm-text-muted)" />
                      <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>
                        {content.engagement.comments}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Share2 size={14} color="var(--vm-text-muted)" />
                      <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>
                        {content.engagement.shares}
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Box>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
}
