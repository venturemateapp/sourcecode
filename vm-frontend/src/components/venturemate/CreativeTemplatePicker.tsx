import { Box, Typography } from '@mui/material';
import { Check, Palette } from 'lucide-react';

export interface CreativeTemplateOption {
  id: string;
  label: string;
  accent: string;
  accent2: string;
  description?: string;
}

const TEMPLATE_DESCRIPTIONS: Record<string, string> = {
  velocity: 'Bold startup energy',
  ignite: 'Confident and vibrant',
  summit: 'Clean growth story',
  nova: 'Creative technology',
  catalyst: 'Crisp and innovative',
  apex: 'Executive minimalism',
  onyx: 'Luxury monochrome',
  cobalt: 'Enterprise precision',
  solstice: 'Warm editorial',
  bloom: 'Soft consumer style',
  slate: 'Technical clarity',
  prism: 'Design-forward impact',
};

export function CreativeTemplatePicker({ templates, value, onChange }: {
  templates: CreativeTemplateOption[];
  value: string;
  onChange: (templateId: string) => void;
}) {
  return (
    <Box sx={{ minWidth: 0, flex: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
        <Palette size={14} color="var(--vm-text-muted)" />
        <Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 10, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase' }}>
          Design theme
        </Typography>
      </Box>
      <Box sx={{
        display: 'flex', gap: 0.75, overflowX: 'auto', pb: 0.5, scrollbarWidth: 'thin',
        '&::-webkit-scrollbar': { height: 4 },
        '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,.14)', borderRadius: 99 },
      }}>
        {templates.map((template) => {
          const selected = value === template.id;
          return (
            <Box component="button" type="button" key={template.id} aria-pressed={selected}
              aria-label={`Use ${template.label} design theme`} onClick={() => onChange(template.id)}
              sx={{
                position: 'relative', flex: '0 0 auto', width: 112, p: 0, overflow: 'hidden',
                textAlign: 'left', color: 'inherit', borderRadius: 2,
                border: selected ? `1px solid ${template.accent}90` : '1px solid rgba(255,255,255,.08)',
                bgcolor: selected ? `${template.accent}12` : 'rgba(255,255,255,.025)',
                boxShadow: selected ? `0 0 0 2px ${template.accent}18, 0 10px 28px rgba(0,0,0,.18)` : 'none',
                cursor: 'pointer', transition: 'transform .18s ease, border-color .18s ease, background-color .18s ease',
                '&:hover': { transform: 'translateY(-2px)', borderColor: `${template.accent}70`, bgcolor: `${template.accent}0d` },
                '&:focus-visible': { outline: `2px solid ${template.accent}`, outlineOffset: 2 },
              }}>
              <Box sx={{
                height: 38,
                background: `radial-gradient(circle at 78% 24%, ${template.accent2}aa 0, transparent 34%), linear-gradient(135deg, #07090f 12%, ${template.accent}80 58%, #050608 100%)`,
              }}>
                <Box sx={{
                  position: 'absolute', top: 9, left: 10, width: 34, height: 3, borderRadius: 99,
                  bgcolor: 'rgba(255,255,255,.9)',
                  boxShadow: '0 7px 0 rgba(255,255,255,.28), 0 14px 0 rgba(255,255,255,.14)',
                }} />
                {selected && (
                  <Box sx={{
                    position: 'absolute', top: 7, right: 7, width: 20, height: 20,
                    display: 'grid', placeItems: 'center', borderRadius: '50%',
                    bgcolor: template.accent, color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,.35)',
                  }}>
                    <Check size={12} strokeWidth={3} />
                  </Box>
                )}
              </Box>
              <Box sx={{ px: 1, py: 0.75 }}>
                <Typography sx={{ color: selected ? '#fff' : 'var(--vm-text-secondary)', fontSize: 11, fontWeight: 800, lineHeight: 1.2 }}>
                  {template.label}
                </Typography>
                <Typography sx={{ mt: 0.25, color: 'var(--vm-text-muted)', fontSize: 8.5, lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {template.description || TEMPLATE_DESCRIPTIONS[template.id] || 'Modern presentation'}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
