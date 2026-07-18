import { useState } from 'react';
import { Box, Typography, Card, Chip, Stack, Grid } from '@mui/material';
import { Sparkles, TrendingUp, DollarSign, Users, Calendar, Download } from 'lucide-react';
import { useBusiness } from '../../contexts/BusinessContext';
import { NoBusinessSelected } from '../../components/venturemate/NoBusinessSelected';


export function FinancialForecast() {
  const { selectedBusiness: business } = useBusiness();
  const [timeRange, setTimeRange] = useState<'1year' | '3year' | '5year'>('3year');

  if (!business) {
    return <NoBusinessSelected message="Select a business to view financial forecast" />;
  }

  const financials = business.financials || { fundingRaised: 0, fundingRounds: [], revenue: { currentMRR: 0, currentARR: 0, growthRate: 0, history: [] }, expenses: { monthlyBurn: 0, breakdown: [] }, runway: 0, burnRate: 0, projections: [] };
  const metrics = business.metrics || { totalUsers: 0, activeUsers: 0, retentionRate: 0, churnRate: 0, nps: 0, cac: 0, ltv: 0, customMetrics: [] };

  const generateForecast = () => {
    const years = timeRange === '1year' ? 1 : timeRange === '3year' ? 3 : 5;
    const data = [];
    
    const currentMRR = financials.revenue?.currentMRR ?? 0;
    const currentBurn = financials.expenses?.monthlyBurn ?? 0;
    
    for (let year = 1; year <= years; year++) {
      const growthRate = business.stage === 'idea' ? 0 : 
                        business.stage === 'mvp' ? 0.15 : 
                        business.stage === 'beta' ? 0.25 : 
                        business.stage === 'launched' ? 0.35 : 0.45;
      
      const mrr = currentMRR * Math.pow(1 + growthRate, year);
      const arr = mrr * 12;
      const expenses = currentBurn * 12 * Math.pow(1.1, year - 1);
      const profit = arr - expenses;
      
      data.push({
        year: new Date().getFullYear() + year,
        mrr: Math.round(mrr),
        arr: Math.round(arr),
        expenses: Math.round(expenses),
        profit: Math.round(profit),
        customers: Math.round((metrics.totalUsers || 100) * Math.pow(1 + growthRate, year)),
      });
    }
    
    return data;
  };

  const forecastData = generateForecast();
  const totalProjectedRevenue = forecastData.reduce((acc, d) => acc + d.arr, 0);
  const finalYearProfit = forecastData[forecastData.length - 1]?.profit || 0;

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', mb: { xs: 3, md: 4 }, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 2, sm: 0 } }}>
        <Box>
          <Typography sx={{ fontSize: { xs: 18, sm: 20, md: 24 }, fontWeight: 700, color: 'var(--vm-text-primary)', mb: 1 }}>
            Financial Forecast
          </Typography>
          <Typography sx={{ fontSize: { xs: 12, sm: 13, md: 15 }, color: 'var(--vm-text-muted)' }}>
            {business.name} • AI-powered projections
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: { xs: 1, sm: 2 }, width: { xs: '100%', sm: 'auto' }, flexWrap: 'wrap', '& > *': { flex: { xs: 1, sm: 'none' } } }}>
          {/* Time Range Selector */}
          <Box sx={{ display: 'flex', bgcolor: 'var(--vm-bg-secondary)', borderRadius: 2, p: 0.5 }}>
            {(['1year', '3year', '5year'] as const).map((range) => (
              <Box
                key={range}
                onClick={() => setTimeRange(range)}
                sx={{
                  py: 1,
                  px: 2,
                  borderRadius: 1.5,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  bgcolor: timeRange === range ? 'var(--vm-primary-600)' : 'transparent',
                  color: timeRange === range ? 'white' : 'var(--vm-text-secondary)',
                }}
              >
                {range === '1year' ? '1 Year' : range === '3year' ? '3 Years' : '5 Years'}
              </Box>
            ))}
          </Box>
          <Box
            component="button"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              py: 1.5,
              px: 3,
              borderRadius: 2,
              border: '1px solid var(--vm-border-primary)',
              bgcolor: 'transparent',
              color: 'var(--vm-text-secondary)',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              '&:hover': { bgcolor: 'var(--vm-bg-hover)' },
            }}
          >
            <Download size={18} />
            Export
          </Box>
        </Box>
      </Box>

      {/* Key Metrics */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: { xs: 2, md: 3 }, mb: { xs: 3, md: 4 } }}>
        {[
          { 
            label: 'Current MRR', 
            value: `$${(financials.revenue?.currentMRR ?? 0).toLocaleString()}`,
            change: '+12%',
            icon: DollarSign
          },
          { 
            label: 'Projected Revenue', 
            value: `$${(totalProjectedRevenue / 1000000).toFixed(1)}M`,
            change: `${timeRange} total`,
            icon: TrendingUp
          },
          { 
            label: `Projected ${forecastData.length}Y Profit`, 
            value: `$${(finalYearProfit / 1000000).toFixed(1)}M`,
            change: finalYearProfit > 0 ? 'Profitable' : 'Pre-profit',
            icon: Calendar
          },
          { 
            label: 'Projected Customers', 
            value: forecastData[forecastData.length - 1]?.customers.toLocaleString() || '0',
            change: 'by year end',
            icon: Users
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              sx={{
                bgcolor: 'var(--vm-bg-secondary)',
                border: '1px solid var(--vm-border-subtle)',
                borderRadius: 3,
                p: 3,
              }}
            >
<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                 <Icon size={18} color="#10b981" />
                 <Typography sx={{ fontSize: { xs: 11, sm: 12, md: 13 }, fontWeight: 600, color: 'var(--vm-text-muted)', overflowWrap: 'anywhere' }}>
                   {stat.label}
                 </Typography>
               </Box>
               <Typography sx={{ fontSize: { xs: 14, sm: 16 }, fontWeight: 700, color: 'var(--vm-text-primary)', overflowWrap: 'anywhere' }}>
                 {stat.value}
               </Typography>
               <Typography sx={{ fontSize: { xs: 11, sm: 12 }, color: 'var(--vm-primary-400)' }}>
                 {stat.change}
               </Typography>
            </Card>
          );
        })}
      </Box>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Forecast Table */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card
            sx={{
              bgcolor: 'var(--vm-bg-secondary)',
              border: '1px solid var(--vm-border-subtle)',
              borderRadius: 3,
              p: 3,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Typography sx={{ fontSize: 18, fontWeight: 600, color: 'var(--vm-text-primary)' }}>
                Revenue Forecast
              </Typography>
              <Chip
                icon={<Sparkles size={14} />}
                label="AI Generated"
                size="small"
                sx={{
                  bgcolor: 'var(--vm-primary-900)',
                  color: 'var(--vm-primary-400)',
                  '& .MuiChip-label': { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', py: 0.5 },
                }}
              />
            </Box>
            
            <Box sx={{ overflowX: 'auto' }}>
            <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: { xs: 500, sm: '100%' } }}>
              <Box component="thead">
                <Box component="tr" sx={{ borderBottom: '1px solid var(--vm-border-subtle)' }}>
                  {['Year', 'MRR', 'ARR', 'Expenses', 'Profit/Loss'].map((header) => (
                    <Box
                      component="th"
                      key={header}
                      sx={{
                        py: 2,
                        px: 2,
                        textAlign: 'left',
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--vm-text-muted)',
                      }}
                    >
                      {header}
                    </Box>
                  ))}
                </Box>
              </Box>
              <Box component="tbody">
                {forecastData.map((row, index) => (
                  <Box
                    component="tr"
                    key={row.year}
                    sx={{
                      borderBottom: index < forecastData.length - 1 ? '1px solid var(--vm-border-subtle)' : 'none',
                    }}
                  >
                    <Box component="td" sx={{ py: 2, px: 2, color: 'var(--vm-text-primary)', fontWeight: 600 }}>
                      {row.year}
                    </Box>
                    <Box component="td" sx={{ py: 2, px: 2, color: 'var(--vm-text-secondary)' }}>
                      ${row.mrr.toLocaleString()}
                    </Box>
                    <Box component="td" sx={{ py: 2, px: 2, color: 'var(--vm-text-secondary)' }}>
                      ${row.arr.toLocaleString()}
                    </Box>
                    <Box component="td" sx={{ py: 2, px: 2, color: 'var(--vm-text-secondary)' }}>
                      ${row.expenses.toLocaleString()}
                    </Box>
                    <Box component="td" sx={{ py: 2, px: 2 }}>
                      <Typography
                        sx={{
                          color: row.profit >= 0 ? '#4ade80' : '#ef4444',
                          fontWeight: 600,
                        }}
                      >
                        {row.profit >= 0 ? '+' : ''}${row.profit.toLocaleString()}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
            </Box>
          </Card>
        </Grid>

        {/* Sidebar */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={3}>
            {/* Assumptions */}
            <Card
              sx={{
                bgcolor: 'var(--vm-bg-secondary)',
                border: '1px solid var(--vm-border-subtle)',
                borderRadius: 3,
                p: 3,
              }}
            >
              <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 2 }}>
                Forecast Assumptions
              </Typography>
              <Stack spacing={2}>
                {[
                  { label: 'Growth Rate', value: business.stage === 'idea' ? 'N/A' : '15-45%' },
                  { label: 'Expense Growth', value: '10% YoY' },
                  { label: 'Churn Rate', value: '5% monthly' },
                  { label: 'Customer LTV', value: `$${metrics.ltv || 500}` },
                  { label: 'CAC', value: `$${metrics.cac || 100}` },
                ].map((item) => (
                  <Box key={item.label} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)', overflowWrap: 'anywhere' }}>
                      {item.label}
                    </Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'var(--vm-text-primary)', overflowWrap: 'anywhere' }}>
                      {item.value}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Card>

            {/* Runway */}
            <Card
              sx={{
                bgcolor: 'var(--vm-bg-secondary)',
                border: '1px solid var(--vm-border-subtle)',
                borderRadius: 3,
                p: 3,
              }}
            >
              <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 2 }}>
                Runway Analysis
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography sx={{ fontSize: 32, fontWeight: 700, color: 'var(--vm-text-primary)', overflowWrap: 'anywhere' }}>
                  {financials.runway ?? 0} months
                </Typography>
                <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)' }}>
                  Current cash runway
                </Typography>
              </Box>
              <Box
                sx={{
                  width: '100%',
                  height: 8,
                  borderRadius: 4,
                  bgcolor: 'var(--vm-bg-tertiary)',
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    width: `${Math.min(((financials.runway ?? 0) / 24) * 100, 100)}%`,
                    height: '100%',
                    bgcolor: (financials.runway ?? 0) > 12 ? '#10b981' : (financials.runway ?? 0) > 6 ? '#f59e0b' : '#ef4444',
                    borderRadius: 4,
                  }}
                />
              </Box>
              <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)', mt: 1 }}>
                {(financials.runway ?? 0) > 12 ? 'Healthy runway' : (financials.runway ?? 0) > 6 ? 'Consider fundraising' : 'Urgent: Fundraising needed'}
              </Typography>
            </Card>

            {/* AI Actions */}
            <Card
              sx={{
                bgcolor: 'var(--vm-bg-secondary)',
                border: '1px solid var(--vm-border-subtle)',
                borderRadius: 3,
                p: 3,
              }}
            >
              <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 2 }}>
                AI Actions
              </Typography>
              <Stack spacing={1.5}>
                {[
                  'Optimize pricing strategy',
                  'Reduce burn rate',
                  'Find new revenue streams',
                  'Scenario planning',
                ].map((action) => (
                  <Box
                    key={action}
                    component="button"
                    sx={{
                      width: '100%',
                      py: 1.5,
                      px: 2,
                      borderRadius: 1.5,
                      border: '1px solid var(--vm-border-primary)',
                      bgcolor: 'transparent',
                      color: 'var(--vm-text-secondary)',
                      fontSize: 13,
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      '&:hover': {
                        borderColor: 'var(--vm-primary-600)',
                        color: 'var(--vm-primary-400)',
                      },
                    }}
                  >
                    <Sparkles size={16} />
                    {action}
                  </Box>
                ))}
              </Stack>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
