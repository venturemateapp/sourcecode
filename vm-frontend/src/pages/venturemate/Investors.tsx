import { useState, useEffect } from 'react';
import { Box, Typography, Card, Avatar, Chip, TextField, InputAdornment, Tabs, Tab } from '@mui/material';
import {
  Search,
  Filter,
  Check,
  Clock,
  Briefcase,
  DollarSign,
} from 'lucide-react';
import type { ViewType, Investor } from '../../types/venturemate';
import { graphqlRequest } from '../../lib/api';

const INVESTORS_QUERY = `
  query Investors {
    investors {
      id, name, type, logo, location,
      focusIndustries, stages, checkSize, aum,
      portfolio, team, thesis, criteria,
      matchScore, status, connectedAt
    }
  }
`;

interface ApiInvestor {
  id: string;
  name: string;
  type: string;
  logo: string;
  location: string;
  focusIndustries: string;
  stages: string;
  checkSize: string;
  aum: number | null;
  portfolio: string;
  team: string;
  thesis: string;
  criteria: string;
  matchScore: number | null;
  status: string;
  connectedAt: string | null;
}

function mapApiToInvestor(api: ApiInvestor): Investor {
  return {
    id: api.id,
    name: api.name,
    type: api.type as Investor['type'],
    logo: api.logo,
    location: api.location,
    focusIndustries: JSON.parse(api.focusIndustries || '[]'),
    stages: JSON.parse(api.stages || '[]'),
    checkSize: JSON.parse(api.checkSize || '{"min":0,"max":0}'),
    aum: api.aum ?? undefined,
    portfolio: JSON.parse(api.portfolio || '[]'),
    team: JSON.parse(api.team || '[]'),
    thesis: api.thesis,
    criteria: JSON.parse(api.criteria || '[]'),
    matchScore: api.matchScore ?? undefined,
    status: api.status as Investor['status'],
    connectedAt: api.connectedAt ?? undefined,
  };
}

interface InvestorsProps {
  onViewChange: (view: ViewType) => void;
}

