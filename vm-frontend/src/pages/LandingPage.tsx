import { useState, useEffect } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';

import {
  Box,
  Typography,
  Container,
  Grid,
  Link,
  Card,
  CardContent,
  Chip,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Stack,
} from '@mui/material';
import {
  Menu,
  Close,
  ExpandMore,
  CheckCircle,
  Palette,
  Language,
  Verified,
  AutoAwesome,
  Timeline,
  Rocket,
  Description,
  ArrowForward,
  Launch,
  TrendingUp,
  Shield,
  Speed,
} from '@mui/icons-material';
import 'aos/dist/aos.css';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { GradientButton } from '../components/shared/buttons';

// Initialize AOS dynamically
let AOS: typeof import('aos') | null = null;

const features = [
  {
    icon: Palette,
    title: 'Branding',
    subtitle: 'Logo, colors, and identity kit generated instantly.',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    glow: 'rgba(16, 185, 129, 0.4)',
  },
  {
    icon: Language,
    title: 'Website',
    subtitle: 'Optimized templates & hosting with one-click deploy.',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    glow: 'rgba(59, 130, 246, 0.4)',
  },
  {
    icon: Verified,
    title: 'Compliance',
    subtitle: 'Automated checklists and registration workflows.',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    glow: 'rgba(245, 158, 11, 0.4)',
  },
  {
    icon: Description,
    title: 'Pitch Decks',
    subtitle: 'VC and Grant-ready presentations in minutes.',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    glow: 'rgba(139, 92, 246, 0.4)',
  },
];

const steps = [
  {
    number: '01',
    title: 'Describe Your Idea',
    description: "Answer a few questions about your vision. AI-powered prompts ensure you don't get stuck.",
    icon: AutoAwesome,
    color: '#10b981',
  },
  {
    number: '02',
    title: 'Get Your Plan',
    description: 'Receive an instant roadmap with checklists, timelines, and compliance recommendations.',
    icon: Timeline,
    color: '#3b82f6',
  },
  {
    number: '03',
    title: 'Launch & Grow',
    description: 'Build your website, register your company, and track everything in real-time.',
    icon: Rocket,
    color: '#f59e0b',
  },
];

const tools = [
  { icon: AutoAwesome, title: 'AI Assistant', desc: 'Generate pitch decks, business plans, and forecasts in minutes.' },
  { icon: TrendingUp, title: 'Investor Network', desc: 'Match with VCs, angels, and accelerators tailored to your startup.' },
  { icon: Language, title: 'Website Builder', desc: 'Launch beautiful, conversion-optimized sites without writing code.' },
  { icon: Shield, title: 'Health Score', desc: 'Track milestones, runway, and team health in real-time.' },
  { icon: Speed, title: 'Performance Analytics', desc: 'Monitor growth metrics and optimize your strategy.' },
  { icon: Launch, title: 'Launchpad', desc: 'Go live with integrated hosting and domain management.' },
];

const faqs = [
  {
    question: 'Is VentureMate only for tech startups?',
    answer: "Not at all. It's built for any founder starting a real business, from local services to retail to online brands.",
  },
  {
    question: 'Can I get human support too?',
    answer: 'Yes! Our Growth plan includes priority support with real humans who can guide you through complex decisions.',
  },
  {
    question: 'What countries do you support?',
    answer: 'We currently support business registration in Ghana, Nigeria, Kenya, and South Africa, with more countries coming soon.',
  },
  {
    question: 'Can I cancel anytime?',
    answer: 'Absolutely. No long-term contracts. Upgrade, downgrade, or cancel whenever you need.',
  },
];

const stats = [
  { value: '10K+', label: 'Startups Launched' },
  { value: '$50M+', label: 'Funding Raised' },
  { value: '95%', label: 'Success Rate' },
  { value: '24/7', label: 'AI Support' },
];

