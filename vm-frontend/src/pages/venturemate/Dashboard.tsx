import { Box, Typography, Card, Avatar, Chip } from '@mui/material';
import {
  TrendingUp,
  Users,
  Target,
  FileText,
  DollarSign,
  Globe,
  Presentation,
  Building2,
  Bot,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import type { ViewType } from '../../types/venturemate';
import { useBusiness } from '../../contexts/BusinessContext';
import { useCurrency } from '../../contexts/CurrencyContext';

interface DashboardProps {
  onViewChange: (view: ViewType) => void;
}

export function Dashboard({ onViewChange }: DashboardProps) {
   const { user } = useAuth();
   const { businesses, selectedBusiness: activeBusiness } = useBusiness();
   const { format } = useCurrency();
   const b = activeBusiness;
 
const statsCards = b ? [
      { label: 'Total MRR', value: format(b.financials?.revenue?.currentMRR ?? 0), change: `${(b.financials?.revenue?.growthRate ?? 0) >= 0 ? '+' : ''}${b.financials?.revenue?.growthRate ?? 0}%`, icon: DollarSign, color: '#10b981' },
      { label: 'Active Users', value: b.metrics?.totalUsers?.toLocaleString() ?? '0', change: `${b.metrics?.activeUsers?.toLocaleString() ?? '0'} active`, icon: Users, color: '#3b82f6' },
      { label: 'Milestones', value: b.milestones?.length?.toString() ?? '0', change: `${b.milestones?.filter(m => m.status === 'in-progress')?.length ?? 0} in progress`, icon: Target, color: '#f59e0b' },
      { label: 'Documents', value: b.documents?.length?.toString() ?? '0', change: 'All organized', icon: FileText, color: '#8b5cf6' },
      { label: 'Pitch Decks', value: b.pitchDeck?.slides?.length?.toString() ?? '0', change: `${b.pitchDeck?.slides?.length ?? 0} slides`, icon: Presentation, color: '#06b6d4' },
      { label: 'Websites', value: b.websiteConfig?.pages?.length?.toString() ?? '0', change: b.websiteConfig?.status ?? 'draft', icon: Globe, color: '#f97316' },
    ] : [];
 
   return (
     <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
       {/* Welcome */}
       <Box sx={{ mb: 4 }}>
         <Typography
           sx={{
             fontSize: { xs: 22, sm: 24, md: 28 },
             fontWeight: 700,
             color: 'var(--vm-text-primary)',
             mb: 1,
           }}
         >
           Welcome back, {user?.firstName || 'there'}!
         </Typography>
         <Typography sx={{ fontSize: { xs: 13, sm: 14, md: 15 }, color: 'var(--vm-text-muted)' }}>
           {businesses.length > 0
             ? `You have ${businesses.length} business${businesses.length > 1 ? 'es' : ''} registered.`
             : 'Create your first business to get started.'}
         </Typography>
       </Box>

      {/* Stats Grid */}
      {statsCards.length > 0 && (
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' }, gap: '24px', mb: 4 }}>
        {statsCards.map((stat) => (
          <div key={stat.label}>
            <Card
              sx={{
                bgcolor: 'var(--vm-bg-secondary)',
                border: '1px solid var(--vm-border-subtle)',
                borderRadius: 3,
                p: { xs: 2, sm: 2.5, md: 3 },
                transition: 'all 0.3s',
                cursor: 'pointer',
                '&:hover': {
                  borderColor: 'var(--vm-border-secondary)',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    bgcolor: `${stat.color}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <stat.icon size={22} color={stat.color} />
                </Box>
                <Chip
                  size="small"
                  label={stat.change}
                  sx={{
                    bgcolor: stat.change.startsWith('+') || !isNaN(Number(stat.change[0])) ? 'rgba(34, 197, 94, 0.2)' : 'var(--vm-bg-tertiary)',
                    color: stat.change.startsWith('+') || !isNaN(Number(stat.change[0])) ? '#4ade80' : 'var(--vm-text-secondary)',
                    fontSize: 11,
                    fontWeight: 600,
                    '& .MuiChip-label': { whiteSpace: 'normal', py: 0.5 },
                  }}
                />
              </Box>
<Typography sx={{ fontSize: { xs: 20, sm: 24 }, fontWeight: 700, color: 'var(--vm-text-primary)' }}>
                 {stat.value}
               </Typography>
               <Typography sx={{ fontSize: { xs: 11, sm: 13 }, color: 'var(--vm-text-muted)' }}>
                 {stat.label}
               </Typography>
            </Card>
          </div>
        ))}
      </Box>
      )}

      {/* Main Content Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(12, 1fr)' }, gap: '24px' }}>
        {/* Active Business */}
        <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 8' } }}>
          <Card
            sx={{
              bgcolor: 'var(--vm-bg-secondary)',
              border: '1px solid var(--vm-border-subtle)',
              borderRadius: 3,
              p: 3,
              height: '100%',
            }}
          >
            {!activeBusiness ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Building2 size={48} style={{ margin: '0 auto 16px', color: 'var(--vm-text-muted)', opacity: 0.4 }} />
                <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'var(--vm-text-muted)', mb: 1 }}>
                  No Active Business
                </Typography>
                <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)', mb: 3, opacity: 0.7 }}>
                  Create a business to get started with your dashboard.
                </Typography>
                <Box
                  component="button"
                  onClick={() => onViewChange('businesses')}
                  sx={{
                    py: 1.5, px: 3, borderRadius: 2, border: 'none',
                    bgcolor: 'var(--vm-primary-600)', color: 'white', fontSize: 14, fontWeight: 600,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'var(--vm-primary-500)' },
                  }}
                >
                  Create Business
                </Box>
              </Box>
            ) : (<>
<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
               <Typography sx={{ fontSize: { xs: 16, sm: 18 }, fontWeight: 700, color: 'var(--vm-text-primary)' }}>
                 <Building2 size={20} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
                 Active Business
               </Typography>
<Chip
                  label={activeBusiness?.stage?.toUpperCase() ?? 'IDEA'}
                  size="small"
                 sx={{
                   bgcolor: 'var(--vm-primary-900)',
                   color: 'var(--vm-primary-400)',
                   fontWeight: 600,
                   fontSize: { xs: 10, sm: 11 },
                 }}
               />
             </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: 3,
                  background: `linear-gradient(135deg, ${activeBusiness.brandKit?.primaryColor ?? '#059669'} 0%, ${activeBusiness.brandKit?.secondaryColor ?? '#10b981'} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
<Typography sx={{ fontSize: 28, fontWeight: 700, color: 'white' }}>
                   {activeBusiness?.name?.[0] ?? '?'}
                 </Typography>
               </Box>
               <Box>
<Typography sx={{ fontSize: { xs: 18, sm: 20 }, fontWeight: 700, color: 'var(--vm-text-primary)' }}>
                   {activeBusiness?.name ?? 'Untitled'}
                 </Typography>
                 <Typography sx={{ fontSize: { xs: 12, sm: 14 }, color: 'var(--vm-text-muted)' }}>
                   {activeBusiness?.tagline ?? ''}
                 </Typography>
              </Box>
            </Box>

<Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: '16px', mb: 3 }}>
               <div style={{ padding: '16px', backgroundColor: 'var(--vm-bg-tertiary)', borderRadius: '8px' }}>
                 <Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)', mb: 0.5 }}>MRR</Typography>
<Typography sx={{ fontSize: { xs: 14, sm: 16, md: 18 }, fontWeight: 700, color: 'var(--vm-text-primary)' }}>
                    ${activeBusiness.financials?.revenue?.currentMRR?.toLocaleString() ?? 0}
                  </Typography>
               </div>
               <div style={{ padding: '16px', backgroundColor: 'var(--vm-bg-tertiary)', borderRadius: '8px' }}>
                 <Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)', mb: 0.5 }}>Users</Typography>
<Typography sx={{ fontSize: { xs: 14, sm: 16, md: 18 }, fontWeight: 700, color: 'var(--vm-text-primary)' }}>
                    {activeBusiness.metrics?.totalUsers ?? 0}
                  </Typography>
                </div>
                <div style={{ padding: '16px', backgroundColor: 'var(--vm-bg-tertiary)', borderRadius: '8px' }}>
                  <Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)', mb: 0.5 }}>Retention</Typography>
                  <Typography sx={{ fontSize: { xs: 14, sm: 16, md: 18 }, fontWeight: 700, color: 'var(--vm-text-primary)' }}>
                    {activeBusiness.metrics?.retentionRate ?? 0}%
                  </Typography>
                </div>
                <div style={{ padding: '16px', backgroundColor: 'var(--vm-bg-tertiary)', borderRadius: '8px' }}>
                  <Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)', mb: 0.5 }}>Runway</Typography>
                  <Typography sx={{ fontSize: { xs: 14, sm: 16, md: 18 }, fontWeight: 700, color: 'var(--vm-text-primary)' }}>
                    {activeBusiness.financials?.runway ?? 0} mo
                  </Typography>
                </div>
              </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
<Box
                 component="button"
                 onClick={() => onViewChange('pitch-deck')}
                 sx={{
                   flex: 1,
                   py: 1.5, px: 2,
                   borderRadius: 2,
                   border: '1px solid var(--vm-primary-600)',
                   bgcolor: 'var(--vm-primary-600)',
                   color: 'white',
                   fontSize: { xs: 12, sm: 13 },
                   fontWeight: 600,
                   cursor: 'pointer',
                   transition: 'all 0.2s',
                   '&:hover': { bgcolor: 'var(--vm-primary-500)' },
                 }}
               >
                 View Pitch Deck
               </Box>
               <Box
                 component="button"
                 onClick={() => onViewChange('business-plan')}
                 sx={{
                   flex: 1,
                   py: 1.5, px: 2,
                   borderRadius: 2,
                   border: '1px solid var(--vm-border-primary)',
                   bgcolor: 'transparent',
                   color: 'var(--vm-text-secondary)',
                   fontSize: { xs: 12, sm: 13 },
                   fontWeight: 600,
                   cursor: 'pointer',
                   transition: 'all 0.2s',
                   '&:hover': { bgcolor: 'var(--vm-bg-hover)' },
                 }}
               >
                 Business Plan
               </Box>
            </Box>
            </>)}
          </Card>
        </Box>

        {/* Quick Actions */}
        <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 4' } }}>
          <Card
            sx={{
              bgcolor: 'var(--vm-bg-secondary)',
              border: '1px solid var(--vm-border-subtle)',
              borderRadius: 3,
              p: 3,
              height: '100%',
            }}
          >
            <Typography sx={{ fontSize: 18, fontWeight: 700, color: 'var(--vm-text-primary)', mb: 3 }}>
              <Bot size={20} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
              AI Quick Actions
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[
                { label: 'Generate Pitch Deck', icon: Presentation, view: 'pitch-deck' as ViewType },
                { label: 'Write Business Plan', icon: FileText, view: 'business-plan' as ViewType },
                { label: 'Market Research', icon: TrendingUp, view: 'market-research' as ViewType },
                { label: 'Financial Forecast', icon: DollarSign, view: 'financial-forecast' as ViewType },
              ].map((action) => (
                <Box
                  key={action.label}
                  onClick={() => onViewChange(action.view)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 2,
                    borderRadius: 2,
                    bgcolor: 'var(--vm-bg-tertiary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': { bgcolor: 'var(--vm-bg-hover)' },
                  }}
                >
                  <action.icon size={18} color="var(--vm-primary-400)" />
                  <Typography sx={{ flex: 1, fontSize: 14, color: 'var(--vm-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {action.label}
                  </Typography>
                  <ChevronRight size={16} color="var(--vm-text-muted)" />
                </Box>
              ))}
            </Box>
          </Card>
        </Box>

        {/* Milestones */}
        <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 6' } }}>
          <Card
            sx={{
              bgcolor: 'var(--vm-bg-secondary)',
              border: '1px solid var(--vm-border-subtle)',
              borderRadius: 3,
              p: 3,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Typography sx={{ fontSize: 18, fontWeight: 700, color: 'var(--vm-text-primary)' }}>
                <Target size={20} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
                Active Milestones
              </Typography>
              <Typography
                component="span"
                onClick={() => onViewChange('milestones')}
                sx={{
                  fontSize: 13,
                  color: 'var(--vm-primary-400)',
                  cursor: 'pointer',
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                View All
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1, md: 2 } }}>
              {activeBusiness?.milestones?.length ? (
                activeBusiness.milestones.slice(0, 3).map((milestone) => (
                  <Box
                    key={milestone.id}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: 'var(--vm-bg-tertiary)',
                    }}
                  >
                    <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'var(--vm-text-primary)' }}>
                      {milestone.title}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)', mb: 1.5 }}>
                      {milestone.description}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar src={`https://i.pravatar.cc/150?u=${milestone.assignee}`} sx={{ width: 24, height: 24 }} />
                      <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>
                        Due {new Date(milestone.dueDate).toLocaleDateString('en-GB')}
                      </Typography>
                    </Box>
                  </Box>
                ))
              ) : (
                <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)', textAlign: 'center', py: 3 }}>
                  No milestones yet.
                </Typography>
              )}
            </Box>
          </Card>
        </Box>

        {/* Team Members */}
        <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 6' } }}>
          <Card
            sx={{
              bgcolor: 'var(--vm-bg-secondary)',
              border: '1px solid var(--vm-border-subtle)',
              borderRadius: 3,
              p: 3,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Typography sx={{ fontSize: 18, fontWeight: 700, color: 'var(--vm-text-primary)' }}>
                <Users size={20} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
                Team Members
              </Typography>
              <Typography
                component="span"
                onClick={() => onViewChange('team')}
                sx={{
                  fontSize: 13,
                  color: 'var(--vm-primary-400)',
                  cursor: 'pointer',
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                Manage
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1, md: 2 } }}>
              {activeBusiness?.team && activeBusiness.team.length > 0 ? (
                activeBusiness.team.slice(0, 4).map((member) => (
                  <Box
                    key={member.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      p: 2,
                      borderRadius: 2,
                      bgcolor: 'var(--vm-bg-tertiary)',
                    }}
                  >
                    <Avatar src={member.avatar} sx={{ width: 44, height: 44, bgcolor: 'var(--vm-primary-600)' }}>
                      {(member.name?.[0] || '?').toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'var(--vm-text-primary)' }}>
                        {member.name}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>
                        {member.role}
                      </Typography>
                    </Box>
                  </Box>
                ))
              ) : (
                <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)', textAlign: 'center', py: 3 }}>
                  No team members yet.
                </Typography>
              )}
            </Box>
          </Card>
        </Box>
      </Box>
    </Box>
  );
}
