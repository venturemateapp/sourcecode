import { useState } from 'react';
import { Box, Typography, Card, Avatar, Chip, TextField, InputAdornment, Tabs, Tab, Dialog, DialogTitle, DialogContent, Badge } from '@mui/material';
import {
  Search,
  MapPin,
  Check,
  X,
  Clock,
  MessageSquare,
  ExternalLink,
  Code,
  UserPlus,
  Briefcase,
  Globe,
  Heart,
  Star,
} from 'lucide-react';
import { GradientButton } from '../../components/shared/buttons';
import type { ViewType } from '../../types/venturemate';

// Enhanced cofounder data with match requests
interface CofounderProfile {
  id: string;
  name: string;
  avatar: string;
  title: string;
  location: string;
  bio: string;
  skills: string[];
  experience: string;
  previousCompanies: string[];
  education: string;
  commitment: string;
  availability: string;
  lookingFor: string[];
  matchScore: number;
  linkedIn?: string;
  github?: string;
  website?: string;
  status: 'suggested' | 'pending_sent' | 'pending_received' | 'matched' | 'declined';
  matchRequest?: {
    id: string;
    message: string;
    date: string;
    direction: 'sent' | 'received';
  };
}

const cofoundersData: CofounderProfile[] = [
  {
    id: 'cf_001',
    name: 'Sarah Chen',
    avatar: 'https://i.pravatar.cc/150?u=sarahchen',
    title: 'Former Product Lead at Stripe',
    location: 'San Francisco, CA',
    bio: 'Ex-Stripe PM with 8+ years in fintech. Looking to build the next generation of financial infrastructure. Strong in product strategy, GTM, and fundraising.',
    skills: ['Product Strategy', 'Fintech', 'Fundraising', 'Growth', 'UX Design'],
    experience: '8+ years',
    previousCompanies: ['Stripe', 'Square', 'Robinhood'],
    education: 'Stanford MBA',
    commitment: 'Full-time',
    availability: 'Immediate',
    lookingFor: ['CTO/Technical Co-founder', 'Full-stack Developer'],
    matchScore: 95,
    linkedIn: 'linkedin.com/in/sarahchen',
    status: 'suggested',
  },
  {
    id: 'cf_002',
    name: 'Marcus Johnson',
    avatar: 'https://i.pravatar.cc/150?u=marcusj',
    title: 'Engineering Manager at Google',
    location: 'New York, NY',
    bio: 'Tech lead with deep expertise in AI/ML infrastructure. Built systems serving 100M+ users. Looking for a visionary founder with strong business acumen.',
    skills: ['AI/ML', 'System Design', 'Python', 'Go', 'Cloud Architecture'],
    experience: '10+ years',
    previousCompanies: ['Google', 'Meta', 'Uber'],
    education: 'MIT CS PhD',
    commitment: 'Full-time',
    availability: '2 weeks notice',
    lookingFor: ['CEO/Business Co-founder', 'Domain Expert'],
    matchScore: 92,
    linkedIn: 'linkedin.com/in/marcusj',
    github: 'github.com/marcusj',
    status: 'pending_received',
    matchRequest: {
      id: 'mr_001',
      message: 'Hi! I saw your profile and think we could build something great together. I have a fintech idea with initial traction.',
      date: '2024-04-02',
      direction: 'received',
    },
  },
  {
    id: 'cf_003',
    name: 'Emily Rodriguez',
    avatar: 'https://i.pravatar.cc/150?u=emilyr',
    title: 'Founder @ HealthTech Startup (Exit)',
    location: 'Austin, TX',
    bio: 'Serial entrepreneur with one exit in healthcare. Deep network in the industry. Looking for technical co-founder to disrupt healthcare payments.',
    skills: ['Healthcare', 'Business Development', 'Sales', 'Strategy', 'Operations'],
    experience: '12+ years',
    previousCompanies: ['HealthTech Co (Acquired)', 'McKinsey'],
    education: 'Harvard Business School',
    commitment: 'Full-time',
    availability: 'Immediate',
    lookingFor: ['CTO', 'Full-stack Developer', 'Healthcare Expert'],
    matchScore: 88,
    linkedIn: 'linkedin.com/in/emilyr',
    status: 'matched',
  },
  {
    id: 'cf_004',
    name: 'David Kim',
    avatar: 'https://i.pravatar.cc/150?u=davidkim',
    title: 'Staff Engineer at Netflix',
    location: 'Los Angeles, CA',
    bio: 'Full-stack engineer passionate about consumer products. Built multiple side projects with 10K+ users. Looking for business-minded co-founder.',
    skills: ['React', 'Node.js', 'TypeScript', 'AWS', 'Product Engineering'],
    experience: '7+ years',
    previousCompanies: ['Netflix', 'Airbnb', 'Snap'],
    education: 'UC Berkeley CS',
    commitment: 'Full-time',
    availability: '1 month',
    lookingFor: ['CEO/Business Co-founder', 'Product Manager'],
    matchScore: 85,
    linkedIn: 'linkedin.com/in/davidkim',
    github: 'github.com/davidkim',
    status: 'suggested',
  },
  {
    id: 'cf_005',
    name: 'Alex Thompson',
    avatar: 'https://i.pravatar.cc/150?u=alext',
    title: 'Growth Lead at Notion',
    location: 'Remote',
    bio: 'Growth expert who scaled multiple SaaS products from 0 to $10M ARR. Data-driven marketer with strong product sense.',
    skills: ['Growth Marketing', 'SEO', 'Product-Led Growth', 'Analytics', 'Content'],
    experience: '6+ years',
    previousCompanies: ['Notion', 'Figma', 'Loom'],
    education: 'Wharton',
    commitment: 'Full-time',
    availability: 'Immediate',
    lookingFor: ['Technical Co-founder', 'CTO'],
    matchScore: 90,
    linkedIn: 'linkedin.com/in/alext',
    status: 'pending_sent',
    matchRequest: {
      id: 'mr_002',
      message: 'Hey Alex! Love your background in PLG. I am building a productivity tool and think you would be a great fit.',
      date: '2024-04-01',
      direction: 'sent',
    },
  },
  {
    id: 'cf_006',
    name: 'Priya Patel',
    avatar: 'https://i.pravatar.cc/150?u=priyap',
    title: 'AI Researcher at OpenAI',
    location: 'San Francisco, CA',
    bio: 'AI researcher focusing on LLMs and agent systems. Published author with 50+ citations. Looking to commercialize research.',
    skills: ['Machine Learning', 'LLMs', 'Python', 'PyTorch', 'Research'],
    experience: '5+ years',
    previousCompanies: ['OpenAI', 'DeepMind', 'Google Research'],
    education: 'Stanford AI PhD',
    commitment: 'Full-time',
    availability: '3 months',
    lookingFor: ['Business Co-founder', 'Product Manager'],
    matchScore: 93,
    linkedIn: 'linkedin.com/in/priyap',
    github: 'github.com/priyap',
    status: 'suggested',
  },
];

