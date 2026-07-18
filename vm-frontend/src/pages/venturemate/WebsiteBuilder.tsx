import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Card, Chip, CircularProgress, Link, Typography } from '@mui/material';
import { Code2, ExternalLink, Eye, FileCode, GitBranch, Globe2, MonitorSmartphone, Terminal, UploadCloud, XCircle } from 'lucide-react';
import { AICreationStudio, type ProposedChange } from '../../components/venturemate/AICreationStudio';
import { NoBusinessSelected } from '../../components/venturemate/NoBusinessSelected';
import { useBusiness } from '../../contexts/BusinessContext';
import { graphqlRequest } from '../../lib/api';
import { PageHeader } from '../../components/shared';
import type { ViewType } from '../../types/venturemate';

interface WebsiteRecord {
  id: string;
  businessId: string;
  templateId?: string;
  subdomain?: string;
  customDomain?: string;
  pages: string;
  globalStyles: string;
  navigation: string;
  footer: string;
  status: string;
  publishedAt?: string;
  lastModified: string;
  publicUrl?: string;
  draftRevision: number;
  publishedRevision: number;
  hasUnpublishedChanges: boolean;
  customDomainStatus: string;
}

interface WebsiteDraft {
  templateId?: string;
  subdomain?: string;
  customDomain?: string;
  pages?: WebsitePage[];
  globalStyles?: Record<string, string>;
  navigation?: { items?: Array<{ label: string; href: string }> };
  footer?: Record<string, unknown>;
}

interface WebsitePage {
  id?: string;
  slug?: string;
  title?: string;
  metaDescription?: string;
  isHome?: boolean;
  sections?: WebsiteSection[];
}

interface WebsiteSection {
  id?: string;
  type?: string;
  content?: Record<string, unknown>;
  props?: Record<string, unknown>;
  visible?: boolean;
}

const WEBSITE_QUERY = `
  query MyWebsite($businessId: ID!) {
    myWebsite(businessId: $businessId) {
      id businessId templateId subdomain customDomain pages globalStyles navigation footer status
      publishedAt lastModified publicUrl draftRevision publishedRevision hasUnpublishedChanges customDomainStatus
    }
  }
`;

const PUBLISH_WEBSITE_MUTATION = `
  mutation PublishWebsite($id: ID!, $businessId: ID!) {
    publishWebsite(id: $id, businessId: $businessId) {
      id status publishedAt publicUrl publishedRevision hasUnpublishedChanges
    }
  }
`;

const UNPUBLISH_WEBSITE_MUTATION = `
  mutation UnpublishWebsite($id: ID!, $businessId: ID!) {
    unpublishWebsite(id: $id, businessId: $businessId) {
      id status publishedAt publicUrl publishedRevision hasUnpublishedChanges
    }
  }
`;

