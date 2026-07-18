import { Box, Typography, Avatar, Chip } from '@mui/material';
import { Star, Lightbulb, Target, TrendingUp, Shield, Users, DollarSign } from 'lucide-react';
import { AuroraBackground, FloatingOrb } from './AuroraBackground';
import type { Slide } from '../../types/venturemate';

const SLIDE_ICONS: Record<string, typeof Star> = {
  title: Star, cover: Star, problem: Lightbulb, solution: Target, market: TrendingUp,
  product: Star, 'business-model': DollarSign, traction: TrendingUp, competition: Shield,
  team: Users, financials: DollarSign, ask: Target, closing: Star,
};

interface ModernPitchDeckProps {
  slides: Slide[];
  title: string;
  logo?: string;
  businessName?: string;
  accentColor?: string;
  secondaryColor?: string;
}

function SlideHeader({ logo, businessName, slideType, index, total }: {
  logo?: string; businessName?: string; slideType: string; index: number; total: number;
}) {
  return (
    <Box sx={{
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      px: { xs: 3, sm: 5, md: 8 }, py: { xs: 2, sm: 3 },
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {logo ? (
          <Avatar src={logo} sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: 'rgba(255,255,255,.05)' }} />
        ) : (
          <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: 'rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,.6)' }}>{(businessName || 'V')[0]}</Typography>
          </Box>
        )}
        {businessName && (
          <Typography sx={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,.5)' }}>{businessName}</Typography>
        )}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography sx={{ display: { xs: 'none', md: 'block' }, fontSize: 11, color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', letterSpacing: 3 }}>
          {slideType.replace('_', ' ')}
        </Typography>
        <Box sx={{
          borderRadius: 20, border: '1px solid rgba(255,255,255,.08)', bgcolor: 'rgba(255,255,255,.02)',
          px: 1.5, py: 0.5, backdropFilter: 'blur(16px)',
        }}>
          <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,.35)', fontWeight: 600, fontFamily: 'monospace' }}>
            {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

function SlideFooter({ businessName }: { businessName?: string }) {
  return (
    <Box sx={{
      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      px: { xs: 3, sm: 5, md: 8 }, py: { xs: 1.5, sm: 2.5 },
    }}>
      <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,.15)' }}>{businessName || ''}</Typography>
      <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,.15)' }}>Confidential</Typography>
    </Box>
  );
}

function GlassCard({ children, sx }: { children: React.ReactNode; sx?: Record<string, unknown> }) {
  return (
    <Box sx={{
      position: 'relative', overflow: 'hidden', borderRadius: 4, border: '1px solid rgba(255,255,255,.08)',
      bgcolor: 'rgba(255,255,255,.03)', backdropFilter: 'blur(24px)',
      ...sx,
    }}>
      <Box sx={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'linear-gradient(135deg, rgba(255,255,255,.08) 0%, transparent 50%)',
      }} />
      <Box sx={{ position: 'relative', zIndex: 1 }}>
        {children}
      </Box>
    </Box>
  );
}

function CoverSlide({ slide, index, total, logo, businessName, accent }: {
  slide: Slide; index: number; total: number; logo?: string; businessName?: string; accent: string;
}) {
  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <AuroraBackground accent={accent} />
      <FloatingOrb accent={accent} />
      <SlideHeader logo={logo} businessName={businessName} slideType="Cover" index={index} total={total} />

      <Box sx={{
        position: 'relative', zIndex: 10, height: '100%',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        px: { xs: 4, sm: 6, md: 10 },
      }}>
        <Box sx={{
          display: 'inline-flex', alignItems: 'center', gap: 1.5,
          borderRadius: 20, border: '1px solid rgba(255,255,255,.08)',
          bgcolor: 'rgba(255,255,255,.03)', px: 2, py: 1, mb: 3, backdropFilter: 'blur(16px)',
        }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: accent, boxShadow: `0 0 15px ${accent}` }} />
          <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,.5)', letterSpacing: 1 }}>
            Company Presentation
          </Typography>
        </Box>

        <Typography sx={{
          fontSize: { xs: 42, sm: 56, md: 80 }, fontWeight: 600,
          lineHeight: 0.92, letterSpacing: '-0.07em', color: 'white',
          maxWidth: '80%',
        }}>
          {slide.title}
        </Typography>

        {slide.content && (
          <Typography sx={{
            mt: 4, fontSize: { xs: 16, sm: 18, md: 21 },
            lineHeight: 1.6, color: 'rgba(255,255,255,.45)', maxWidth: 600,
          }}>
            {slide.content}
          </Typography>
        )}

        <Box sx={{ mt: 6, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ width: 64, height: 1, bgcolor: accent }} />
          <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,.35)' }}>
            {businessName || 'Building the future'}
          </Typography>
        </Box>
      </Box>
      <SlideFooter businessName={businessName} />
    </Box>
  );
}