export function InvestorsPage({ onViewChange }: InvestorsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [, setSelectedInvestor] = useState<Investor | null>(null);
  const [investors, setInvestors] = useState<Investor[]>([]);

  useEffect(() => {
    let cancelled = false;
    graphqlRequest<{ investors: ApiInvestor[] }>(INVESTORS_QUERY).then(data => {
      if (!cancelled) setInvestors((data.investors || []).map(mapApiToInvestor));
    }).catch(() => {
      if (!cancelled) setInvestors([]);
    });
    return () => { cancelled = true; };
  }, []);

  const filteredInvestors = investors.filter(inv => 
    inv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.focusIndustries.some(i => i.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const connectedInvestors = filteredInvestors.filter(i => i.status === 'connected');
  const pendingInvestors = filteredInvestors.filter(i => i.status === 'pending');
  const suggestedInvestors = filteredInvestors.filter(i => i.status === 'not-connected');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <Check size={14} color="#22c55e" />;
      case 'pending': return <Clock size={14} color="#f59e0b" />;
      default: return null;
    }
  };

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', mb: 4, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 2, sm: 0 } }}>
        <Box>
          <Typography sx={{ fontSize: { xs: 22, sm: 28 }, fontWeight: 700, color: 'var(--vm-text-primary)', mb: 1 }}>
            Investors
          </Typography>
          <Typography sx={{ fontSize: { xs: 13, sm: 15, md: 16 }, color: 'var(--vm-text-muted)' }}>
            Connect with investors that match your business
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, width: { xs: '100%', sm: 'auto' }, justifyContent: 'center' }}>
          <TextField
            placeholder="Search investors..."
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
              flex: { xs: 1, sm: 'none' },
              '& .MuiInputBase-root': { bgcolor: 'var(--vm-bg-secondary)', color: 'var(--vm-text-primary)' },
              '& .MuiInputLabel-root': { color: 'var(--vm-text-muted)' },
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' },
            }}
          />
          <Box
            component="button"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              py: 1,
              px: 2,
              borderRadius: 2,
              border: '1px solid var(--vm-border-primary)',
              bgcolor: 'var(--vm-bg-secondary)',
              color: 'var(--vm-text-secondary)',
              fontSize: 13,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <Filter size={16} />
            Filter
          </Box>
        </Box>
      </Box>

      {/* Stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: '24px', mb: '32px' }}>
        {[
          { label: 'Total Investors', value: investors.length },
          { label: 'Connected', value: connectedInvestors.length },
          { label: 'Pending', value: pendingInvestors.length },
          { label: 'High Match Score', value: investors.filter(i => (i.matchScore || 0) > 85).length },
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
            <Typography sx={{ fontSize: { xs: 20, sm: 24 }, fontWeight: 700, color: 'var(--vm-text-primary)' }}>
              {stat.value}
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)' }}>
              {stat.label}
            </Typography>
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
        <Tab label={`Suggested (${suggestedInvestors.length})`} />
        <Tab label={`Connected (${connectedInvestors.length})`} />
        <Tab label={`Pending (${pendingInvestors.length})`} />
      </Tabs>

      {/* Investor Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: '24px' }}>
        {(activeTab === 0 ? suggestedInvestors : activeTab === 1 ? connectedInvestors : pendingInvestors).map((investor) => (
          <Card
            key={investor.id}
            sx={{
              bgcolor: 'var(--vm-bg-secondary)',
              border: '1px solid var(--vm-border-subtle)',
              borderRadius: 3,
              p: { xs: 2, sm: 3 },
              height: '100%',
              width: '100%',
              maxWidth: '100%',
              display: 'flex',
              flexDirection: 'column',
              transition: 'all 0.3s',
              cursor: 'pointer',
              '&:hover': {
                borderColor: 'var(--vm-border-secondary)',
                transform: 'translateY(-2px)',
              },
            }}
            onClick={() => setSelectedInvestor(investor)}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
              <Avatar
                src={investor.logo}
                sx={{
                  width: 56,
                  height: 56,
                  bgcolor: 'var(--vm-bg-tertiary)',
                  fontSize: 20,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {investor.name[0]}
              </Avatar>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                {getStatusIcon(investor.status)}
                {investor.matchScore && (
                  <Chip
                    size="small"
                    label={`${investor.matchScore}% Match`}
                    sx={{
                      bgcolor: investor.matchScore >= 85 ? 'rgba(16, 185, 129, 0.2)' : 'var(--vm-bg-tertiary)',
                      color: investor.matchScore >= 85 ? '#34d399' : 'var(--vm-text-muted)',
                      fontWeight: 600,
                      fontSize: 11,
                    }}
                  />
                )}
              </Box>
            </Box>

            <Typography sx={{ fontSize: 18, fontWeight: 700, color: 'var(--vm-text-primary)', mb: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {investor.name}
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)', mb: 2, textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {investor.type} • {investor.location}
            </Typography>

            <Typography sx={{ fontSize: 13, color: 'var(--vm-text-secondary)', mb: 3, lineHeight: 1.6,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
            }}>
              {investor.thesis.substring(0, 100)}...
            </Typography>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 3, maxWidth: '100%' }}>
              {investor.focusIndustries.slice(0, 3).map((industry) => (
                <Chip
                  key={industry}
                  size="small"
                  label={industry}
                  sx={{
                    bgcolor: 'var(--vm-bg-tertiary)',
                    color: 'var(--vm-text-secondary)',
                    fontSize: 10,
                    maxWidth: '100%',
                    '& .MuiChip-label': { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', py: 0.5 },
                  }}
                />
              ))}
              {investor.focusIndustries.length > 3 && (
                <Chip
                  key={`+${investor.focusIndustries.length - 3}`}
                  size="small"
                  label={`+${investor.focusIndustries.length - 3}`}
                  sx={{
                    bgcolor: 'var(--vm-bg-tertiary)',
                    color: 'var(--vm-text-muted)',
                    fontSize: 10,
                  }}
                />
              )}
            </Box>

            <Box sx={{ mt: 'auto', display: 'flex', gap: 1 }}>
              <Box sx={{ flex: 1, textAlign: 'center', p: 1, bgcolor: 'var(--vm-bg-tertiary)', borderRadius: 1.5 }}>
                <DollarSign size={14} style={{ margin: '0 auto', color: 'var(--vm-text-muted)' }} />
                <Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)', mt: 0.5 }}>
                  ${(investor.checkSize.min / 1000000).toFixed(0)}M-${(investor.checkSize.max / 1000000).toFixed(0)}M
                </Typography>
              </Box>
              <Box sx={{ flex: 1, textAlign: 'center', p: 1, bgcolor: 'var(--vm-bg-tertiary)', borderRadius: 1.5 }}>
                <Briefcase size={14} style={{ margin: '0 auto', color: 'var(--vm-text-muted)' }} />
                <Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)', mt: 0.5 }}>
                  {investor.portfolio.length} Exits
                </Typography>
              </Box>
            </Box>

            {investor.status === 'not-connected' && (
              <Box
                component="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewChange('messages');
                }}
                sx={{
                  mt: 2,
                  width: '100%',
                  py: 1.5,
                  borderRadius: 2,
                  border: 'none',
                  bgcolor: 'var(--vm-primary-600)',
                  color: 'white',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'var(--vm-primary-500)' },
                }}
              >
                Connect
              </Box>
            )}
          </Card>
        ))}
      </Box>
    </Box>
  );
}