function TypeWriter({ words }: { words: string[] }) {
  const [index, setIndex] = useState(0);
  const [display, setDisplay] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const word = words[index];
    const timeout = setTimeout(
      () => {
        if (!isDeleting) {
          setDisplay(word.slice(0, display.length + 1));
          if (display.length + 1 === word.length) {
            setTimeout(() => setIsDeleting(true), 2500);
          }
        } else {
          setDisplay(word.slice(0, display.length - 1));
          if (display.length - 1 === 0) {
            setIsDeleting(false);
            setIndex((prev) => (prev + 1) % words.length);
          }
        }
      },
      isDeleting ? 30 : 60
    );
    return () => clearTimeout(timeout);
  }, [display, isDeleting, index, words]);

  return (
    <Box component="span" sx={{ 
      background: 'linear-gradient(90deg, #34d399 0%, #10b981 50%, #059669 100%)', 
      WebkitBackgroundClip: 'text', 
      WebkitTextFillColor: 'transparent',
      position: 'relative',
    }}>
      {display}
      <Box component="span" sx={{ 
        display: 'inline-block', 
        width: '3px', 
        height: '1em', 
        bgcolor: '#34d399', 
        ml: 0.5, 
        animation: 'blink 0.8s step-end infinite',
        boxShadow: '0 0 10px #34d399',
        '@keyframes blink': { '50%': { opacity: 0 } } 
      }} />
    </Box>
  );
}