function safeJson<T>(value: string | undefined, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

function proposalDraft(change: ProposedChange): WebsiteDraft | null {
  try { return JSON.parse(change.newValue) as WebsiteDraft; } catch { return null; }
}

function text(content: Record<string, unknown> | undefined, ...keys: string[]) {
  for (const key of keys) {
    const value = content?.[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return '';
}

function renderFeatures(content: Record<string, unknown>, primary: string) {
  const features = (Array.isArray(content.features) ? content.features : []) as Array<Record<string, unknown>>;
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)' }, gap: { xs: 1, sm: 1.5 }, mt: 1.5 }}>
      {features.slice(0, 6).map((f, i) => (
        <Box key={i} sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2, bgcolor: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)', transition: 'all .2s', '&:hover': { bgcolor: 'rgba(255,255,255,.06)', transform: 'translateY(-2px)' } }}>
          {String(f.icon || '') && <Box sx={{ width: 32, height: 32, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: `${primary}20`, mb: 1, fontSize: 16 }}>✦</Box>}
          <Typography sx={{ color: 'white', fontWeight: 800, fontSize: { xs: 13, sm: 14 }, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{String(f.title || '')}</Typography>
          <Typography sx={{ color: 'rgba(255,255,255,.6)', fontSize: { xs: 11, sm: 12 }, mt: 0.5, lineHeight: 1.6, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{String(f.description || '')}</Typography>
        </Box>
      ))}
      {!features.length && <Typography sx={{ color: 'rgba(255,255,255,.4)', fontSize: 12 }}>{String(content.subtitle || '')}</Typography>}
    </Box>
  );
}

function renderTestimonials(content: Record<string, unknown>, primary: string) {
  const items = (Array.isArray(content.testimonials) ? content.testimonials : []) as Array<Record<string, unknown>>;
  if (!items.length) return null;
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)' }, gap: { xs: 1, sm: 1.5 } }}>
      {items.slice(0, 6).map((t, i) => (
        <Box key={i} sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2, bgcolor: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
          <Box sx={{ color: primary, fontSize: 18, lineHeight: 1, mb: 0.5 }}>“</Box>
          <Typography sx={{ color: 'rgba(255,255,255,.7)', fontSize: { xs: 11, sm: 12 }, lineHeight: 1.7, fontStyle: 'italic', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{String(t.quote || t.content || '')}</Typography>
          <Box sx={{ mt: 1.5, borderTop: '1px solid rgba(255,255,255,.06)', pt: 1 }}>
            <Typography sx={{ color: 'white', fontWeight: 700, fontSize: 12, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{String(t.author || t.name || '')}</Typography>
            <Typography sx={{ color: 'rgba(255,255,255,.4)', fontSize: 10, overflowWrap: 'anywhere' }}>{String(t.role || '')}</Typography>
          </Box>
        </Box>
      ))}
    </Box>
  );
}

function renderPricing(content: Record<string, unknown>, primary: string) {
  const items = (Array.isArray(content.items) ? content.items : []) as Array<Record<string, unknown>>;
  if (!items.length) return null;
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)' }, gap: { xs: 1, sm: 1.5 }, mt: 1.5 }}>
      {items.slice(0, 6).map((p, i) => (
        <Box key={i} sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2, bgcolor: i === 1 ? `${primary}10` : 'rgba(255,255,255,.03)', border: i === 1 ? `1px solid ${primary}40` : '1px solid rgba(255,255,255,.06)', position: 'relative' }}>
          {i === 1 && <Box sx={{ position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)', px: 1.5, py: 0.25, bgcolor: primary, color: '#fff', fontSize: 9, fontWeight: 700, borderRadius: '0 0 6px 6px', textTransform: 'uppercase' }}>Popular</Box>}
          <Typography sx={{ color: 'white', fontWeight: 800, fontSize: 15, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{String(p.name || '')}</Typography>
          <Typography sx={{ color: 'rgba(255,255,255,.5)', fontSize: 11, mt: 0.25, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{String(p.description || '')}</Typography>
          <Typography sx={{ color: 'white', fontSize: { xs: 22, sm: 28 }, fontWeight: 900, mt: 1 }}>{String(p.price || '')}</Typography>
          {Array.isArray(p.features) && (
            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {p.features.slice(0, 5).map((f: any, fi: number) => (
                <Typography key={fi} sx={{ color: 'rgba(255,255,255,.7)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 0.5, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                  <Box component="span" sx={{ color: '#22c55e' }}>✓</Box> {String(f)}
                </Typography>
              ))}
            </Box>
          )}
          <Box sx={{ mt: 1.5, px: 2, py: 0.75, borderRadius: 1.5, bgcolor: primary, color: '#fff', fontWeight: 700, fontSize: 11, textAlign: 'center', cursor: 'default', display: String(p.cta || '') ? 'block' : 'none' }}>{String(p.cta || '')}</Box>
        </Box>
      ))}
    </Box>
  );
}

function renderTeam(content: Record<string, unknown>, primary: string) {
  const items = (Array.isArray(content.items) ? content.items : []) as Array<Record<string, unknown>>;
  if (!items.length) return null;
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)' }, gap: { xs: 1, sm: 1.5 } }}>
      {items.slice(0, 6).map((t, i) => (
        <Box key={i} sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2, bgcolor: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)', textAlign: 'center' }}>
          <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: `${primary}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1, color: primary, fontSize: 16, fontWeight: 700 }}>
            {String(String(t.name || '?')[0] || '?').toUpperCase()}
          </Box>
          <Typography sx={{ color: 'white', fontWeight: 700, fontSize: 13, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{String(t.name || '')}</Typography>
          <Typography sx={{ color: 'rgba(255,255,255,.4)', fontSize: 11, overflowWrap: 'anywhere' }}>{String(t.role || '')}</Typography>
          <Typography sx={{ color: 'rgba(255,255,255,.55)', fontSize: 11, mt: 0.5, lineHeight: 1.5, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{String(t.bio || '')}</Typography>
        </Box>
      ))}
    </Box>
  );
}

function renderFAQ(content: Record<string, unknown>) {
  const items = (Array.isArray(content.items) ? content.items : []) as Array<Record<string, unknown>>;
  if (!items.length) return null;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
      {items.slice(0, 8).map((f, i) => (
        <Box key={i} sx={{ p: { xs: 1.25, sm: 1.5 }, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)' }}>
          <Typography sx={{ color: 'white', fontWeight: 700, fontSize: 13, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{String(f.question || '')}</Typography>
          <Typography sx={{ color: 'rgba(255,255,255,.6)', fontSize: 12, mt: 0.5, lineHeight: 1.6, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{String(f.answer || '')}</Typography>
        </Box>
      ))}
    </Box>
  );
}

function renderStats(content: Record<string, unknown>, primary: string) {
  const stats = (Array.isArray(content.stats) ? content.stats : []) as Array<Record<string, unknown>>;
  if (!stats.length) return null;
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', md: 'repeat(4,1fr)' }, gap: { xs: 1, sm: 1.5 }, mt: 1.5 }}>
      {stats.slice(0, 8).map((s, i) => (
        <Box key={i} sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2, bgcolor: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)', textAlign: 'center' }}>
          <Typography sx={{ color: primary, fontSize: { xs: 22, sm: 30 }, fontWeight: 900, overflowWrap: 'anywhere' }}>{String(s.value || '')}</Typography>
          <Typography sx={{ color: 'rgba(255,255,255,.6)', fontSize: 11, mt: 0.25, overflowWrap: 'anywhere' }}>{String(s.label || '')}</Typography>
        </Box>
      ))}
    </Box>
  );
}

function renderCarousel(content: Record<string, unknown>, primary: string) {
  const items = (Array.isArray(content.items) ? content.items : (Array.isArray(content.slides) ? content.slides : [])) as Array<Record<string, unknown>>;
  if (!items.length) return null;
  return (
    <Box sx={{ mt: 1.5, display: 'flex', gap: 1.25, overflowX: 'auto', pb: 1, scrollSnapType: 'x mandatory', '&::-webkit-scrollbar': { height: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: `${primary}40`, borderRadius: 2 } }}>
      {items.slice(0, 8).map((item, i) => (
        <Box key={i} sx={{ minWidth: { xs: '80%', sm: 320 }, scrollSnapAlign: 'start', p: { xs: 1.5, sm: 2 }, borderRadius: 2, bgcolor: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
          {item.image !== undefined && <Box component="img" src={String(item.image)} alt="" sx={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: 1, mb: 1 }} />}
          <Typography sx={{ color: 'white', fontWeight: 700, fontSize: 14, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{String(item.title || '')}</Typography>
          <Typography sx={{ color: 'rgba(255,255,255,.6)', fontSize: 12, mt: 0.5, lineHeight: 1.6, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{String(item.description || item.content || '')}</Typography>
          <Typography sx={{ color: primary, fontSize: 11, fontWeight: 700, mt: 0.75, cursor: 'default', display: item.cta !== undefined ? 'block' : 'none' }}>{String(item.cta || '')} →</Typography>
        </Box>
      ))}
    </Box>
  );
}

function SectionLabel({ label, color }: { label: string; color: string }) {
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.35, borderRadius: 1, bgcolor: `${color}15`, mb: 1.5 }}>
      <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: color }} />
      <Typography sx={{ color, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</Typography>
    </Box>
  );
}

function SitePreview({ draft, businessName, tagline, logo, proposed = false }: { draft: WebsiteDraft; businessName: string; tagline: string; logo?: string; proposed?: boolean }) {
  const styles = draft.globalStyles || {};
  const primary = styles.primaryColor || '#0ea5e9';
  const dark = styles.darkColor || '#0f172a';
  const fontBody = styles.fontBody || 'Inter';
  const page = draft.pages?.find(item => item.isHome || item.slug === '/') || draft.pages?.[0];
  const sections = (page?.sections || []).filter(s => s.visible !== false);

  return (
    <Box sx={{
      border: proposed ? '1px solid var(--vm-primary-500)' : '1px solid var(--vm-border-subtle)',
      borderRadius: 3, overflow: 'hidden',
      fontFamily: `'${fontBody}', sans-serif`,
    }}>
      {/* Navigation */}
      <Box sx={{
        px: { xs: 2, sm: 4 }, py: { xs: 1.5, sm: 2 },
        display: 'flex', alignItems: 'center', gap: 2,
        bgcolor: dark,
        borderBottom: '1px solid rgba(255,255,255,.06)',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {logo ? <Box component="img" src={logo} sx={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 0.5 }} /> : <Box sx={{ width: 28, height: 28, borderRadius: 0.5, bgcolor: primary }} />}
          <Typography sx={{ color: 'white', fontWeight: 800, fontSize: 14, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{businessName}</Typography>
        </Box>
        <Box sx={{ flex: 1 }} />
        <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 2 }}>
          {(draft.navigation?.items || []).slice(0, 5).map(item => (
            <Typography key={`${item.label}-${item.href}`} sx={{ color: 'rgba(255,255,255,.65)', fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', cursor: 'default', '&:hover': { color: primary } }}>{item.label}</Typography>
          ))}
        </Box>
      </Box>

      {/* Sections */}
      {sections.length === 0 ? (
        <Box sx={{ minHeight: 360, display: 'grid', placeItems: 'center', p: 3, background: `radial-gradient(circle at 75% 20%, ${primary}55, transparent 30%), linear-gradient(135deg, ${dark}, #07130f)` }}>
          <Box sx={{ textAlign: 'center', maxWidth: 650 }}>
            <Typography sx={{ color: 'white', fontSize: { xs: 28, sm: 42 }, fontWeight: 950, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{tagline || businessName}</Typography>
            <Typography sx={{ color: 'rgba(255,255,255,.7)', mt: 1 }}>AI generates the full page structure here.</Typography>
          </Box>
        </Box>
      ) : sections.map((section, index) => {
        const content = section.props || section.content || {};
        const heading = text(content, 'headline', 'title', 'heading');
        const body = text(content, 'subheadline', 'body', 'description', 'text');
        const isAlt = index % 2 === 1;
        const bg = isAlt ? `${dark}88` : '#07130f';
        const renderChildren = () => {
          switch (section.type) {
            case 'hero':
              return (
                <Box sx={{
                  minHeight: { xs: 320, sm: 420 }, p: { xs: 3, sm: 6 },
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                  background: `radial-gradient(ellipse at 50% 30%, ${primary}30, transparent 60%), radial-gradient(circle at 80% 80%, ${primary}15, transparent 40%), linear-gradient(135deg, ${dark}, #07130f)`,
                  position: 'relative', overflow: 'hidden',
                  '&::before': { content: '""', position: 'absolute', inset: 0, background: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,.03), transparent 50%)', pointerEvents: 'none' },
                }}>
                  <Box sx={{ maxWidth: 720, position: 'relative', zIndex: 1 }}>
                    {logo && <Box component="img" src={logo} alt="" sx={{ width: { xs: 56, sm: 72 }, height: { xs: 56, sm: 72 }, objectFit: 'contain', mb: { xs: 1.5, sm: 2.5 }, mx: 'auto', display: 'block' }} />}
                    <Typography sx={{ color: 'white', fontSize: { xs: 28, sm: 42, md: 52 }, fontWeight: 950, lineHeight: 1.05, letterSpacing: '-.02em', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{heading || businessName}</Typography>
                    {body && <Typography sx={{ color: 'rgba(255,255,255,.7)', fontSize: { xs: 14, sm: 17 }, lineHeight: 1.7, mt: { xs: 1.5, sm: 2 }, maxWidth: 580, mx: 'auto', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{body}</Typography>}
                    <Box sx={{ mt: { xs: 2, sm: 3 }, display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
                      <Box sx={{ px: { xs: 2, sm: 3 }, py: { xs: 0.75, sm: 1 }, borderRadius: 999, bgcolor: primary, color: '#fff', fontWeight: 800, fontSize: { xs: 12, sm: 13 } }}>{text(content, 'primaryCta', 'cta') || 'Get Started'}</Box>
                      {text(content, 'secondaryCta') && <Box sx={{ px: { xs: 2, sm: 3 }, py: { xs: 0.75, sm: 1 }, borderRadius: 999, border: '1px solid rgba(255,255,255,.2)', color: 'rgba(255,255,255,.7)', fontWeight: 600, fontSize: { xs: 12, sm: 13 } }}>{text(content, 'secondaryCta')}</Box>}
                    </Box>
                  </Box>
                </Box>
              );
            case 'features':
              return (
                <Box sx={{ px: { xs: 2, sm: 4 }, py: { xs: 2.5, sm: 4 } }}>
                  <SectionLabel label="Features" color={primary} />
                  {heading && <Typography sx={{ color: 'white', fontSize: { xs: 20, sm: 30 }, fontWeight: 900, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{heading}</Typography>}
                  {body && <Typography sx={{ color: 'rgba(255,255,255,.6)', fontSize: 13, mt: 0.75, maxWidth: 600, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{body}</Typography>}
                  {renderFeatures(content, primary)}
                </Box>
              );
            case 'testimonials':
              return (
                <Box sx={{ px: { xs: 2, sm: 4 }, py: { xs: 2.5, sm: 4 } }}>
                  <SectionLabel label="Testimonials" color={primary} />
                  {heading && <Typography sx={{ color: 'white', fontSize: { xs: 20, sm: 30 }, fontWeight: 900, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{heading}</Typography>}
                  {body && <Typography sx={{ color: 'rgba(255,255,255,.6)', fontSize: 13, mt: 0.75, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{body}</Typography>}
                  {renderTestimonials(content, primary)}
                </Box>
              );
            case 'pricing':
              return (
                <Box sx={{ px: { xs: 2, sm: 4 }, py: { xs: 2.5, sm: 4 } }}>
                  <SectionLabel label="Pricing" color={primary} />
                  {heading && <Typography sx={{ color: 'white', fontSize: { xs: 20, sm: 30 }, fontWeight: 900, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{heading}</Typography>}
                  {body && <Typography sx={{ color: 'rgba(255,255,255,.6)', fontSize: 13, mt: 0.75, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{body}</Typography>}
                  {renderPricing(content, primary)}
                </Box>
              );
            case 'team':
              return (
                <Box sx={{ px: { xs: 2, sm: 4 }, py: { xs: 2.5, sm: 4 } }}>
                  <SectionLabel label="Team" color={primary} />
                  {heading && <Typography sx={{ color: 'white', fontSize: { xs: 20, sm: 30 }, fontWeight: 900, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{heading}</Typography>}
                  {body && <Typography sx={{ color: 'rgba(255,255,255,.6)', fontSize: 13, mt: 0.75, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{body}</Typography>}
                  {renderTeam(content, primary)}
                </Box>
              );
            case 'stats':
              return (
                <Box sx={{ px: { xs: 2, sm: 4 }, py: { xs: 2.5, sm: 4 } }}>
                  <SectionLabel label="Stats" color={primary} />
                  {heading && <Typography sx={{ color: 'white', fontSize: { xs: 20, sm: 30 }, fontWeight: 900, textAlign: 'center', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{heading}</Typography>}
                  {renderStats(content, primary)}
                </Box>
              );
            case 'faq':
              return (
                <Box sx={{ px: { xs: 2, sm: 4 }, py: { xs: 2.5, sm: 4 } }}>
                  <SectionLabel label="FAQ" color={primary} />
                  {heading && <Typography sx={{ color: 'white', fontSize: { xs: 20, sm: 30 }, fontWeight: 900, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{heading}</Typography>}
                  {renderFAQ(content)}
                </Box>
              );
            case 'carousel':
              return (
                <Box sx={{ px: { xs: 2, sm: 4 }, py: { xs: 2.5, sm: 4 } }}>
                  <SectionLabel label="Highlights" color={primary} />
                  {heading && <Typography sx={{ color: 'white', fontSize: { xs: 20, sm: 30 }, fontWeight: 900, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{heading}</Typography>}
                  {body && <Typography sx={{ color: 'rgba(255,255,255,.6)', fontSize: 13, mt: 0.75, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{body}</Typography>}
                  {renderCarousel(content, primary)}
                </Box>
              );
            case 'contact':
              return (
                <Box sx={{ px: { xs: 2, sm: 4 }, py: { xs: 2.5, sm: 4 } }}>
                  <SectionLabel label="Contact" color={primary} />
                  {heading && <Typography sx={{ color: 'white', fontSize: { xs: 20, sm: 30 }, fontWeight: 900, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{heading}</Typography>}
                  {body && <Typography sx={{ color: 'rgba(255,255,255,.6)', fontSize: 13, mt: 0.75, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{body}</Typography>}
                  <Box sx={{ mt: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Box sx={{ px: 2.5, py: 0.75, borderRadius: 999, bgcolor: primary, color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'default' }}>Send Message</Box>
                  </Box>
                </Box>
              );
            case 'cta':
              return (
                <Box sx={{ px: { xs: 2, sm: 4 }, py: { xs: 3, sm: 5 }, textAlign: 'center', background: `linear-gradient(135deg, ${dark}, ${primary}22)` }}>
                  {heading && <Typography sx={{ color: 'white', fontSize: { xs: 22, sm: 34 }, fontWeight: 900, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{heading}</Typography>}
                  {body && <Typography sx={{ color: 'rgba(255,255,255,.6)', fontSize: 14, mt: 1, maxWidth: 520, mx: 'auto', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{body}</Typography>}
                  <Box sx={{ mt: 2, display: 'inline-flex', px: 3, py: 1, borderRadius: 999, bgcolor: primary, color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'default' }}>{text(content, 'cta') || 'Get Started'}</Box>
                </Box>
              );
            case 'about':
            case 'about-us':
              return (
                <Box sx={{ px: { xs: 2, sm: 4 }, py: { xs: 2.5, sm: 4 } }}>
                  <SectionLabel label="About" color={primary} />
                  {heading && <Typography sx={{ color: 'white', fontSize: { xs: 20, sm: 30 }, fontWeight: 900, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{heading}</Typography>}
                  <Typography sx={{ color: 'rgba(255,255,255,.65)', fontSize: { xs: 13, sm: 14 }, mt: 1.5, lineHeight: 1.8, maxWidth: 720, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{content.content ? String(content.content) : body}</Typography>
                </Box>
              );
            default:
              return (
                <Box sx={{ px: { xs: 2, sm: 4 }, py: { xs: 2.5, sm: 4 } }}>
                  {section.type && <SectionLabel label={section.type} color={primary} />}
                  {heading && <Typography sx={{ color: 'white', fontSize: { xs: 20, sm: 30 }, fontWeight: 900, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{heading}</Typography>}
                  {body && <Typography sx={{ color: 'rgba(255,255,255,.65)', fontSize: 13, lineHeight: 1.7, mt: 1, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{body}</Typography>}
                </Box>
              );
          }
        };
        return (
          <Box key={section.id || index} sx={{ bgcolor: bg }}>
            {renderChildren()}
          </Box>
        );
      })}

      {/* Footer */}
      <Box sx={{ p: { xs: 2, sm: 3 }, textAlign: 'center', bgcolor: dark, borderTop: '1px solid rgba(255,255,255,.06)' }}>
        <Typography sx={{ color: 'rgba(255,255,255,.4)', fontSize: 11 }}>
          {typeof draft.footer?.customText === 'string' ? draft.footer.customText : `© ${new Date().getFullYear()} ${businessName}`}
        </Typography>
      </Box>
    </Box>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function WebsiteBuilder(_props: { onViewChange?: (_view: ViewType) => void }) {
  const { selectedBusiness } = useBusiness();
  const [website, setWebsite] = useState<WebsiteRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);

  const loadWebsite = useCallback(async () => {
    if (!selectedBusiness) return;
    setLoading(true);
    setError(null);
    try {
      const data = await graphqlRequest<{ myWebsite: WebsiteRecord | null }>(WEBSITE_QUERY, { businessId: selectedBusiness.id });
      setWebsite(data.myWebsite || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the website draft.');
    } finally {
      setLoading(false);
    }
  }, [selectedBusiness]);

  const handlePublish = useCallback(async () => {
    if (!website || !selectedBusiness) return;
    setPublishing(true);
    setError(null);
    try {
      const data = await graphqlRequest<{ publishWebsite: WebsiteRecord }>(PUBLISH_WEBSITE_MUTATION, { id: website.id, businessId: selectedBusiness.id });
      setWebsite(data.publishWebsite);
      void loadWebsite();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish website.');
    } finally {
      setPublishing(false);
    }
  }, [website, selectedBusiness, loadWebsite]);

  const handleUnpublish = useCallback(async () => {
    if (!website || !selectedBusiness) return;
    setUnpublishing(true);
    setError(null);
    try {
      const data = await graphqlRequest<{ unpublishWebsite: WebsiteRecord }>(UNPUBLISH_WEBSITE_MUTATION, { id: website.id, businessId: selectedBusiness.id });
      setWebsite(data.unpublishWebsite);
      void loadWebsite();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unpublish website.');
    } finally {
      setUnpublishing(false);
    }
  }, [website, selectedBusiness, loadWebsite]);

  useEffect(() => { void loadWebsite(); }, [loadWebsite]);

  useEffect(() => {
    const handleAIChange = (event: Event) => {
      const detail = (event as CustomEvent<{ businessId?: string; domain?: string }>).detail;
      if (detail?.businessId === selectedBusiness?.id && (detail.domain === 'website' || detail.domain === 'website-builder')) {
        void loadWebsite();
      }
    };
    window.addEventListener('venturemate:ai-data-changed', handleAIChange);
    return () => window.removeEventListener('venturemate:ai-data-changed', handleAIChange);
  }, [loadWebsite, selectedBusiness?.id]);

  const savedDraft = useMemo<WebsiteDraft | null>(() => website ? ({
    templateId: website.templateId,
    subdomain: website.subdomain,
    customDomain: website.customDomain,
    pages: safeJson<WebsitePage[]>(website.pages, []),
    globalStyles: safeJson<Record<string, string>>(website.globalStyles, {}),
    navigation: safeJson<WebsiteDraft['navigation']>(website.navigation, {}),
    footer: safeJson<Record<string, unknown>>(website.footer, {}),
  }) : null, [website]);

  const logo = selectedBusiness?.brandKit?.logo;
  const [codeTab, setCodeTab] = useState<'preview' | 'code'>('preview');
  const [codeResult, setCodeResult] = useState<{ files: Array<{ path: string; content: string }>; type: string; routes: string[] } | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [deployLoading, setDeployLoading] = useState<'github' | 'netlify' | null>(null);
  const [deployResult, setDeployResult] = useState<{ platform: string; url: string; success: boolean; message: string } | null>(null);

  const handleGenerateCode = useCallback(async (draft: WebsiteDraft) => {
    if (!selectedBusiness) return;
    setCodeLoading(true);
    setDeployResult(null);
    setCodeTab('code');
    try {
      const data = await graphqlRequest<{ generateWebsiteCode: { files: Array<{ path: string; content: string }>; type: string; routes: string[] } }>(
        `mutation GenCode($businessId: ID!, $businessName: String!, $websiteDraft: String!) {
          generateWebsiteCode(businessId: $businessId, businessName: $businessName, websiteDraft: $websiteDraft) {
            files { path content } type routes
          }
        }`,
        { businessId: selectedBusiness.id, businessName: selectedBusiness.name, websiteDraft: JSON.stringify(draft) }
      );
      setCodeResult(data.generateWebsiteCode);
      if (data.generateWebsiteCode.files.length > 0) setSelectedFile(data.generateWebsiteCode.files[0].path);
    } catch (err) {
      setDeployResult({ platform: '', url: '', success: false, message: err instanceof Error ? err.message : 'Code generation failed' });
    } finally {
      setCodeLoading(false);
    }
  }, [selectedBusiness]);

  const handleDeploy = useCallback(async (platform: 'github' | 'netlify') => {
    if (!selectedBusiness || !savedDraft) return;
    setDeployLoading(platform);
    setDeployResult(null);
    try {
      const data = await graphqlRequest<{ deployWebsite: { platform: string; url: string; success: boolean; message: string; repoName?: string; siteName?: string } }>(
        `mutation DeploySite($businessId: ID!, $businessName: String!, $websiteDraft: String!, $platform: String!) {
          deployWebsite(businessId: $businessId, businessName: $businessName, websiteDraft: $websiteDraft, platform: $platform) {
            platform url success message repoName siteName
          }
        }`,
        { businessId: selectedBusiness.id, businessName: selectedBusiness.name, websiteDraft: JSON.stringify(savedDraft), platform }
      );
      setDeployResult(data.deployWebsite);
    } catch (err) {
      setDeployResult({ platform, url: '', success: false, message: err instanceof Error ? err.message : 'Deploy failed' });
    } finally {
      setDeployLoading(null);
    }
  }, [selectedBusiness, savedDraft]);

  if (!selectedBusiness) return <NoBusinessSelected message="Select a business to generate and host its website with AI." />;

  return (
    <Box sx={{ p: { xs: 1.25, sm: 2, md: 3 } }}>
      <PageHeader
        icon={<MonitorSmartphone size={18} />}
        title="Website Builder"
        subtitle="AI builds, you approve — no code required"
        businessName={selectedBusiness.name}
        chips={
          <>
            {website && <Chip label={`Draft v${website.draftRevision}`} size="small" variant="outlined" />}
            {website?.status === 'published' && <Chip label={`Live v${website.publishedRevision}`} size="small" color="success" />}
            {savedDraft && (
              <Button size="small" variant={codeTab === 'preview' ? 'contained' : 'outlined'} onClick={() => setCodeTab('preview')} startIcon={<Eye size={13} />} sx={{ textTransform: 'none', fontSize: 11 }}>Preview</Button>
            )}
            {savedDraft && (
              <Button size="small" variant={codeTab === 'code' ? 'contained' : 'outlined'} onClick={() => { if (codeTab === 'code') setCodeTab('preview'); else { setCodeTab('code'); handleGenerateCode(savedDraft); } }} startIcon={codeLoading ? <CircularProgress size={13} /> : <Code2 size={13} />} disabled={codeLoading} sx={{ textTransform: 'none', fontSize: 11 }}>Code</Button>
            )}
          </>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && !website && <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}><CircularProgress size={18} /><Typography sx={{ color: 'var(--vm-text-muted)' }}>Loading website…</Typography></Box>}

      {website && codeTab === 'preview' && (
        <Card sx={{ mb: 2.5, p: 1.5, bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
            <Box>
              <Typography sx={{ color: 'var(--vm-text-primary)', fontSize: 13, fontWeight: 900 }}>Hosting & publication</Typography>
              <Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 11, mt: 0.25, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                {website.status === 'published' ? 'Your website is live at the address above.' : 'Review the draft below, then press Publish when you are ready to go live.'}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', maxWidth: '100%', alignItems: 'center' }}>
              {website.subdomain && <Chip icon={<Globe2 size={13} />} label={`${website.subdomain}.venturemate.net`} size="small" variant="outlined" sx={{ maxWidth: '100%', '& .MuiChip-label': { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', py: 0.5, overflowWrap: 'anywhere' } }} />}
              {website.hasUnpublishedChanges && <Chip label="Unpublished changes" size="small" color="warning" />}
              {website.publicUrl && (
                <Link href={website.publicUrl} target="_blank" rel="noreferrer" underline="none">
                  <Chip icon={<ExternalLink size={13} />} label="Open live site" size="small" color="success" clickable />
                </Link>
              )}
              {website.status !== 'published' ? (
                <Button size="small" variant="contained" startIcon={publishing ? <CircularProgress size={13} /> : <UploadCloud size={14} />} disabled={publishing || !website.subdomain} onClick={handlePublish} sx={{ whiteSpace: 'nowrap', textTransform: 'none' }}>
                  {publishing ? 'Publishing…' : 'Publish'}
                </Button>
              ) : (
                <Button size="small" variant="outlined" color="error" startIcon={unpublishing ? <CircularProgress size={13} /> : <XCircle size={14} />} disabled={unpublishing} onClick={handleUnpublish} sx={{ whiteSpace: 'nowrap', textTransform: 'none' }}>
                  {unpublishing ? 'Unpublishing…' : 'Unpublish'}
                </Button>
              )}
            </Box>
          </Box>
        </Card>
      )}

      {deployResult && (
        <Alert severity={deployResult.success ? 'success' : 'error'} sx={{ mb: 2 }} onClose={() => setDeployResult(null)}>
          {deployResult.message}
          {deployResult.url && <Link href={deployResult.url} target="_blank" rel="noreferrer" sx={{ ml: 1 }}>Open ↗</Link>}
        </Alert>
      )}

      {codeTab === 'code' && codeResult && (
        <Card sx={{ mb: 2.5, border: '1px solid var(--vm-border-subtle)', borderRadius: 3, overflow: 'hidden' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1, bgcolor: 'var(--vm-bg-secondary)', borderBottom: '1px solid var(--vm-border-subtle)' }}>
            <FileCode size={16} />
            <Typography sx={{ fontSize: 13, fontWeight: 700, flex: 1 }}>Generated Project ({codeResult.type})</Typography>
            <Button size="small" variant="outlined" startIcon={<GitBranch size={13} />} disabled={deployLoading === 'github'} onClick={() => handleDeploy('github')} sx={{ textTransform: 'none', fontSize: 11 }}>
              {deployLoading === 'github' ? <CircularProgress size={12} /> : 'Push to GitHub'}
            </Button>
            <Button size="small" variant="outlined" startIcon={<Terminal size={13} />} disabled={deployLoading === 'netlify'} onClick={() => handleDeploy('netlify')} sx={{ textTransform: 'none', fontSize: 11 }}>
              {deployLoading === 'netlify' ? <CircularProgress size={12} /> : 'Deploy to Netlify'}
            </Button>
          </Box>
          <Box sx={{ display: 'flex', minHeight: 400 }}>
            <Box sx={{ width: 240, flexShrink: 0, borderRight: '1px solid var(--vm-border-subtle)', overflowY: 'auto', bgcolor: '#0d1117' }}>
              {codeResult.files.map(f => (
                <Box key={f.path} onClick={() => setSelectedFile(f.path)} sx={{ px: 1.5, py: 0.75, cursor: 'pointer', fontSize: 12, fontFamily: 'monospace', color: selectedFile === f.path ? 'var(--vm-primary-400)' : 'rgba(255,255,255,.7)', bgcolor: selectedFile === f.path ? 'rgba(255,255,255,.05)' : 'transparent', '&:hover': { bgcolor: 'rgba(255,255,255,.03)' } }}>
                  <Code2 size={11} style={{ marginRight: 6, opacity: .5, display: 'inline' }} />{f.path}
                </Box>
              ))}
            </Box>
            <Box sx={{ flex: 1, overflow: 'auto', bgcolor: '#0d1117', p: 2 }}>
              {selectedFile && (() => {
                const file = codeResult.files.find(f => f.path === selectedFile);
                return file ? (
                  <Box component="pre" sx={{ m: 0, color: '#e6edf3', fontSize: 11, fontFamily: "'JetBrains Mono','Fira Code',monospace", lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {file.content}
                  </Box>
                ) : <Typography sx={{ color: 'rgba(255,255,255,.5)', fontSize: 12 }}>Select a file</Typography>;
              })()}
            </Box>
          </Box>
        </Card>
      )}

      <AICreationStudio
        domain="website"
        title="AI Website Studio"
        description="Tell AI what the business website should communicate. It automatically uses the approved logo, colours, business name, tagline, description, location, and other business records."
        placeholder="Example: Generate a modern responsive website from my approved business details and brand. Include Home, About, Services, and Contact pages, with a strong hero, trust section, FAQ, and clear calls to action."
        starterPrompts={[
          'Generate a complete responsive website using my business details and approved brand.',
          'Add an About page, Services page, FAQ section, and Contact page.',
          'Make the hero smaller and the carousel more elegant on mobile.',
          'Remove the pricing section and add a stronger trust and testimonials section.',
        ]}
        emptyLabel="No approved AI website draft exists. Ask AI to generate the complete first version."
        renderCurrent={() => savedDraft ? <SitePreview draft={savedDraft} businessName={selectedBusiness.name} tagline={selectedBusiness.tagline} logo={logo} /> : null}
        renderProposal={(change) => {
          const proposed = proposalDraft(change);
          return proposed ? <SitePreview draft={proposed} businessName={selectedBusiness.name} tagline={selectedBusiness.tagline} logo={logo} proposed /> : <Typography color="error">The AI returned an invalid website preview.</Typography>;
        }}
        onApproved={loadWebsite}
      />
    </Box>
  );
}

export const WebsiteBuilderPage = WebsiteBuilder;