function ProblemSlide({ slide, index, total, logo, businessName, accent }: {
  slide: Slide; index: number; total: number; logo?: string; businessName?: string; accent: string;
}) {
  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <AuroraBackground accent={accent} />
      <SlideHeader logo={logo} businessName={businessName} slideType="The Problem" index={index} total={total} />

      <Box sx={{
        position: 'relative', zIndex: 10, height: '100%',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        px: { xs: 4, sm: 6, md: 10 },
      }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 8, alignItems: 'center', height: '100%' }}>
          <Box>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: accent, mb: 3, letterSpacing: 2 }}>
              01
            </Typography>
            <Typography sx={{
              fontSize: { xs: 36, sm: 48, md: 68 }, fontWeight: 600,
              lineHeight: 0.95, letterSpacing: '-0.06em', color: 'white',
            }}>
              {slide.title}
            </Typography>
            {slide.content && (
              <Typography sx={{
                mt: 5, fontSize: { xs: 15, sm: 17, md: 19 },
                lineHeight: 1.7, color: 'rgba(255,255,255,.45)', maxWidth: 480,
              }}>
                {slide.content}
              </Typography>
            )}
          </Box>

          <Box sx={{ position: 'relative' }}>
            <Box sx={{
              position: 'absolute', inset: -24, borderRadius: 10,
              bgcolor: `${accent}08`, filter: 'blur(40px)',
            }} />
            <GlassCard>
              <Box sx={{ p: { xs: 2, sm: 3 } }}>
                {slide.bullets?.map((bullet, i) => (
                  <Box key={i} sx={{
                    display: 'flex', alignItems: 'center', gap: 2.5,
                    p: 2.5, mb: 1, borderRadius: 3,
                    border: '1px solid rgba(255,255,255,.06)',
                    bgcolor: 'rgba(255,255,255,.03)',
                    transition: 'all .2s',
                    '&:hover': { bgcolor: 'rgba(255,255,255,.06)' },
                    '&:last-child': { mb: 0 },
                  }}>
                    <Box sx={{
                      width: 44, height: 44, flexShrink: 0, borderRadius: 2,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      bgcolor: `${accent}15`,
                    }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: accent }}>
                        {String(i + 1).padStart(2, '0')}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: { xs: 14, sm: 16 }, color: 'rgba(255,255,255,.7)', lineHeight: 1.5 }}>
                      {bullet}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </GlassCard>
          </Box>
        </Box>
      </Box>
      <SlideFooter businessName={businessName} />
    </Box>
  );
}