export function LandingPage() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  

  useEffect(() => {
    // Dynamically import AOS
    import('aos').then((aosModule) => {
      AOS = aosModule.default;
      AOS.init({
        duration: 800,
        once: true,
        offset: 100,
        easing: 'ease-out-cubic',
      });

    });
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <Box sx={{ minHeight: '100vh', color: '#fff', overflow: 'hidden', position: 'relative' }}>
      <AnimatedBackground />
      
      {/* Navbar */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1100,
          bgcolor: 'rgba(10, 10, 15, 0.7)',
          backdropFilter: 'blur(20px) saturate(180%)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
        data-aos="fade-down"
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: { xs: 0.75, md: 1.25 },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <img
                src="/ventureMate-logo2.png"
                alt="VentureMate"
                style={{ height: 48, width: 'auto', objectFit: 'contain' }}
              />
            </Box>

            <Box sx={{ display: { xs: 'none', lg: 'flex' }, alignItems: 'center', gap: 0.5 }}>
              {['Solution', 'How it Works', 'Toolkit', 'FAQ'].map((label) => (
                <GradientButton key={label} variant="ghost" size="sm" onClick={() => scrollTo(label.toLowerCase().replace(/ /g, '-'))}>
                  {label}
                </GradientButton>
              ))}
              <Box sx={{ width: '1px', height: 24, bgcolor: 'rgba(255,255,255,0.1)', mx: 1.5 }} />
              <GradientButton onClick={() => navigate('/signup')} variant="primary" size="sm">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  Get Started
                  <ArrowForward sx={{ fontSize: 18 }} />
                </Box>
              </GradientButton>
            </Box>

            <IconButton sx={{ display: { xs: 'flex', lg: 'none' }, color: 'white' }} onClick={() => setMobileMenuOpen(true)}>
              <Menu />
            </IconButton>
          </Box>
        </Container>
      </Box>

      {/* Mobile Drawer */}
      <Drawer
        anchor="right"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 320 }, bgcolor: 'rgba(10, 10, 15, 0.95)', borderLeft: '1px solid rgba(255,255,255,0.08)' } }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <img
              src="/ventureMate-logo2.png"
              alt="VentureMate"
                style={{ height: 44, width: 'auto', objectFit: 'contain' }}
            />
          </Box>
          <IconButton onClick={() => setMobileMenuOpen(false)} sx={{ color: 'white' }}>
            <Close />
          </IconButton>
        </Box>
        <Divider sx={{ bgcolor: 'rgba(255,255,255,0.05)' }} />
        <List sx={{ px: 2, py: 2 }}>
          {[
            { text: 'Solution', id: 'solution' },
            { text: 'How it Works', id: 'how-it-works' },
            { text: 'Toolkit', id: 'toolkit' },
            { text: 'FAQ', id: 'faq' },
          ].map((item) => (
            <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
              <ListItemButton
                onClick={() => {
                  scrollTo(item.id);
                  setMobileMenuOpen(false);
                }}
                sx={{ borderRadius: 2, py: 1.5, color: '#94a3b8', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', color: '#fff' } }}
              >
                <Typography sx={{ fontWeight: 500 }}>{item.text}</Typography>
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        <Box sx={{ px: 3, pb: 3, mt: 'auto' }}>
          <GradientButton onClick={() => { navigate('/signup'); setMobileMenuOpen(false); }} variant="primary" size="lg" fullWidth>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              Get Started
              <ArrowForward sx={{ fontSize: 18 }} />
            </Box>
          </GradientButton>
        </Box>
      </Drawer>

      {/* Hero Section */}
      <Box sx={{ px: { xs: 2, md: 6 }, py: { xs: 8, md: 16 }, position: 'relative' }}>
        {/* Animated gradient orbs */}
        <Box
          sx={{
            position: 'absolute',
            top: '10%',
            left: '-10%',
            width: 700,
            height: 700,
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, transparent 60%)',
            filter: 'blur(100px)',
            zIndex: 0,
            animation: 'pulse1 10s ease-in-out infinite',
            '@keyframes pulse1': { '0%,100%': { opacity: 0.5, transform: 'scale(1)' }, '50%': { opacity: 0.8, transform: 'scale(1.1)' } },
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            top: '20%',
            right: '-10%',
            width: 600,
            height: 600,
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 60%)',
            filter: 'blur(100px)',
            zIndex: 0,
            animation: 'pulse2 12s ease-in-out infinite 2s',
            display: { xs: 'none', md: 'block' },
            '@keyframes pulse2': { '0%,100%': { opacity: 0.4, transform: 'scale(1)' }, '50%': { opacity: 0.7, transform: 'scale(1.15)' } },
          }}
        />

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ textAlign: 'center', maxWidth: 950, mx: 'auto' }}>
            <Box data-aos="fade-up" data-aos-delay="100">
              <Chip
                icon={<AutoAwesome sx={{ fontSize: 16, color: '#10b981' }} />}
                label="Your entrepreneur's best friend"
                sx={{
                  mb: 4,
                  bgcolor: 'rgba(16, 185, 129, 0.1)',
                  color: '#10b981',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  fontWeight: 500,
                  borderRadius: 9999,
                  px: 2,
                  py: 0.5,
                  fontSize: { xs: '0.75rem', sm: '0.9rem' },
                  backdropFilter: 'blur(10px)',
                  height: 'auto',
                  whiteSpace: 'normal',
                  overflow: 'visible',
                  '& .MuiChip-label': { whiteSpace: 'normal', overflow: 'visible', textOverflow: 'clip', display: 'block' },
                  '& .MuiChip-icon': { ml: 1 },
                }}
              />
</Box>

            <Typography
                variant="h1"
               sx={{
                 fontSize: { xs: '2rem', sm: '2.5rem', md: '3.5rem' },
               fontWeight: 800,
               lineHeight: 1.05,
               mb: 4,
               letterSpacing: '-0.04em',
               }}
               data-aos="fade-up"
               data-aos-delay="200"
             >
               Turn your idea into a{' '}
               <TypeWriter words={['real business', 'thriving startup', 'registered company', 'funded venture', 'global brand']} />
             </Typography>

<Typography
               variant="h6"
               sx={{
                 color: '#94a3b8',
                 mb: 6,
                 maxWidth: 650,
                 mx: 'auto',
                 fontSize: { xs: '0.875rem', sm: '1rem', md: '1.25rem' },
                 lineHeight: 1.7,
                 fontWeight: 400,
               }}
               data-aos="fade-up"
               data-aos-delay="300"
             >
               Describe your idea once. Get everything you need to build, register, launch, and grow — all from one intelligent dashboard.
             </Typography>

            <Box sx={{ mb: 8 }} data-aos="fade-up" data-aos-delay="400">
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center" sx={{ mb: 10, flexWrap: 'wrap' }}>
                {['Founder-friendly', 'Local compliance ready', 'AI-powered'].map((text) => (
                  <Box key={text} sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#64748b' }}>
                    <CheckCircle sx={{ fontSize: 16, color: '#10b981' }} />
                    <Typography fontSize={{ xs: '0.75rem', sm: '0.875rem' }}>{text}</Typography>
                  </Box>
                ))}
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center" sx={{ mb: 10, flexWrap: 'wrap' }}>
                <GradientButton onClick={() => scrollTo('how-it-works')} variant="glass" size="lg" sx={{ width: { xs: '100%', md: 'auto' } }}>
                  See How It Works
                </GradientButton>
              </Stack>
            </Box>
            </Box>

            {/* Dashboard Preview */}
          <Box sx={{ maxWidth: { xs: '100%', md: 1100 }, mx: 'auto', position: 'relative' }} data-aos="zoom-in-up" data-aos-delay="600">
            <Card
              sx={{
                bgcolor: 'rgba(15, 23, 42, 0.6)',
                backdropFilter: 'blur(30px) saturate(180%)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: { xs: '16px', md: '28px' },
                overflow: 'hidden',
                position: 'relative',
                boxShadow: '0 0 80px rgba(16, 185, 129, 0.15), 0 25px 50px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
              }}
            >
              {/* Browser chrome */}
              <Box
                sx={{
                  p: { xs: 1.5, md: 3 },
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  bgcolor: 'rgba(0,0,0,0.2)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.75, md: 1.5 } }}>
                  <Box sx={{ width: { xs: 10, md: 14 }, height: { xs: 10, md: 14 }, borderRadius: '50%', bgcolor: '#ef4444' }} />
                  <Box sx={{ width: { xs: 10, md: 14 }, height: { xs: 10, md: 14 }, borderRadius: '50%', bgcolor: '#f59e0b' }} />
                  <Box sx={{ width: { xs: 10, md: 14 }, height: { xs: 10, md: 14 }, borderRadius: '50%', bgcolor: '#10b981' }} />
                </Box>
                <Box
                  sx={{
                    px: { xs: 2, md: 4 },
                    py: { xs: 0.5, md: 1 },
                    borderRadius: '8px',
                    bgcolor: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    mx: { xs: 1, md: 0 },
                    flex: { xs: 1, md: 'unset' },
                    textAlign: 'center',
                  }}
                >
                  <Typography sx={{ color: '#64748b', fontSize: { xs: '0.65rem', md: '0.8rem' }, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    venturemate.net/vm
                  </Typography>
                </Box>
                <Box sx={{ width: { xs: 40, md: 80 } }} />
              </Box>

              <CardContent sx={{ p: { xs: 2, md: 4 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, md: 2 }, mb: { xs: 3, md: 4 }, flexWrap: 'wrap' }}>
                  <Box component="img" src="/ventureMate-logo2.png" alt="VentureMate" sx={{ height: 40, width: 'auto', objectFit: 'contain' }} />
                  <Box>
                    <Typography variant="h6" fontWeight={700} sx={{ color: '#fff' }}>EcoTech Solutions</Typography>
                    <Typography sx={{ color: '#64748b', fontSize: '0.875rem' }}>Sustainability • Pre-seed</Typography>
                  </Box>
                  <Chip
                    label="Active"
                    size="small"
                    sx={{ ml: 'auto', bgcolor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}
                  />
                </Box>

                <Grid container spacing={{ xs: 2, md: 3 }}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: 'rgba(16, 185, 129, 0.05)', borderRadius: '20px', border: '1px solid rgba(16, 185, 129, 0.15)', transition: 'all 0.3s', '&:hover': { borderColor: 'rgba(16, 185, 129, 0.3)', transform: 'translateY(-4px)' } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: { xs: 2, md: 3 } }}>
                        <Box sx={{ width: 40, height: 40, borderRadius: '12px', bgcolor: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Verified sx={{ color: '#10b981', fontSize: 20 }} />
                        </Box>
                        <Typography fontWeight={600} sx={{ color: '#fff' }}>Registration</Typography>
                      </Box>
                      <Typography sx={{ color: '#64748b', fontSize: '0.875rem', mb: 2 }}>Checklist created • 68% Done</Typography>
                      <LinearProgress
                        variant="determinate"
                        value={68}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          bgcolor: 'rgba(16, 185, 129, 0.1)',
                          '& .MuiLinearProgress-bar': { bgcolor: '#10b981', borderRadius: 4 },
                        }}
                      />
                    </Box>
                  </Grid>

                  <Grid size={{ xs: 12, md: 4 }}>
                    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: 'rgba(59, 130, 246, 0.05)', borderRadius: '20px', border: '1px solid rgba(59, 130, 246, 0.15)', transition: 'all 0.3s', '&:hover': { borderColor: 'rgba(59, 130, 246, 0.3)', transform: 'translateY(-4px)' } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: { xs: 2, md: 3 } }}>
                        <Box sx={{ width: 40, height: 40, borderRadius: '12px', bgcolor: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Palette sx={{ color: '#3b82f6', fontSize: 20 }} />
                        </Box>
                        <Typography fontWeight={600} sx={{ color: '#fff' }}>Branding Kit</Typography>
                      </Box>
                      <Typography sx={{ color: '#64748b', fontSize: '0.875rem', mb: 2 }}>Logo + colors ready</Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: '#10b981', boxShadow: '0 0 10px rgba(16, 185, 129, 0.5)' }} />
                        <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: '#3b82f6', boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)' }} />
                        <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: '#fff' }} />
                      </Box>
                    </Box>
                  </Grid>

                  <Grid size={{ xs: 12, md: 4 }}>
                    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: 'rgba(245, 158, 11, 0.05)', borderRadius: '20px', border: '1px solid rgba(245, 158, 11, 0.15)', transition: 'all 0.3s', '&:hover': { borderColor: 'rgba(245, 158, 11, 0.3)', transform: 'translateY(-4px)' } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: { xs: 2, md: 3 } }}>
                        <Box sx={{ width: 40, height: 40, borderRadius: '12px', bgcolor: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Language sx={{ color: '#f59e0b', fontSize: 20 }} />
                        </Box>
                        <Typography fontWeight={600} sx={{ color: '#fff' }}>Website Live</Typography>
                      </Box>
                      <Typography sx={{ color: '#64748b', fontSize: '0.875rem', mb: 2 }}>Domain connected</Typography>
                      <Chip
                        label="ecotech.ventures"
                        size="small"
                        sx={{ bgcolor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontWeight: 500, border: '1px solid rgba(245, 158, 11, 0.3)' }}
                      />
                    </Box>
                  </Grid>
                </Grid>

                <Box
                  sx={{
                    mt: { xs: 3, md: 4 },
                    p: { xs: 2, md: 4 },
                    bgcolor: 'rgba(255,255,255,0.02)',
                    borderRadius: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    border: '1px solid rgba(255,255,255,0.05)',
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: { xs: 2, md: 0 },
                  }}
                >
                  <Box>
                    <Typography fontWeight={600} fontSize="1.1rem" sx={{ color: '#fff' }}>Growth Score</Typography>
                    <Typography sx={{ color: '#64748b', fontSize: '0.9rem' }}>Your startup is performing excellently</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography
                      variant="h2"
                      sx={{
                        fontWeight: 800,
                        background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      92
                    </Typography>
                    <Typography sx={{ color: '#10b981', fontSize: '0.875rem', fontWeight: 500 }}>↑ 12% this week</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Floating elements */}
            <Box
              sx={{
                position: 'absolute',
                top: -30,
                right: -40,
                width: 90,
                height: 90,
                borderRadius: '24px',
                bgcolor: 'rgba(16, 185, 129, 0.15)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                display: { xs: 'none', md: 'flex' },
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'float1 6s ease-in-out infinite',
                '@keyframes float1': { '0%,100%': { transform: 'translateY(0) rotate(0deg)' }, '50%': { transform: 'translateY(-15px) rotate(5deg)' } },
              }}
            >
              <Rocket sx={{ color: '#10b981', fontSize: 40 }} />
            </Box>

            <Box
              sx={{
                position: 'absolute',
                bottom: 40,
                left: -50,
                width: 70,
                height: 70,
                borderRadius: '20px',
                bgcolor: 'rgba(59, 130, 246, 0.15)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                display: { xs: 'none', md: 'flex' },
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'float2 5s ease-in-out infinite 1s',
                '@keyframes float2': { '0%,100%': { transform: 'translateY(0) rotate(0deg)' }, '50%': { transform: 'translateY(-10px) rotate(-5deg)' } },
              }}
            >
              <TrendingUp sx={{ color: '#3b82f6', fontSize: 32 }} />
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Stats Section */}
      <Box sx={{ py: { xs: 8, md: 12 }, position: 'relative' }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} justifyContent="center">
            {stats.map((stat, idx) => (
              <Grid size={{ xs: 6, md: 3 }} key={idx} data-aos="fade-up" data-aos-delay={idx * 100}>
                <Box sx={{ textAlign: 'center' }}>
<Typography
                 variant="h2"
                 sx={{
                   fontWeight: 800,
                   fontSize: { xs: '1.5rem', sm: '2rem', md: '3rem' },
                   background: 'linear-gradient(135deg, #fff 0%, #94a3b8 100%)',
                   WebkitBackgroundClip: 'text',
                   WebkitTextFillColor: 'transparent',
                   mb: 1,
                 }}
               >
                 {stat.value.includes('K') || stat.value.includes('M') || stat.value.includes('%') ? (
                   <>{stat.value}</>
                 ) : (
                   <>{stat.value}</>
                 )}
               </Typography>
               <Typography sx={{ color: '#64748b', fontSize: { xs: '0.8125rem', sm: '0.875rem', md: '0.95rem' } }}>{stat.label}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Solution / Features */}
      <Box id="solution" sx={{ py: { xs: 12, md: 20 }, position: 'relative' }}>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 1000,
            height: 1000,
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 60%)',
            filter: 'blur(120px)',
            zIndex: 0,
          }}
        />
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ textAlign: 'center', mb: 10 }} data-aos="fade-up">
            <Typography variant="overline" sx={{ color: '#10b981', fontWeight: 600, letterSpacing: '0.15em', fontSize: '0.85rem' }}>
              THE SOLUTION
            </Typography>
            <Typography variant="h2" sx={{ mt: 2, fontWeight: 800, fontSize: { xs: '2.25rem', md: '3.5rem' }, letterSpacing: '-0.02em', color: '#fff' }}>
              One platform. Everything you need.
            </Typography>
            <Typography sx={{ mt: 2, color: '#64748b', maxWidth: 600, mx: 'auto', fontSize: '1.1rem' }}>
              From idea validation to global expansion, we've got every step covered.
            </Typography>
          </Box>

          <Grid container spacing={4}>
            {features.map((feature, idx) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={idx} data-aos="fade-up" data-aos-delay={idx * 100}>
                <Card
                  sx={{
                    height: '100%',
                    bgcolor: 'rgba(15, 23, 42, 0.4)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '24px',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    '&:hover': {
                      transform: 'translateY(-12px) scale(1.02)',
                      borderColor: feature.glow,
                      boxShadow: `0 30px 60px ${feature.glow}`,
                      '& .feature-icon': {
                        transform: 'scale(1.1) rotate(5deg)',
                        background: feature.gradient,
                      },
                    },
                  }}
                >
                  <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                    <Box
                      className="feature-icon"
                      sx={{
                        width: { xs: 48, md: 64 },
                        height: { xs: 48, md: 64 },
                        borderRadius: '20px',
                        background: 'rgba(255,255,255,0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 3,
                        transition: 'all 0.4s ease',
                      }}
                    >
                      <feature.icon sx={{ fontSize: { xs: 32, md: 48 }, color: '#fff' }} />
                    </Box>
<Typography fontWeight={700} fontSize={{ xs: '1rem', sm: '1.125rem', md: '1.25rem' }} mb={1.5} sx={{ color: '#fff' }}>
                       {feature.title}
                     </Typography>
                     <Typography sx={{ color: '#94a3b8', fontSize: { xs: '0.8125rem', sm: '0.875rem', md: '0.95rem' }, lineHeight: 1.7 }}>{feature.subtitle}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* How it Works */}
      <Box id="how-it-works" sx={{ py: { xs: 12, md: 20 }, position: 'relative' }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 12 }} data-aos="fade-up">
            <Typography variant="overline" sx={{ color: '#10b981', fontWeight: 600, letterSpacing: '0.15em', fontSize: '0.85rem' }}>
              HOW IT WORKS
            </Typography>
            <Typography variant="h2" sx={{ mt: 2, fontWeight: 800, fontSize: { xs: '2.25rem', md: '3.5rem' }, letterSpacing: '-0.02em', color: '#fff' }}>
              From idea to launch in three steps
            </Typography>
          </Box>

          <Grid container spacing={4}>
            {steps.map((step, idx) => (
              <Grid size={{ xs: 12, md: 4 }} key={idx} data-aos="fade-up" data-aos-delay={idx * 150}>
                <Card
                  sx={{
                    height: '100%',
                    bgcolor: 'rgba(15, 23, 42, 0.4)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '28px',
                    p: 1,
                    position: 'relative',
                    transition: 'all 0.4s ease',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      borderColor: `${step.color}40`,
                      '& .step-number': {
                        background: step.color,
                        color: '#fff',
                      },
                    },
                  }}
                >
                  <CardContent sx={{ p: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 4 }}>
                      <Box
                        className="step-number"
                        sx={{
                          px: 2,
                          py: 0.5,
                          borderRadius: '12px',
                          background: `${step.color}20`,
                          color: step.color,
                          fontWeight: 800,
                          fontSize: '0.875rem',
                          transition: 'all 0.3s ease',
                        }}
                      >
                        {step.number}
                      </Box>
                      <Box
                        sx={{
                          width: 56,
                          height: 56,
                          borderRadius: '18px',
                          background: `linear-gradient(135deg, ${step.color}20 0%, ${step.color}40 100%)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: step.color,
                        }}
                      >
                        <step.icon sx={{ fontSize: 28 }} />
                      </Box>
                    </Box>
<Typography variant="h5" fontWeight={700} mb={2} sx={{ color: '#fff', fontSize: { xs: '1.125rem', sm: '1.25rem', md: '1.5rem' } }}>
                       {step.title}
                     </Typography>
                     <Typography sx={{ color: '#64748b', lineHeight: 1.8, fontSize: { xs: '0.875rem', sm: '0.9375rem', md: '1rem' } }}>{step.description}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Toolkit */}
      <Box id="toolkit" sx={{ py: { xs: 12, md: 20 }, position: 'relative' }}>
        <Box
          sx={{
            position: 'absolute',
            top: '30%',
            right: '-20%',
            width: 800,
            height: 800,
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 60%)',
            filter: 'blur(120px)',
            zIndex: 0,
          }}
        />
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ textAlign: 'center', mb: 12 }} data-aos="fade-up">
            <Typography variant="overline" sx={{ color: '#10b981', fontWeight: 600, letterSpacing: '0.15em', fontSize: '0.85rem' }}>
              TOOLKIT
            </Typography>
            <Typography variant="h2" sx={{ mt: 2, fontWeight: 800, fontSize: { xs: '2.25rem', md: '3.5rem' }, letterSpacing: '-0.02em', color: '#fff' }}>
              Everything founders need
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {tools.map((tool, idx) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={idx} data-aos="fade-up" data-aos-delay={idx * 100}>
                <Card
                  sx={{
                    bgcolor: 'rgba(15, 23, 42, 0.4)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '20px',
                    p: 1,
                    height: '100%',
                    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    '&:hover': {
                      borderColor: 'rgba(16, 185, 129, 0.3)',
                      bgcolor: 'rgba(15, 23, 42, 0.6)',
                      transform: 'translateY(-6px)',
                      '& .tool-icon': {
                        transform: 'scale(1.15) rotate(5deg)',
                        bgcolor: 'rgba(16, 185, 129, 0.2)',
                      },
                    },
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box
                      className="tool-icon"
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: '14px',
                        bgcolor: 'rgba(255,255,255,0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 2.5,
                        transition: 'all 0.3s ease',
                        color: '#10b981',
                      }}
                    >
                      <tool.icon sx={{ fontSize: 24 }} />
                    </Box>
<Typography fontWeight={700} fontSize={{ xs: '0.9375rem', sm: '1rem', md: '1.1rem' }} mb={1} sx={{ color: '#fff' }}>
                       {tool.title}
                     </Typography>
                     <Typography sx={{ color: '#94a3b8', fontSize: { xs: '0.75rem', sm: '0.8125rem', md: '0.9rem' }, lineHeight: 1.7 }}>{tool.desc}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* FAQ */}
      <Box id="faq" sx={{ py: { xs: 12, md: 20 } }}>
        <Container maxWidth="md">
          <Box sx={{ textAlign: 'center', mb: 10 }} data-aos="fade-up">
            <Typography variant="overline" sx={{ color: '#10b981', fontWeight: 600, letterSpacing: '0.15em', fontSize: '0.85rem' }}>
              FAQ
            </Typography>
            <Typography variant="h2" sx={{ mt: 2, fontWeight: 800, fontSize: { xs: '2.25rem', md: '3.5rem' }, letterSpacing: '-0.02em', color: '#fff' }}>
              Common questions
            </Typography>
          </Box>

          <Box>
            {faqs.map((faq, idx) => (
              <Accordion
                key={idx}
                data-aos="fade-up"
                data-aos-delay={idx * 100}
                sx={{
                  mb: 2,
                  bgcolor: 'rgba(15, 23, 42, 0.4)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '20px !important',
                  overflow: 'hidden',
                  '&:before': { display: 'none' },
                  transition: 'all 0.3s ease',
                  '&.Mui-expanded': {
                    borderColor: 'rgba(16, 185, 129, 0.2)',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                  },
                }}
              >
                <AccordionSummary expandIcon={<ExpandMore sx={{ color: '#94a3b8' }} />}>
                  <Typography fontWeight={600} fontSize="1.05rem" sx={{ color: '#fff' }}>{faq.question}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography sx={{ color: '#94a3b8', lineHeight: 1.8 }}>{faq.answer}</Typography>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        </Container>
      </Box>

      {/* CTA */}
      <Box sx={{ py: { xs: 12, md: 20 }, position: 'relative' }}>
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at center, rgba(16, 185, 129, 0.1) 0%, transparent 70%)',
          }}
        />
        <Container maxWidth="md" sx={{ position: 'relative', textAlign: 'center' }} data-aos="zoom-in">
          <Box
            sx={{
              p: { xs: 4, md: 8 },
              borderRadius: '32px',
              bgcolor: 'rgba(15, 23, 42, 0.4)',
              backdropFilter: 'blur(30px)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 0 100px rgba(16, 185, 129, 0.1)',
            }}
          >
<Typography variant="h2" fontWeight={800} sx={{ mb: 3, fontSize: { xs: '1.5rem', sm: '2rem', md: '3rem' }, letterSpacing: '-0.02em', color: '#fff' }}>
               Ready to launch your startup?
             </Typography>
            <Typography variant="h6" sx={{ color: '#94a3b8', mb: 5, maxWidth: 500, mx: 'auto' }}>
              Join thousands of founders building their dreams with VentureMate. Start free today.
            </Typography>
            <GradientButton onClick={() => navigate('/signup')} variant="primary" size="lg" sx={{ width: { xs: '100%', md: 'auto' } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Get Started
                <ArrowForward sx={{ fontSize: 18 }} />
              </Box>
            </GradientButton>
          </Box>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ py: 8, bgcolor: 'rgba(10, 10, 15, 0.5)', borderTop: '1px solid rgba(255,255,255,0.08)', position: 'relative', backdropFilter: 'blur(10px)' }}>
        <Container maxWidth="lg">
          <Grid container spacing={6}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Box component="img" src="/ventureMate-logo2.png" alt="VentureMate" sx={{ height: 80, width: 'auto', objectFit: 'contain' }} />
              </Box>
              <Typography sx={{ color: '#64748b', fontSize: '0.95rem', maxWidth: 300, lineHeight: 1.8 }}>
                The all-in-one digital launchpad for the modern founder. Build, launch, and grow your startup with AI-powered tools.
              </Typography>
            </Grid>

            <Grid size={{ xs: 6, md: 2 }}>
              <Typography fontWeight={700} mb={3} fontSize="0.9rem" sx={{ color: '#94a3b8' }}>
                PRODUCT
              </Typography>
              <Stack spacing={2}>
                {['How it Works', 'Toolkit', 'Pricing', 'Changelog'].map((item) => (
                  <Typography
                    key={item}
                    sx={{ color: '#64748b', fontSize: '0.9rem', cursor: 'pointer', transition: 'color 0.2s', '&:hover': { color: '#10b981' } }}
                  >
                    {item}
                  </Typography>
                ))}
              </Stack>
            </Grid>

            <Grid size={{ xs: 6, md: 2 }}>
              <Typography fontWeight={700} mb={3} fontSize="0.9rem" sx={{ color: '#94a3b8' }}>
                COMPANY
              </Typography>
              <Stack spacing={2}>
                {['About Us', 'Blog', 'Careers', 'Contact'].map((item) => (
                  <Typography
                    key={item}
                    sx={{ color: '#64748b', fontSize: '0.9rem', cursor: 'pointer', transition: 'color 0.2s', '&:hover': { color: '#10b981' } }}
                  >
                    {item}
                  </Typography>
                ))}
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Typography fontWeight={700} mb={3} fontSize="0.9rem" sx={{ color: '#94a3b8' }}>
                STAY UPDATED
              </Typography>
              <Typography sx={{ color: '#64748b', fontSize: '0.9rem', mb: 3, lineHeight: 1.7 }}>
                Get the latest updates on new features, funding tips, and founder stories.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Box
                  component="input"
                  placeholder="Enter your email"
                  sx={{
                    flex: 1,
                    px: 3,
                    py: 1.25,
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    bgcolor: 'rgba(255,255,255,0.03)',
                    color: '#fff',
                    fontSize: '0.9rem',
                    outline: 'none',
                    width: { xs: '100%', sm: 'auto' },
                    '&:focus': { borderColor: 'rgba(16, 185, 129, 0.5)' },
                    '&::placeholder': { color: '#64748b' },
                  }}
                />
                <GradientButton variant="primary" size="md" sx={{ width: { xs: '100%', sm: 'auto' } }}>
                  Subscribe
                </GradientButton>
              </Stack>
            </Grid>
          </Grid>

          <Divider sx={{ my: 6, borderColor: 'rgba(255,255,255,0.05)' }} />

          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <Box sx={{ display: 'flex', gap: 4 }}>
              <Link component={RouterLink} to="/termsofservice" underline="none" sx={{ color: '#64748b', fontSize: '0.875rem', cursor: 'pointer', '&:hover': { color: '#10b981' } }}>Terms</Link>
              <Link component={RouterLink} to="/policy" underline="none" sx={{ color: '#64748b', fontSize: '0.875rem', cursor: 'pointer', '&:hover': { color: '#10b981' } }}>Privacy</Link>
              <Link component={RouterLink} to="/policy" underline="none" sx={{ color: '#64748b', fontSize: '0.875rem', cursor: 'pointer', '&:hover': { color: '#10b981' } }}>Cookies</Link>
            </Box>
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              &copy; {new Date().getFullYear()} VentureMate. All rights reserved.
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
