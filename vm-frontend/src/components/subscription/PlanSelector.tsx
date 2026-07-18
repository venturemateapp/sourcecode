import { useState } from 'react'
import {
  Box, Typography, Card, CardContent, Button, Chip, Dialog,
  DialogTitle, DialogContent, DialogActions, IconButton,
} from '@mui/material'
import { Close, Check, Star, WorkspacePremium } from '@mui/icons-material'
import { useSubscription } from '../../contexts/SubscriptionContext'

interface PlanSelectorProps {
  open: boolean
  onClose: () => void
  userId: string
  currentPlanName?: string
}

const planIcons: Record<string, React.ReactNode> = {
  free: <Star sx={{ fontSize: { xs: 24, md: 32 } }} />,
  starter: <Star sx={{ fontSize: { xs: 24, md: 32 } }} />,
  growth: <WorkspacePremium sx={{ fontSize: { xs: 24, md: 32 } }} />,
  scale: <WorkspacePremium sx={{ fontSize: { xs: 24, md: 32 } }} />,
}

const planColors: Record<string, string> = {
  free: 'rgba(255,255,255,0.08)',
  starter: 'linear-gradient(135deg, #059669, #34d399)',
  growth: 'linear-gradient(135deg, #2563eb, #60a5fa)',
  scale: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
}

export function PlanSelector({ open, onClose, userId, currentPlanName }: PlanSelectorProps) {
  const { plans, changePlan, loading } = useSubscription()
  const [selected, setSelected] = useState<string | null>(null)
  const [changing, setChanging] = useState(false)

  const handleSelect = async (planName: string) => {
    if (planName === currentPlanName) return
    setSelected(planName)
    setChanging(true)
    const ok = await changePlan(userId, planName)
    setChanging(false)
    if (ok) onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { bgcolor: '#1a1a23', borderRadius: 4, border: '1px solid rgba(255,255,255,0.08)' } }}
    >
      <DialogTitle sx={{ textAlign: 'center', pt: { xs: 2, md: 4 }, pb: { xs: 1, md: 2 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography fontWeight={800} sx={{ color: '#fff', flex: 1, fontSize: { xs: 20, md: 28 } }}>
            Choose Your Plan
          </Typography>
          <IconButton onClick={onClose} sx={{ color: 'rgba(255,255,255,0.5)' }}>
            <Close />
          </IconButton>
        </Box>
        <Typography sx={{ color: 'rgba(255,255,255,0.6)', mt: 1, fontSize: { xs: 13, md: 15 } }}>
          Upgrade to unlock more features for your startup journey
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' }, mt: 2 }}>
          {plans.map((plan) => {
            const isCurrent = plan.name === currentPlanName
            const isSelected = plan.name === selected
            return (
              <Card key={plan.id} sx={{
                flex: 1,
                bgcolor: 'rgba(255,255,255,0.03)',
                border: '1px solid',
                borderColor: isCurrent ? 'rgba(52, 211, 153, 0.5)' : isSelected ? 'rgba(52, 211, 153, 0.3)' : 'rgba(255,255,255,0.08)',
                borderRadius: 3,
                position: 'relative',
                overflow: 'visible',
                transition: 'all 0.2s',
                '&:hover': { borderColor: 'rgba(52, 211, 153, 0.4)' },
              }}>
                {plan.name === 'pro' && (
                  <Chip label="POPULAR" size="small" sx={{
                    position: 'absolute', top: isCurrent ? -24 : -12, left: '50%', transform: 'translateX(-50%)',
                    bgcolor: '#34d399', color: '#000', fontWeight: 700, fontSize: 11, zIndex: 1,
                  }} />
                )}
                {isCurrent && (
                  <Chip label="CURRENT" size="small" sx={{
                    position: 'absolute', top: plan.name === 'pro' ? -12 : -12, left: '50%', transform: 'translateX(-50%)',
                    bgcolor: 'rgba(52, 211, 153, 0.15)', color: '#34d399', fontWeight: 700, fontSize: 11, zIndex: 1,
                  }} />
                )}
                <CardContent sx={{ p: { xs: 2, md: 3 }, textAlign: 'center' }}>
                  <Box sx={{
                    width: { xs: 48, md: 64 }, height: { xs: 48, md: 64 }, borderRadius: 3, mx: 'auto', mb: 2,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: planColors[plan.name] || planColors.free,
                  }}>
                    {planIcons[plan.name] || planIcons.free}
                  </Box>

                  <Typography fontWeight={700} sx={{ color: '#fff', mb: 0.5, fontSize: { xs: 16, md: 20 } }}>
                    {plan.displayName}
                  </Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: { xs: 12, md: 14 }, mb: 2, minHeight: { xs: 0, md: 40 } }}>
                    {plan.description}
                  </Typography>

                  <Box sx={{ mb: 2 }}>
                    <Typography component="span" fontWeight={800} sx={{ color: '#fff', fontSize: { xs: 28, md: 40 } }}>
                      ${plan.priceMonthly}
                    </Typography>
                    <Typography component="span" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: { xs: 12, md: 14 } }}>
                      /mo
                    </Typography>
                  </Box>

                  <Box sx={{ textAlign: 'left', mb: { xs: 2, md: 3 } }}>
                    {plan.features.map((f, i) => (
                      <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, opacity: f.included ? 1 : 0.4 }}>
                        <Check sx={{ fontSize: { xs: 14, md: 16 }, color: f.included ? '#34d399' : 'rgba(255,255,255,0.3)' }} />
                        <Typography sx={{ color: '#fff', fontSize: { xs: 12, md: 13 } }}>{f.text}</Typography>
                      </Box>
                    ))}
                  </Box>

                  <Button
                    fullWidth
                    variant="contained"
                    disabled={isCurrent || loading}
                    onClick={() => handleSelect(plan.name)}
                    sx={{
                      py: { xs: 1, md: 1.5 }, borderRadius: 2, fontWeight: 700, fontSize: { xs: 13, md: 15 },
                      background: isCurrent ? 'rgba(255,255,255,0.08)' : (planColors[plan.name] || 'linear-gradient(135deg, #059669, #34d399)'),
                      '&:hover': { opacity: 0.9 },
                    }}
                  >
                    {isCurrent ? 'Current Plan' : changing && selected === plan.name ? 'Upgrading...' : 'Select'}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </Box>
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
        <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: { xs: 11, md: 13 } }}>
          Switch anytime. No questions asked.
        </Typography>
      </DialogActions>
    </Dialog>
  )
}