function SolutionSlide({ slide, index, total, logo, businessName, accent }: {
  slide: Slide; index: number; total: number; logo?: string; businessName?: string; accent: string;
}) {
  const points = slide.bullets?.length ? slide.bullets : slide.content ? [slide.content] : [];
  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <AuroraBackground accent={accent} />
      <SlideHeader logo={logo} businessName={businessName} slideType="The Solution" index={index} total={total} />

      <Box sx={{
        position: 'relative', zIndex: 10, height: '100%',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        px: { xs: 4, sm: 6, md: 10 },
      }}>
        <Typography sx={{
          fontSize: { xs: 36, sm: 48, md: 72 }, fontWeight: 600,
          lineHeight: 0.95, letterSpacing: '-0.06em', color: 'white',
        }}>
          {slide.title}
        </Typography>

        <Box sx={{ mt: 6, display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
          {points.slice(0, 6).map((point, i) => (
            <GlassCard key={i} sx={{ p: 3.5 }}>
              <Box sx={{ position: 'absolute', top: -64, right: -64, width: 160, height: 160, borderRadius: '50%', bgcolor: `${accent}10`, filter: 'blur(48px)', transition: 'all .3s' }} />
              <Typography sx={{ fontSize: { xs: 28, sm: 32 }, fontWeight: 300, color: accent, mb: 4 }}>
                0{i + 1}
              </Typography>
              <Typography sx={{ fontSize: { xs: 14, sm: 16 }, color: 'rgba(255,255,255,.7)', lineHeight: 1.6 }}>
                {point}
              </Typography>
            </GlassCard>
          ))}
        </Box>
      </Box>
      <SlideFooter businessName={businessName} />
    </Box>
  );
}

function MarketSlide({ slide, index, total, logo, businessName, accent }: {
  slide: Slide; index: number; total: number; logo?: string; businessName?: string; accent: string;
}) {
  const Icon = SLIDE_ICONS[slide.type] || TrendingUp;
  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <AuroraBackground accent={accent} />
      <SlideHeader logo={logo} businessName={businessName} slideType="Market Opportunity" index={index} total={total} />

      <Box sx={{
        position: 'relative', zIndex: 10, height: '100%',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        px: { xs: 4, sm: 6, md: 10 },
      }}>
        <Typography sx={{
          fontSize: { xs: 36, sm: 48, md: 72 }, fontWeight: 600,
          lineHeight: 0.95, letterSpacing: '-0.06em', color: 'white',
        }}>
          {slide.title}
        </Typography>

        <Box sx={{ mt: 6, display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
          <GlassCard sx={{ p: { xs: 3, sm: 4 } }}>
            <Box sx={{ position: 'absolute', top: -80, right: -80, width: 192, height: 192, borderRadius: '50%', bgcolor: `${accent}10`, filter: 'blur(48px)' }} />
            <Box sx={{ position: 'relative' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Icon size={16} color={accent} />
                <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: 1 }}>TAM</Typography>
              </Box>
              <Typography sx={{ fontSize: { xs: 32, sm: 42, md: 52 }, fontWeight: 600, letterSpacing: '-0.06em', color: accent }}>
                {slide.title.includes('$') || slide.title.includes('B') || slide.title.includes('M') ? '$' : ''}XX
              </Typography>
              <Typography sx={{ mt: 2, fontSize: 14, color: 'rgba(255,255,255,.6)' }}>Total Addressable Market</Typography>
            </Box>
          </GlassCard>
          <GlassCard sx={{ p: { xs: 3, sm: 4 } }}>
            <Box sx={{ position: 'absolute', top: -80, right: -80, width: 192, height: 192, borderRadius: '50%', bgcolor: `${accent}10`, filter: 'blur(48px)' }} />
            <Box sx={{ position: 'relative' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Icon size={16} color={accent} />
                <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: 1 }}>SAM</Typography>
              </Box>
              <Typography sx={{ fontSize: { xs: 32, sm: 42, md: 52 }, fontWeight: 600, letterSpacing: '-0.06em', color: accent }}>
                {slide.title.includes('$') || slide.title.includes('B') || slide.title.includes('M') ? '$' : ''}XX
              </Typography>
              <Typography sx={{ mt: 2, fontSize: 14, color: 'rgba(255,255,255,.6)' }}>Serviceable Available Market</Typography>
            </Box>
          </GlassCard>
          <GlassCard sx={{ p: { xs: 3, sm: 4 } }}>
            <Box sx={{ position: 'absolute', top: -80, right: -80, width: 192, height: 192, borderRadius: '50%', bgcolor: `${accent}10`, filter: 'blur(48px)' }} />
            <Box sx={{ position: 'relative' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Icon size={16} color={accent} />
                <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: 1 }}>SOM</Typography>
              </Box>
              <Typography sx={{ fontSize: { xs: 32, sm: 42, md: 52 }, fontWeight: 600, letterSpacing: '-0.06em', color: accent }}>
                {slide.title.includes('$') || slide.title.includes('B') || slide.title.includes('M') ? '$' : ''}XX
              </Typography>
              <Typography sx={{ mt: 2, fontSize: 14, color: 'rgba(255,255,255,.6)' }}>Serviceable Obtainable Market</Typography>
            </Box>
          </GlassCard>
        </Box>
      </Box>
      <SlideFooter businessName={businessName} />
    </Box>
  );
}

function TractionSlide({ slide, index, total, logo, businessName, accent }: {
  slide: Slide; index: number; total: number; logo?: string; businessName?: string; accent: string;
}) {
  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <AuroraBackground accent={accent} />
      <SlideHeader logo={logo} businessName={businessName} slideType="Traction" index={index} total={total} />

      <Box sx={{
        position: 'relative', zIndex: 10, height: '100%',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        px: { xs: 4, sm: 6, md: 10 },
      }}>
        <Typography sx={{
          fontSize: { xs: 36, sm: 48, md: 72 }, fontWeight: 600,
          lineHeight: 0.95, letterSpacing: '-0.06em', color: 'white',
        }}>
          {slide.title}
        </Typography>

        <Box sx={{ mt: 6, display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 3 }}>
          {['Users', 'Revenue', 'Growth', 'Retention'].map((label, i) => (
            <GlassCard key={i} sx={{ p: { xs: 2.5, sm: 3.5 }, position: 'relative' }}>
              <Box sx={{
                position: 'absolute', bottom: 0, left: 0, height: 4,
                width: '100%', background: `linear-gradient(90deg, ${accent}, transparent)`,
                opacity: 0.7,
              }} />
              <Typography sx={{
                fontSize: { xs: 28, sm: 36, md: 48 }, fontWeight: 600,
                letterSpacing: '-0.05em', color: 'white',
              }}>
                {['12K+', '$2.4M', '47%', '94%'][i]}
              </Typography>
              <Typography sx={{ mt: 2, fontSize: 13, color: 'rgba(255,255,255,.45)' }}>
                {label}
              </Typography>
              <Typography sx={{ mt: 2, fontSize: 12, color: accent }}>
                ↗ {['+240%', '+180%', '+12%', '+5%'][i]}
              </Typography>
            </GlassCard>
          ))}
        </Box>
      </Box>
      <SlideFooter businessName={businessName} />
    </Box>
  );
}

function BusinessModelSlide({ slide, index, total, logo, businessName, accent }: {
  slide: Slide; index: number; total: number; logo?: string; businessName?: string; accent: string;
}) {
  const items = slide.bullets?.length ? slide.bullets : slide.content ? [slide.content] : [];
  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <AuroraBackground accent={accent} />
      <SlideHeader logo={logo} businessName={businessName} slideType="Business Model" index={index} total={total} />

      <Box sx={{
        position: 'relative', zIndex: 10, height: '100%',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        px: { xs: 4, sm: 6, md: 10 },
      }}>
        <Typography sx={{
          fontSize: { xs: 36, sm: 48, md: 72 }, fontWeight: 600,
          lineHeight: 0.95, letterSpacing: '-0.06em', color: 'white',
        }}>
          {slide.title}
        </Typography>

        <Box sx={{ mt: 6, display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
          {['Subscription', 'Enterprise', 'Marketplace'].map((label, i) => (
            <GlassCard key={i} sx={{ p: { xs: 3, sm: 4 } }}>
              <Box sx={{
                width: 48, height: 48, borderRadius: 2, mb: 4,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                bgcolor: `${accent}15`,
              }}>
                <Typography sx={{ fontSize: 18, fontWeight: 700, color: accent }}>{i + 1}</Typography>
              </Box>
              <Typography sx={{ fontSize: { xs: 18, sm: 20 }, fontWeight: 500, color: 'rgba(255,255,255,.8)', mb: 2 }}>
                {label}
              </Typography>
              <Typography sx={{ fontSize: 13, lineHeight: 1.7, color: 'rgba(255,255,255,.4)' }}>
                {items[i] || `Revenue stream ${i + 1} description with key metrics and pricing.`}
              </Typography>
            </GlassCard>
          ))}
        </Box>
      </Box>
      <SlideFooter businessName={businessName} />
    </Box>
  );
}

function AskSlide({ slide, index, total, logo, businessName, accent, secondary }: {
  slide: Slide; index: number; total: number; logo?: string; businessName?: string; accent: string; secondary: string;
}) {
  const uses = slide.bullets?.length ? slide.bullets : [];
  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <AuroraBackground accent={accent} secondary={secondary} />
      <SlideHeader logo={logo} businessName={businessName} slideType="The Ask" index={index} total={total} />

      <Box sx={{
        position: 'relative', zIndex: 10, height: '100%',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        px: { xs: 4, sm: 6, md: 10 },
      }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 8, alignItems: 'center', height: '100%' }}>
          <Box>
            <Typography sx={{
              fontSize: { xs: 36, sm: 48, md: 72 }, fontWeight: 600,
              lineHeight: 0.95, letterSpacing: '-0.06em', color: 'white',
            }}>
              {slide.title}
            </Typography>
            <Typography sx={{
              mt: 5, fontSize: { xs: 42, sm: 56, md: 80 }, fontWeight: 600,
              letterSpacing: '-0.07em',
              background: `linear-gradient(135deg, ${accent}, ${secondary})`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              {slide.title.includes('$') ? '' : '$'}XX
            </Typography>
          </Box>

          <GlassCard sx={{ p: { xs: 3, sm: 4 } }}>
            <Box sx={{ position: 'absolute', top: -80, right: -80, width: 192, height: 192, borderRadius: '50%', bgcolor: `${accent}15`, filter: 'blur(48px)' }} />
            <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', letterSpacing: 2, mb: 3 }}>
              Use of Funds
            </Typography>
            <Box>
              {uses.length > 0 ? uses.map((use, i) => (
                <Box key={i} sx={{
                  display: 'flex', alignItems: 'center', gap: 2,
                  py: 2.5, borderBottom: '1px solid rgba(255,255,255,.06)',
                  '&:last-child': { borderBottom: 'none' },
                }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: accent, minWidth: 28 }}>
                    0{i + 1}
                  </Typography>
                  <Typography sx={{ fontSize: { xs: 14, sm: 16 }, color: 'rgba(255,255,255,.7)' }}>
                    {use}
                  </Typography>
                </Box>
              )) : (
                <Typography sx={{ fontSize: 14, color: 'rgba(255,255,255,.4)', py: 4, textAlign: 'center' }}>
                  Use of funds breakdown
                </Typography>
              )}
            </Box>
          </GlassCard>
        </Box>
      </Box>
      <SlideFooter businessName={businessName} />
    </Box>
  );
}

function DefaultSlide({ slide, index, total, logo, businessName, accent }: {
  slide: Slide; index: number; total: number; logo?: string; businessName?: string; accent: string;
}) {
  const Icon = SLIDE_ICONS[slide.type] || Star;
  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <AuroraBackground accent={accent} />
      <SlideHeader logo={logo} businessName={businessName} slideType={slide.type} index={index} total={total} />

      <Box sx={{
        position: 'relative', zIndex: 10, height: '100%',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        px: { xs: 4, sm: 6, md: 10 },
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Box sx={{
            width: 10, height: 10, borderRadius: '50%', bgcolor: accent,
            boxShadow: `0 0 12px ${accent}60`,
          }} />
          <Typography sx={{ fontSize: 11, fontWeight: 600, color: accent, textTransform: 'uppercase', letterSpacing: 3 }}>
            {slide.type.replace('_', ' ')}
          </Typography>
        </Box>

        <Typography sx={{
          fontSize: { xs: 36, sm: 48, md: 72 }, fontWeight: 600,
          lineHeight: 0.95, letterSpacing: '-0.06em', color: 'white',
          maxWidth: '85%',
        }}>
          {slide.title}
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 4, mt: 5, alignItems: 'flex-start' }}>
          {slide.content && (
            <Typography sx={{ fontSize: { xs: 14, sm: 16 }, lineHeight: 1.8, color: 'rgba(255,255,255,.6)', maxWidth: 520 }}>
              {slide.content}
            </Typography>
          )}
          {slide.bullets && slide.bullets.length > 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {slide.bullets.map((bullet, bi) => (
                <Box key={bi} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                  <Box sx={{ minWidth: 6, height: 6, borderRadius: '50%', bgcolor: accent, mt: 0.75, boxShadow: `0 0 6px ${accent}60` }} />
                  <Typography sx={{ fontSize: { xs: 13, sm: 15 }, lineHeight: 1.6, color: 'rgba(255,255,255,.75)' }}>
                    {bullet}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Box>
      <SlideFooter businessName={businessName} />
    </Box>
  );
}

export function ModernPitchDeck({ slides, title, logo, businessName, accentColor = '#8b5cf6', secondaryColor = '#2563eb' }: ModernPitchDeckProps) {
  const accent = accentColor;

  if (!slides || slides.length === 0) return null;

  return (
    <Box sx={{ position: 'relative', width: '100%' }}>
      {slides.map((slide, index) => {
        const total = slides.length;
        const common = { slide, index, total, logo, businessName, accent };
        const withSecondary = { ...common, secondary: secondaryColor };

        let slideContent: React.ReactNode;
        switch (slide.type) {
          case 'cover':
          case 'title':
          case 'closing':
            slideContent = <CoverSlide {...common} />;
            break;
          case 'problem':
            slideContent = <ProblemSlide {...common} />;
            break;
          case 'solution':
            slideContent = <SolutionSlide {...common} />;
            break;
          case 'market':
            slideContent = <MarketSlide {...common} />;
            break;
          case 'traction':
            slideContent = <TractionSlide {...common} />;
            break;
          case 'business-model':
            slideContent = <BusinessModelSlide {...common} />;
            break;
          case 'ask':
            slideContent = <AskSlide {...withSecondary} />;
            break;
          default:
            slideContent = <DefaultSlide {...common} />;
        }

        return (
          <Box key={slide.id || index} sx={{
            position: 'relative', width: '100%', aspectRatio: '16 / 9',
            overflow: 'hidden', borderBottom: '1px solid rgba(255,255,255,.06)',
            minHeight: { xs: 300, sm: 400, md: 500 },
          }}>
            {slideContent}
          </Box>
        );
      })}
    </Box>
  );
}
