import { useState, useEffect } from 'react';
import { Box, Typography, Card, Avatar, Chip, TextField, InputAdornment, Tabs, Tab, CircularProgress } from '@mui/material';
import {
  Search,
  Filter,
} from 'lucide-react';
import type { Investor } from '../../types/venturemate';
import { graphqlRequest } from '../../lib/api';
import { useBusiness } from '../../contexts/BusinessContext';
import { useToast } from '../../components/shared/toast';

const INVESTORS_QUERY = `
  query Investors {
    investors {
      id, name, type, logo, location,
      focusIndustries, stages,
      portfolio, team, thesis, criteria,
      matchScore
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
  portfolio: string;
  team: string;
  thesis: string;
  criteria: string;
  matchScore: number | null;
}

type ConnectionStatus = 'pending' | 'approved' | 'connected' | 'declined';
interface InvestorConnectionStatus {
  investorId: string;
  status: ConnectionStatus;
  updatedAt: string;
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
    portfolio: JSON.parse(api.portfolio || '[]'),
    team: JSON.parse(api.team || '[]'),
    thesis: api.thesis,
    criteria: JSON.parse(api.criteria || '[]'),
    matchScore: api.matchScore ?? undefined,
  };
}

export function InvestorsPage() {
  const { selectedBusiness } = useBusiness();
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [, setSelectedInvestor] = useState<Investor | null>(null);
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [connectionStatuses, setConnectionStatuses] = useState<Record<string, ConnectionStatus>>({});
  const [connectingInvestorId, setConnectingInvestorId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    graphqlRequest<{ investors: ApiInvestor[] }>(INVESTORS_QUERY).then(data => {
      if (!cancelled) setInvestors((data.investors || []).map(mapApiToInvestor));
    }).catch(() => {
      if (!cancelled) setInvestors([]);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setConnectionStatuses({});
    if (!selectedBusiness?.id) return () => { cancelled = true; };
    const businessId = selectedBusiness.id;
    const refresh = async () => {
      try {
        const data = await graphqlRequest<{ myInvestorConnections: InvestorConnectionStatus[] }>(
          'query MyInvestorConnections($businessId:ID!){myInvestorConnections(businessId:$businessId){investorId status updatedAt}}',
          { businessId },
        );
        if (!cancelled) setConnectionStatuses(Object.fromEntries((data.myInvestorConnections || []).map(request => [request.investorId, request.status])));
      } catch { /* keep the last known status visible while retrying */ }
    };
    refresh();
    const interval = window.setInterval(refresh, 20000);
    window.addEventListener('focus', refresh);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
    };
  }, [selectedBusiness?.id]);

  const requestConnection = async (investor: Investor) => {
    if (!selectedBusiness?.id || connectingInvestorId) return;
    setConnectingInvestorId(investor.id);
    try {
      const data = await graphqlRequest<{ requestInvestorConnection: InvestorConnectionStatus }>(
        'mutation RequestInvestorConnection($investorId:ID!,$businessId:ID!){requestInvestorConnection(investorId:$investorId,businessId:$businessId){investorId status updatedAt}}',
        { investorId: investor.id, businessId: selectedBusiness.id },
      );
      const status = data.requestInvestorConnection.status;
      setConnectionStatuses(current => ({ ...current, [investor.id]: status }));
      setActiveTab(status === 'pending' ? 1 : status === 'approved' ? 2 : status === 'connected' ? 3 : 0);
      toast.success('Connection request sent', { description: `Your request to connect ${selectedBusiness.name} with ${investor.name} is pending review.` });
    } catch (error) {
      toast.error('Could not request connection', { description: error instanceof Error ? error.message : 'Please try again.' });
    } finally {
      setConnectingInvestorId(null);
    }
  };

  const filteredInvestors = investors.filter(inv => 
    inv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.focusIndustries.some(i => i.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const connectedInvestors = filteredInvestors.filter(i => connectionStatuses[i.id] === 'connected');
  const approvedInvestors = filteredInvestors.filter(i => connectionStatuses[i.id] === 'approved');
  const pendingInvestors = filteredInvestors.filter(i => connectionStatuses[i.id] === 'pending');
  const suggestedInvestors = filteredInvestors.filter(i => !connectionStatuses[i.id] || connectionStatuses[i.id] === 'declined');
  const visibleInvestors = [suggestedInvestors, pendingInvestors, approvedInvestors, connectedInvestors][activeTab] || suggestedInvestors;

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
        <Tab label={`Pending (${pendingInvestors.length})`} />
        <Tab label={`Approved (${approvedInvestors.length})`} />
        <Tab label={`Connected (${connectedInvestors.length})`} />
      </Tabs>

      {/* Investor Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: '24px' }}>
        {visibleInvestors.map((investor) => (
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
                {connectionStatuses[investor.id] && (
                  <Chip
                    size="small"
                    label={connectionStatuses[investor.id]}
                    sx={{ textTransform: 'capitalize', fontSize: 10, fontWeight: 700,
                      color: connectionStatuses[investor.id] === 'connected' ? '#34d399' : connectionStatuses[investor.id] === 'declined' ? '#f87171' : '#fbbf24',
                      bgcolor: connectionStatuses[investor.id] === 'connected' ? 'rgba(52,211,153,.12)' : connectionStatuses[investor.id] === 'declined' ? 'rgba(248,113,113,.12)' : 'rgba(251,191,36,.12)' }}
                  />
                )}
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

            {(!connectionStatuses[investor.id] || connectionStatuses[investor.id] === 'declined') && (
              <Box
                component="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void requestConnection(investor);
                }}
                disabled={!selectedBusiness?.id || connectingInvestorId !== null}
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
                  opacity: !selectedBusiness?.id || connectingInvestorId !== null ? 0.65 : 1,
                  '&:hover': { bgcolor: 'var(--vm-primary-500)' },
                }}
              >
                {connectingInvestorId === investor.id ? <CircularProgress size={15} sx={{ color: '#fff' }} /> : !selectedBusiness?.id ? 'Select a business first' : connectionStatuses[investor.id] === 'declined' ? 'Request again' : 'Connect'}
              </Box>
            )}
          </Card>
        ))}
      </Box>
    </Box>
  );
}
