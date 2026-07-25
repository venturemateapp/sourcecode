import { useEffect, useState, useMemo, useCallback } from 'react';
import { Box, Card, Chip, Typography, TextField, MenuItem } from '@mui/material';
import { Brain, Cpu, Zap, Clock, Filter } from 'lucide-react';
import { graphqlRequest } from '../../lib/api';

interface AiUsageRow {
  userId: string;
  email: string;
  userName: string;
  businessId: string;
  businessName: string;
  domain: string;
  source: string;
  callCount: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  durationMs: number;
  firstCall: string | null;
  lastCall: string | null;
  model: string | null;
  provider: string | null;
}

interface AiUsageSummary {
  totalInteractions: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalDurationMs: number;
  totalUsers: number;
  totalBusinesses: number;
}

interface AiUsageResponse {
  rows: AiUsageRow[];
  summary: AiUsageSummary;
}

function StatCard({ icon: Icon, label, value, color, subtitle }: { icon: typeof Brain; label: string; value: string | number; color: string; subtitle?: string }) {
  return (
    <Card sx={{
      p: { xs: 2, sm: 2.5 },
      background: `linear-gradient(135deg, ${color}15 0%, transparent 80%)`,
      border: `1px solid ${color}25`,
      borderRadius: 3,
      position: 'relative',
      overflow: 'hidden',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0, right: 0,
        width: 120, height: 120,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color}10 0%, transparent 70%)`,
        transform: 'translate(30px, -30px)',
      },
    }}>
      <Icon size={20} color={color} />
      <Typography sx={{ fontSize: { xs: 26, sm: 32 }, fontWeight: 900, color: '#fff', mt: 0.5, lineHeight: 1.1 }}>{value}</Typography>
      <Typography sx={{ color: `${color}cc`, fontSize: 12, fontWeight: 600, mt: 0.25 }}>{label}</Typography>
      {subtitle && <Typography sx={{ color: 'rgba(255,255,255,.25)', fontSize: 10, mt: 0.5 }}>{subtitle}</Typography>}
    </Card>
  );
}

export function AdminAiUsage() {
  const [data, setData] = useState<AiUsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [domainFilter, setDomainFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await graphqlRequest<{ adminAiUsage: AiUsageResponse }>(`
        query AdminAiUsage {
          adminAiUsage {
            summary { totalInteractions totalInputTokens totalOutputTokens totalTokens totalDurationMs totalUsers totalBusinesses }
            rows { userId email userName businessId businessName domain source callCount inputTokens outputTokens totalTokens durationMs firstCall lastCall model provider }
          }
        }
      `);
      setData(res.adminAiUsage);
    } catch (err) {
      console.error('Failed to load AI usage:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const domains = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    data.rows.forEach(r => set.add(r.domain));
    return Array.from(set).sort();
  }, [data]);

  const filteredRows = useMemo(() => {
    if (!data) return [];
    return data.rows.filter(r => {
      if (domainFilter && r.domain !== domainFilter) return false;
      if (sourceFilter && r.source !== sourceFilter) return false;
      return true;
    });
  }, [data, domainFilter, sourceFilter]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
        <Typography sx={{ color: 'rgba(255,255,255,.4)', fontSize: 14 }}>Loading AI usage data...</Typography>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
        <Typography sx={{ color: 'rgba(255,255,255,.4)', fontSize: 14 }}>No data available</Typography>
      </Box>
    );
  }

  const s = data.summary;

  return (
    <Box>
      {/* Summary Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
        <StatCard icon={Cpu} label="Total AI Calls" value={s.totalInteractions.toLocaleString()} color="#34d399" subtitle={`${s.totalUsers} users · ${s.totalBusinesses} businesses`} />
        <StatCard icon={Brain} label="Total Tokens" value={s.totalTokens.toLocaleString()} color="#818cf8" subtitle={`${s.totalInputTokens.toLocaleString()} in · ${s.totalOutputTokens.toLocaleString()} out`} />
        <StatCard icon={Zap} label="Avg Tokens/Call" value={s.totalInteractions > 0 ? Math.round(s.totalTokens / s.totalInteractions).toLocaleString() : '0'} color="#f59e0b" />
        <StatCard icon={Clock} label="Total Duration" value={s.totalDurationMs >= 3600000 ? `${(s.totalDurationMs / 3600000).toFixed(1)}h` : s.totalDurationMs >= 60000 ? `${Math.round(s.totalDurationMs / 60000)}m` : `${Math.round(s.totalDurationMs / 1000)}s`} color="#f472b6" subtitle={`${s.totalDurationMs.toLocaleString()}ms`} />
      </Box>

      {/* Filters */}
      <Card sx={{ p: 2, mb: 2.5, borderRadius: 3, border: '1px solid rgba(255,255,255,.04)', bgcolor: 'rgba(255,255,255,.02)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Filter size={14} color="rgba(255,255,255,.3)" />
          <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Filters</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            select size="small" label="Domain" value={domainFilter}
            onChange={e => setDomainFilter(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">All Domains</MenuItem>
            {domains.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
          </TextField>
          <TextField
            select size="small" label="Source" value={sourceFilter}
            onChange={e => setSourceFilter(e.target.value)}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="">All Sources</MenuItem>
            <MenuItem value="chat">AI Chat</MenuItem>
            <MenuItem value="support">Support Bot</MenuItem>
          </TextField>
          <Box sx={{ flex: 1 }} />
          <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,.25)', alignSelf: 'center' }}>
            {filteredRows.length} row{filteredRows.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
      </Card>

      {/* Data Table */}
      <Card sx={{ borderRadius: 3, border: '1px solid rgba(255,255,255,.04)', bgcolor: 'rgba(255,255,255,.02)', overflow: 'hidden' }}>
        <Box sx={{ overflowX: 'auto' }}>
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <Box component="thead">
              <Box component="tr" sx={{ borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                {['User', 'Email', 'Business', 'Domain', 'Source', 'Calls', 'Input Tokens', 'Output Tokens', 'Total', 'Duration', 'Model', 'Last Call'].map(h => (
                  <Box component="th" key={h} sx={{ textAlign: 'left', px: 2.5, py: 1.5, color: 'rgba(255,255,255,.3)', fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{h}</Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {filteredRows.length === 0 ? (
                <Box component="tr">
                  <Box component="td" colSpan={12} sx={{ px: 2.5, py: 4, textAlign: 'center', color: 'rgba(255,255,255,.2)', fontSize: 13 }}>No AI usage data found</Box>
                </Box>
              ) : filteredRows.map((row, i) => (
                <Box component="tr" key={`${row.userId}-${row.domain}-${i}`} sx={{
                  borderBottom: '1px solid rgba(255,255,255,.03)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,.02)' },
                }}>
                  <Box component="td" sx={{ px: 2.5, py: 1.25 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{row.userName}</Typography>
                  </Box>
                  <Box component="td" sx={{ px: 2.5, py: 1.25 }}>
                    <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,.5)' }}>{row.email}</Typography>
                  </Box>
                  <Box component="td" sx={{ px: 2.5, py: 1.25 }}>
                    <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,.7)' }}>{row.businessName}</Typography>
                  </Box>
                  <Box component="td" sx={{ px: 2.5, py: 1.25 }}>
                    <Chip label={row.domain} size="small" sx={{
                      fontSize: 10.5, fontWeight: 600, height: 22,
                      bgcolor: row.domain === 'support' ? 'rgba(245,158,11,.15)' : 'rgba(52,211,153,.15)',
                      color: row.domain === 'support' ? '#f59e0b' : '#34d399',
                    }} />
                  </Box>
                  <Box component="td" sx={{ px: 2.5, py: 1.25 }}>
                    <Typography sx={{ fontSize: 11, color: row.source === 'support' ? '#f59e0b' : '#818cf8', fontWeight: 600 }}>
                      {row.source === 'support' ? 'Support' : 'AI Chat'}
                    </Typography>
                  </Box>
                  <Box component="td" sx={{ px: 2.5, py: 1.25 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{row.callCount}</Typography>
                  </Box>
                  <Box component="td" sx={{ px: 2.5, py: 1.25 }}>
                    <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,.6)' }}>{row.inputTokens.toLocaleString()}</Typography>
                  </Box>
                  <Box component="td" sx={{ px: 2.5, py: 1.25 }}>
                    <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,.6)' }}>{row.outputTokens.toLocaleString()}</Typography>
                  </Box>
                  <Box component="td" sx={{ px: 2.5, py: 1.25 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#34d399' }}>{row.totalTokens.toLocaleString()}</Typography>
                  </Box>
                  <Box component="td" sx={{ px: 2.5, py: 1.25 }}>
                    <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,.5)' }}>
                      {row.durationMs >= 60000 ? `${(row.durationMs / 60000).toFixed(1)}m` : `${Math.round(row.durationMs / 1000)}s`}
                    </Typography>
                  </Box>
                  <Box component="td" sx={{ px: 2.5, py: 1.25 }}>
                    <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>{row.model || '-'}</Typography>
                  </Box>
                  <Box component="td" sx={{ px: 2.5, py: 1.25 }}>
                    <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,.3)' }}>
                      {row.lastCall ? new Date(row.lastCall).toLocaleDateString() : '-'}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Card>
    </Box>
  );
}