interface CoFoundersProps {
  onViewChange: (view: ViewType) => void;
}

export function CoFoundersPage({ onViewChange }: CoFoundersProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [cofounders, setCofounders] = useState<CofounderProfile[]>(cofoundersData);
  const [selectedProfile, setSelectedProfile] = useState<CofounderProfile | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchMessage, setMatchMessage] = useState('');
  const [matchSuccess, setMatchSuccess] = useState(false);

  const filteredCofounders = cofounders.filter(cf => 
    cf.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cf.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase())) ||
    cf.lookingFor.some(l => l.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const suggested = filteredCofounders.filter(c => c.status === 'suggested');
  const matched = filteredCofounders.filter(c => c.status === 'matched');
  const pendingSent = filteredCofounders.filter(c => c.status === 'pending_sent');
  const pendingReceived = filteredCofounders.filter(c => c.status === 'pending_received');

  const handleViewProfile = (profile: CofounderProfile) => {
    setSelectedProfile(profile);
    setShowProfileModal(true);
  };

  const handleSendMatch = () => {
    if (!selectedProfile) return;
    
    setCofounders(prev => prev.map(cf => 
      cf.id === selectedProfile.id 
        ? { 
            ...cf, 
            status: 'pending_sent',
            matchRequest: {
              id: `mr_${Date.now()}`,
              message: matchMessage,
              date: new Date().toISOString().split('T')[0],
              direction: 'sent',
            }
          }
        : cf
    ));
    
    setMatchSuccess(true);
    setTimeout(() => {
      setShowMatchModal(false);
      setShowProfileModal(false);
      setMatchSuccess(false);
      setMatchMessage('');
    }, 1500);
  };

  const handleAcceptMatch = (profileId: string) => {
    setCofounders(prev => prev.map(cf => 
      cf.id === profileId 
        ? { ...cf, status: 'matched' }
        : cf
    ));
  };

  const handleDeclineMatch = (profileId: string) => {
    setCofounders(prev => prev.map(cf => 
      cf.id === profileId 
        ? { ...cf, status: 'declined' }
        : cf
    ));
  };

  const handleCancelRequest = (profileId: string) => {
    setCofounders(prev => prev.map(cf => 
      cf.id === profileId 
        ? { ...cf, status: 'suggested', matchRequest: undefined }
        : cf
    ));
  };

  const renderProfileCard = (cofounder: CofounderProfile, showActions = true) => (
    <Card
      key={cofounder.id}
      sx={{
        bgcolor: 'var(--vm-bg-secondary)',
        border: cofounder.status === 'matched' ? '2px solid #22c55e' : '1px solid var(--vm-border-subtle)',
        borderRadius: 3,
        p: { xs: 2, sm: 3 },
        height: '100%',
        width: '100%',
        maxWidth: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Status Badge */}
      {cofounder.status === 'matched' && (
        <Chip
          size="small"
          icon={<Heart size={12} />}
          label="Matched"
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            bgcolor: 'rgba(34, 197, 94, 0.2)',
            color: '#22c55e',
            fontWeight: 600,
            fontSize: 10,
          }}
        />
      )}

      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
        <Avatar src={cofounder.avatar} sx={{ width: 64, height: 64 }} />
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontSize: 18, fontWeight: 700, color: 'var(--vm-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {cofounder.name}
          </Typography>
            {cofounder.status === 'matched' && <Check size={16} color="#22c55e" />}
          </Box>
          <Typography sx={{ fontSize: 13, color: 'var(--vm-primary-400)', mb: 0.5 }}>
            {cofounder.title}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <MapPin size={12} color="var(--vm-text-muted)" />
            <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>
              {cofounder.location}
            </Typography>
          </Box>
        </Box>
        <Chip
          size="small"
          label={`${cofounder.matchScore}% Match`}
          sx={{
            bgcolor: cofounder.matchScore >= 90 ? 'rgba(16, 185, 129, 0.2)' : 'var(--vm-bg-tertiary)',
            color: cofounder.matchScore >= 90 ? '#34d399' : 'var(--vm-text-secondary)',
            fontWeight: 600,
            fontSize: 11,
          }}
        />
      </Box>

      <Typography sx={{ fontSize: 13, color: 'var(--vm-text-secondary)', mb: 2, lineHeight: 1.6,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
      }}>
        {cofounder.bio.substring(0, 120)}...
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2 }}>
        {cofounder.skills.slice(0, 4).map((skill) => (
          <Chip
            key={skill}
            size="small"
            label={skill}
            sx={{
              bgcolor: 'var(--vm-bg-tertiary)',
              color: 'var(--vm-text-secondary)',
              fontSize: 10,
            }}
          />
        ))}
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, p: 1.5, bgcolor: 'var(--vm-bg-tertiary)', borderRadius: 2 }}>
        <Box sx={{ flex: 1, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)' }}>Looking for</Typography>
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'var(--vm-text-primary)' }}>
            {cofounder.lookingFor[0]}
          </Typography>
        </Box>
        <Box sx={{ flex: 1, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)' }}>Experience</Typography>
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'var(--vm-text-primary)' }}>
            {cofounder.experience}
          </Typography>
        </Box>
      </Box>

      {cofounder.status === 'pending_received' && cofounder.matchRequest && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'var(--vm-bg-tertiary)', borderRadius: 2 }}>
          <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)', mb: 0.5 }}>
            Message from {cofounder.name}:
          </Typography>
          <Typography sx={{ fontSize: 13, color: 'var(--vm-text-secondary)', fontStyle: 'italic' }}>
            "{cofounder.matchRequest.message}"
          </Typography>
        </Box>
      )}

      {showActions && (
        <Box sx={{ mt: 'auto', display: 'flex', gap: 1 }}>
          {cofounder.status === 'suggested' && (
            <>
              <GradientButton variant="outline" size="sm" fullWidth onClick={() => handleViewProfile(cofounder)}>
                View Profile
              </GradientButton>
              <GradientButton variant="primary" size="sm" fullWidth onClick={() => { setSelectedProfile(cofounder); setShowMatchModal(true); }}>
                <UserPlus size={14} style={{ marginRight: 6 }} />
                Match
              </GradientButton>
            </>
          )}

          {cofounder.status === 'pending_sent' && (
            <>
              <Box sx={{ flex: 1, py: 1.5, textAlign: 'center', bgcolor: 'var(--vm-bg-tertiary)', borderRadius: 1.5 }}>
                <Clock size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle', color: 'var(--vm-text-muted)' }} />
                <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)', display: 'inline' }}>
                  Request Pending
                </Typography>
              </Box>
              <GradientButton variant="outline" size="sm" onClick={() => handleCancelRequest(cofounder.id)}>
                <X size={14} />
              </GradientButton>
            </>
          )}

          {cofounder.status === 'pending_received' && (
            <>
              <GradientButton variant="outline" size="sm" fullWidth onClick={() => handleDeclineMatch(cofounder.id)}>
                Decline
              </GradientButton>
              <GradientButton variant="primary" size="sm" fullWidth onClick={() => handleAcceptMatch(cofounder.id)}>
                <Check size={14} style={{ marginRight: 6 }} />
                Accept Match
              </GradientButton>
            </>
          )}

          {cofounder.status === 'matched' && (
            <>
              <GradientButton variant="outline" size="sm" fullWidth onClick={() => handleViewProfile(cofounder)}>
                View Profile
              </GradientButton>
              <GradientButton variant="primary" size="sm" fullWidth onClick={() => onViewChange('messages')}>
                <MessageSquare size={14} style={{ marginRight: 6 }} />
                Message
              </GradientButton>
            </>
          )}
        </Box>
      )}
    </Card>
  );

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', mb: 4, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 2, sm: 0 } }}>
        <Box>
          <Typography sx={{ fontSize: { xs: 22, sm: 28 }, fontWeight: 700, color: 'var(--vm-text-primary)', mb: 1 }}>
            Find Co-founders
          </Typography>
          <Typography sx={{ fontSize: { xs: 13, sm: 15, md: 16 }, color: 'var(--vm-text-muted)' }}>
            Connect with talented founders looking for their next venture
          </Typography>
        </Box>
        <TextField
          placeholder="Search by name, skill, or role..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={18} color="var(--vm-text-muted)" />
              </InputAdornment>
            ),
          }}
          sx={{
            width: { xs: '100%', sm: 320 },
            '& .MuiInputBase-root': { bgcolor: 'var(--vm-bg-secondary)', color: 'var(--vm-text-primary)' },
            '& .MuiInputLabel-root': { color: 'var(--vm-text-muted)' },
            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' },
          }}
        />
      </Box>

      {/* Stats */}
      <Box sx={{ display: { xs: 'grid', sm: 'flex' }, gridTemplateColumns: '1fr 1fr', gap: 2, mb: 4 }}>
        {[
          { label: 'New Matches', value: pendingReceived.length, color: '#f59e0b', icon: Heart },
          { label: 'Connected', value: matched.length, color: '#22c55e', icon: Check },
          { label: 'Pending', value: pendingSent.length, color: '#3b82f6', icon: Clock },
        ].map((stat) => (
          <Card
            key={stat.label}
            sx={{
              bgcolor: 'var(--vm-bg-secondary)',
              border: '1px solid var(--vm-border-subtle)',
              borderRadius: 2,
              p: 2,
              flex: { sm: 1 },
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: `${stat.color}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <stat.icon size={20} color={stat.color} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 20, fontWeight: 700, color: 'var(--vm-text-primary)' }}>
                {stat.value}
              </Typography>
              <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>{stat.label}</Typography>
            </Box>
          </Card>
        ))}
      </Box>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          mb: 3,
          '& .MuiTabs-indicator': { bgcolor: 'var(--vm-primary-500)' },
          '& .MuiTab-root': {
            color: 'var(--vm-text-muted)',
            textTransform: 'none',
            fontSize: { xs: '0.75rem', sm: '0.875rem' },
            minWidth: { xs: 'auto', sm: 90 },
            '&.Mui-selected': { color: 'var(--vm-primary-400)' },
          },
        }}
      >
        <Tab 
          label={
            <Badge badgeContent={pendingReceived.length} color="error" sx={{ '& .MuiBadge-badge': { fontSize: 10 } }}>
              <span style={{ paddingRight: pendingReceived.length > 0 ? 12 : 0 }}>For You</span>
            </Badge>
          } 
        />
        <Tab label={`Suggested (${suggested.length})`} />
        <Tab label={`Connected (${matched.length})`} />
        <Tab label={`Pending (${pendingSent.length})`} />
      </Tabs>

      {/* Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: '24px' }}>
        {activeTab === 0 && pendingReceived.map(cf => renderProfileCard(cf))}
        {activeTab === 0 && pendingReceived.length === 0 && (
          <Box sx={{ gridColumn: { xs: '1 / -1', sm: 'span 2', lg: 'span 3' }, textAlign: 'center', py: 8 }}>
            <Heart size={48} color="var(--vm-text-muted)" style={{ margin: '0 auto 16px' }} />
            <Typography sx={{ fontSize: 16, color: 'var(--vm-text-muted)' }}>
              No new match requests. Check back soon!
            </Typography>
          </Box>
        )}
        {activeTab === 1 && suggested.map(cf => renderProfileCard(cf))}
        {activeTab === 2 && matched.map(cf => renderProfileCard(cf))}
        {activeTab === 3 && pendingSent.map(cf => renderProfileCard(cf))}
      </Box>

      {/* Profile Detail Modal */}
      <Dialog 
        open={showProfileModal} 
        onClose={() => setShowProfileModal(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'var(--vm-bg-secondary)',
            border: '1px solid var(--vm-border-subtle)',
            borderRadius: 3,
            maxHeight: '90vh',
          }
        }}
      >
        {selectedProfile && (
          <>
            <DialogTitle sx={{ p: 3, pb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
                <Avatar src={selectedProfile.avatar} sx={{ width: 80, height: 80 }} />
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: 24, fontWeight: 700, color: 'var(--vm-text-primary)', mb: 0.5 }}>
                    {selectedProfile.name}
                  </Typography>
                  <Typography sx={{ fontSize: 15, color: 'var(--vm-primary-400)', mb: 1 }}>
                    {selectedProfile.title}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Chip
                      size="small"
                      icon={<MapPin size={12} />}
                      label={selectedProfile.location}
                      sx={{ bgcolor: 'var(--vm-bg-tertiary)', color: 'var(--vm-text-secondary)', fontSize: 11 }}
                    />
                    <Chip
                      size="small"
                      icon={<Briefcase size={12} />}
                      label={selectedProfile.experience}
                      sx={{ bgcolor: 'var(--vm-bg-tertiary)', color: 'var(--vm-text-secondary)', fontSize: 11 }}
                    />
                    <Chip
                      size="small"
                      icon={<Globe size={12} />}
                      label={selectedProfile.commitment}
                      sx={{ bgcolor: 'var(--vm-bg-tertiary)', color: 'var(--vm-text-secondary)', fontSize: 11 }}
                    />
                    <Chip
                      size="small"
                      label={`${selectedProfile.matchScore}% Match`}
                      sx={{ bgcolor: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontWeight: 600, fontSize: 11 }}
                    />
                  </Box>
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent sx={{ p: 3, pt: 0 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 4 }}>
                <Box>
                  <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 1.5 }}>
                    About
                  </Typography>
                  <Typography sx={{ fontSize: 14, color: 'var(--vm-text-secondary)', mb: 3, lineHeight: 1.7 }}>
                    {selectedProfile.bio}
                  </Typography>

                  <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 1.5 }}>
                    Skills
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 3 }}>
                    {selectedProfile.skills.map((skill) => (
                      <Chip
                        key={skill}
                        size="small"
                        label={skill}
                        sx={{
                          bgcolor: 'var(--vm-bg-tertiary)',
                          color: 'var(--vm-text-secondary)',
                          fontSize: 11,
                        }}
                      />
                    ))}
                  </Box>

                  <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 1.5 }}>
                    Previous Companies
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
                    {selectedProfile.previousCompanies.map((company) => (
                      <Box key={company} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Star size={14} color="var(--vm-primary-400)" />
                        <Typography sx={{ fontSize: 14, color: 'var(--vm-text-secondary)' }}>{company}</Typography>
                      </Box>
                    ))}
                  </Box>

                  <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 1.5 }}>
                    Looking For
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                    {selectedProfile.lookingFor.map((role) => (
                      <Chip
                        key={role}
                        size="small"
                        label={role}
                        sx={{
                          bgcolor: 'var(--vm-primary-900)',
                          color: 'var(--vm-primary-400)',
                          fontSize: 11,
                        }}
                      />
                    ))}
                  </Box>
                </Box>

                <Box>
                  <Card sx={{ bgcolor: 'var(--vm-bg-primary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 2, p: 3, mb: 3 }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 2 }}>
                      Education
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: 'var(--vm-text-secondary)' }}>
                      {selectedProfile.education}
                    </Typography>
                  </Card>

                  <Card sx={{ bgcolor: 'var(--vm-bg-primary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 2, p: 3, mb: 3 }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 2 }}>
                      Availability
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: 'var(--vm-text-secondary)' }}>
                      {selectedProfile.availability}
                    </Typography>
                  </Card>

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {selectedProfile.linkedIn && (
                      <GradientButton variant="outline" size="sm" fullWidth>
                        <ExternalLink size={14} style={{ marginRight: 6 }} />
                        LinkedIn
                      </GradientButton>
                    )}
                    {selectedProfile.github && (
                      <GradientButton variant="outline" size="sm" fullWidth>
                        <Code size={14} style={{ marginRight: 6 }} />
                        GitHub
                      </GradientButton>
                    )}
                  </Box>
                </Box>
              </Box>
            </DialogContent>
          </>
        )}
      </Dialog>

      {/* Send Match Modal */}
      <Dialog
        open={showMatchModal}
        onClose={() => setShowMatchModal(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'var(--vm-bg-secondary)',
            border: '1px solid var(--vm-border-subtle)',
            borderRadius: 3,
          }
        }}
      >
        {matchSuccess ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                bgcolor: 'rgba(34, 197, 94, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
              }}
            >
              <Check size={32} color="#22c55e" />
            </Box>
            <Typography sx={{ fontSize: 18, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 1 }}>
              Match Request Sent!
            </Typography>
            <Typography sx={{ fontSize: 14, color: 'var(--vm-text-muted)' }}>
              We will notify you when {selectedProfile?.name} responds.
            </Typography>
          </Box>
        ) : (
          <>
            <DialogTitle sx={{ p: 3 }}>
              <Typography sx={{ fontSize: 18, fontWeight: 700, color: 'var(--vm-text-primary)' }}>
                Send Match Request to {selectedProfile?.name}
              </Typography>
            </DialogTitle>
            <DialogContent sx={{ p: 3, pt: 0 }}>
              <Typography sx={{ fontSize: 14, color: 'var(--vm-text-secondary)', mb: 2 }}>
                Introduce yourself and explain why you think you would be a great match.
              </Typography>
              <TextField
                multiline
                rows={4}
                placeholder="Hi! I saw your profile and..."
                value={matchMessage}
                onChange={(e) => setMatchMessage(e.target.value)}
                fullWidth
                sx={{
                  '& .MuiInputBase-root': { bgcolor: 'var(--vm-bg-primary)', color: 'var(--vm-text-primary)' },
                  '& .MuiInputLabel-root': { color: 'var(--vm-text-muted)' },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' },
                }}
              />
              <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                <GradientButton variant="outline" size="md" fullWidth onClick={() => setShowMatchModal(false)}>
                  Cancel
                </GradientButton>
                <GradientButton variant="primary" size="md" fullWidth onClick={handleSendMatch}>
                  Send Request
                </GradientButton>
              </Box>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
}
