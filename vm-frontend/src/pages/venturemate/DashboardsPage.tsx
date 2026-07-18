import { CardSkeleton } from '../../components/shared/Skeleton';
import { useCallback, useEffect, useState } from 'react';
import { Box, Typography, Card } from '@mui/material';
import { graphqlRequest } from '../../lib/api';
import { useBusiness } from '../../contexts/BusinessContext';
import { BarChart3, TrendingUp, Users, DollarSign, Activity, Building2, Calendar, CheckCircle, FileText } from 'lucide-react';
import type { Invoice, Expenditure, CrmDeal, CrmContact } from '../../types/venturemate';

export function DashboardsPage() {
  const { selectedBusiness } = useBusiness();
  const bizId = selectedBusiness?.id;
  const [data, setData] = useState<{ contacts: number; deals: number; pipelineValue: number; invoices: number; paidInvoices: number; totalExpenses: number; dealsByStage: Record<string, number>; } | null>(null);
  const [loading, setLoading] = useState(true);

  const q = useCallback(async <T,>(query: string, vars?: Record<string, unknown>) => graphqlRequest<T>(query, vars), []);

  useEffect(() => {
    if (!bizId) return;
    const load = async () => {
      setLoading(true);
      try {
        const [contacts, deals, invoices, expenses] = await Promise.all([
          q<{ crmContacts: CrmContact[] }>('query Q($b:ID!){crmContacts(businessId:$b){id}}', { b: bizId }),
          q<{ crmDeals: CrmDeal[] }>('query Q($b:ID!){crmDeals(businessId:$b){id value stage}}', { b: bizId }),
          q<{ invoices: Invoice[] }>('query Q($b:ID!){invoices(businessId:$b){id amount status}}', { b: bizId }),
          q<{ expenditures: Expenditure[] }>('query Q($b:ID!){expenditures(businessId:$b){id amount}}', { b: bizId }),
        ]);
        const dealsByStage: Record<string, number> = {};
        deals.crmDeals.forEach(d => { dealsByStage[d.stage] = (dealsByStage[d.stage] || 0) + 1; });
        setData({
          contacts: contacts.crmContacts.length,
          deals: deals.crmDeals.length,
          pipelineValue: deals.crmDeals.reduce((s, d) => s + (d.stage !== 'closed_lost' ? d.value : 0), 0),
          invoices: invoices.invoices.length,
          paidInvoices: invoices.invoices.filter(i => i.status === 'paid').length,
          totalExpenses: expenses.expenditures.reduce((s, e) => s + e.amount, 0),
          dealsByStage,
        });
      } catch { /* ignore */ }
      setLoading(false);
    };
    load();
  }, [bizId, q]);

  if (!bizId) return <Box sx={{ p: 4, textAlign: 'center', color: 'var(--vm-text-muted)' }}><Building2 size={40} /><Typography sx={{ mt: 1 }}>Select a business</Typography></Box>;

  const stageColors: Record<string, string> = { prospecting: '#6b7280', qualification: '#3b82f6', proposal: '#f59e0b', negotiation: '#8b5cf6', closed_won: '#22c55e', closed_lost: '#ef4444' };

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontSize: { xs: 20, sm: 24, md: 28 }, fontWeight: 800, color: 'var(--vm-text-primary)' }}>Dashboard</Typography>
        <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)' }}>Real-time insights from your CRM data</Typography>
      </Box>

      {loading ? <CardSkeleton count={4} type='card' /> : data ? (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', md: 'repeat(4,1fr)' }, gap: { xs: 1.5, sm: 2 }, mb: 3 }}>
            {[
              { icon: Users, label: 'Contacts', value: data.contacts, color: '#3b82f6', desc: 'Total contacts in CRM' },
              { icon: TrendingUp, label: 'Active Deals', value: data.deals, color: '#22c55e', desc: 'Open opportunities' },
              { icon: DollarSign, label: 'Pipeline Value', value: formatCurrency(data.pipelineValue), color: '#f59e0b', desc: 'Total deal value' },
              { icon: Activity, label: 'Expenses', value: formatCurrency(data.totalExpenses), color: '#ef4444', desc: 'Total recorded' },
            ].map(s => (
              <Card key={s.label} sx={{ p: { xs: 1.5, sm: 2.5 }, bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, background: `linear-gradient(135deg, ${s.color}08, transparent 80%)` }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <s.icon size={18} color={s.color} />
                  </Box>
                </Box>
                <Typography sx={{ fontSize: { xs: 22, sm: 28 }, fontWeight: 900, color: 'var(--vm-text-primary)', lineHeight: 1.1, overflowWrap: 'anywhere' }}>{s.value}</Typography>
                <Typography sx={{ fontSize: 12, color: `${s.color}cc`, fontWeight: 600, mt: 0.25, overflowWrap: 'anywhere' }}>{s.label}</Typography>
                <Typography sx={{ fontSize: 10, color: 'var(--vm-text-muted)', mt: 0.25, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{s.desc}</Typography>
              </Card>
            ))}
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2 }}>
            {/* Deals Pipeline Chart */}
            <Card sx={{ p: { xs: 2, sm: 2.5 }, bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'var(--vm-text-primary)', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <BarChart3 size={16} color="#8b5cf6" /> Deals by Stage
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {Object.entries(data.dealsByStage).map(([stage, count]) => {
                  const total = Object.values(data.dealsByStage).reduce((a, b) => a + b, 0);
                  const pct = total ? Math.round((count / total) * 100) : 0;
                  return (
                    <Box key={stage}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: stageColors[stage] || '#94a3b8' }} />
                          <Typography sx={{ fontSize: 12, color: 'var(--vm-text-secondary)', textTransform: 'capitalize', overflowWrap: 'anywhere' }}>{stage.replace('_', ' ')}</Typography>
                        </Box>
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'var(--vm-text-primary)' }}>{count}</Typography>
                      </Box>
                      <Box sx={{ height: 6, borderRadius: 3, bgcolor: 'rgba(255,255,255,.05)', overflow: 'hidden' }}>
                        <Box sx={{ height: '100%', borderRadius: 3, width: `${pct}%`, bgcolor: stageColors[stage] || '#94a3b8', transition: 'width .6s ease' }} />
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Card>

            {/* Invoices & Revenue */}
            <Card sx={{ p: { xs: 2, sm: 2.5 }, bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'var(--vm-text-primary)', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircle size={16} color="#22c55e" /> Invoices Overview
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                {[
                  { label: 'Total Invoices', value: data.invoices, color: '#3b82f6', icon: FileText },
                  { label: 'Paid', value: data.paidInvoices, color: '#22c55e', icon: CheckCircle },
                  { label: 'Unpaid', value: data.invoices - data.paidInvoices, color: '#f59e0b', icon: Calendar },
                  { label: 'Expenses', value: formatCurrency(data.totalExpenses), color: '#ef4444', icon: DollarSign },
                ].map(s => {
                  const Icon = s.icon;
                  return (
                    <Box key={s.label} sx={{ p: 1.5, borderRadius: 2, bgcolor: `${s.color}08`, border: `1px solid ${s.color}15` }}>
                      <Icon size={14} color={s.color} />
                      <Typography sx={{ fontSize: 18, fontWeight: 800, color: 'var(--vm-text-primary)', mt: 0.5, overflowWrap: 'anywhere' }}>{s.value}</Typography>
                      <Typography sx={{ fontSize: 10, color: `${s.color}bb`, overflowWrap: 'anywhere' }}>{s.label}</Typography>
                    </Box>
                  );
                })}
              </Box>
              {/* Simple bar chart for invoice status */}
              <Box sx={{ mt: 1 }}>
                <Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)', mb: 0.75 }}>Payment Rate</Typography>
                <Box sx={{ height: 8, borderRadius: 4, bgcolor: 'rgba(255,255,255,.05)', overflow: 'hidden', display: 'flex' }}>
                  {data.invoices > 0 && (
                    <>
                      <Box sx={{ height: '100%', bgcolor: '#22c55e', width: `${(data.paidInvoices / data.invoices) * 100}%`, transition: 'width .6s ease' }} />
                      <Box sx={{ height: '100%', bgcolor: '#f59e0b', width: `${((data.invoices - data.paidInvoices) / data.invoices) * 100}%`, transition: 'width .6s ease' }} />
                    </>
                  )}
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                  <Typography sx={{ fontSize: 9, color: '#22c55e' }}>Paid {data.invoices > 0 ? Math.round((data.paidInvoices / data.invoices) * 100) : 0}%</Typography>
                  <Typography sx={{ fontSize: 9, color: '#f59e0b' }}>Outstanding {data.invoices > 0 ? Math.round(((data.invoices - data.paidInvoices) / data.invoices) * 100) : 0}%</Typography>
                </Box>
              </Box>
            </Card>
          </Box>
        </>
      ) : <Typography sx={{ textAlign: 'center', py: 4, color: 'var(--vm-text-muted)' }}>No data available</Typography>}
    </Box>
  );
}

function formatCurrency(v: number, currency = 'USD') { try { return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(v); } catch { return `${currency} ${v.toLocaleString()}`; } }
