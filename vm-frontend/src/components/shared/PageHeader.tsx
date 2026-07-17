import type { ReactNode } from 'react';
import { Box, Chip, Typography } from '@mui/material';
import { Building2 } from 'lucide-react';

interface PageHeaderProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  businessName?: string;
  chips?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ icon, title, subtitle, businessName, chips, actions }: PageHeaderProps) {
  return (
    <Box sx={{
      mb: 2.5, p: { xs: 1.5, sm: 2 }, borderRadius: 3,
      bgcolor: 'rgba(255,255,255,.02)',
      border: '1px solid rgba(255,255,255,.06)',
      backdropFilter: 'blur(12px)',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
          <Box sx={{ width: 36, height: 36, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'var(--vm-primary-700)', flexShrink: 0 }}>
            {icon}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ color: 'var(--vm-text-primary)', fontSize: { xs: 16, sm: 20 }, fontWeight: 900, lineHeight: 1.2 }}>{title}</Typography>
            {subtitle && <Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 12, mt: 0.15 }}>{subtitle}</Typography>}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
          {businessName && <Chip icon={<Building2 size={13} />} label={businessName} size="small" />}
          {chips}
          {actions}
        </Box>
      </Box>
    </Box>
  );
}
