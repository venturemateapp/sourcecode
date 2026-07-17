import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Card, Chip, CircularProgress, Link, Typography } from '@mui/material';
import { Building2, Code2, ExternalLink, Eye, FileCode, GitBranch, Globe2, MonitorSmartphone, Sparkles, Terminal, UploadCloud, XCircle } from 'lucide-react';
import { AICreationStudio, type ProposedChange } from '../../components/venturemate/AICreationStudio';
import { NoBusinessSelected } from '../../components/venturemate/NoBusinessSelected';
import { useBusiness } from '../../contexts/BusinessContext';
import { graphqlRequest } from '../../lib/api';
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

function SitePreview({ draft, businessName, tagline, logo, proposed = false }: { draft: WebsiteDraft; businessName: string; tagline: string; logo?: string; proposed?: boolean }) {
  const styles = draft.globalStyles || {};
  const primary = styles.primaryColor || '#10b981';
  const secondary = styles.secondaryColor || '#059669';
  const dark = styles.darkColor || '#052e24';
  const page = draft.pages?.find(item => item.isHome || item.slug === '/') || draft.pages?.[0];
  const sections = (page?.sections || []).filter(section => section.visible !== false);

  return (
    <Box sx={{ border: proposed ? '1px solid var(--vm-primary-500)' : '1px solid var(--vm-border-subtle)', borderRadius: 3, overflow: 'hidden', bgcolor: '#07130f' }}>
      <Box sx={{ px: { xs: 1.5, sm: 2.5 }, py: 1.25, display: 'flex', alignItems: 'center', gap: 1.25, bgcolor: dark, borderBottom: '1px solid rgba(255,255,255,.1)' }}>
        {logo ? <Box component="img" src={logo} alt="Business logo" sx={{ width: 34, height: 34, objectFit: 'contain', borderRadius: 1 }} /> : <Globe2 size={24} color={primary} />}
        <Typography sx={{ color: 'white', fontWeight: 900, flex: 1 }}>{businessName}</Typography>
        <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 1.5 }}>
          {(draft.navigation?.items || []).slice(0, 5).map(item => <Typography key={`${item.label}-${item.href}`} sx={{ color: 'rgba(255,255,255,.72)', fontSize: 11 }}>{item.label}</Typography>)}
        </Box>
      </Box>

      {sections.length === 0 ? (
        <Box sx={{ minHeight: 360, display: 'grid', placeItems: 'center', p: 3, background: `radial-gradient(circle at 75% 20%, ${primary}55, transparent 30%), linear-gradient(135deg, ${dark}, #07130f)` }}>
          <Box sx={{ textAlign: 'center', maxWidth: 650 }}>
            <Typography sx={{ color: 'white', fontSize: { xs: 28, sm: 42 }, fontWeight: 950 }}>{tagline || businessName}</Typography>
            <Typography sx={{ color: 'rgba(255,255,255,.7)', mt: 1 }}>AI will generate the full page structure and content here.</Typography>
          </Box>
        </Box>
      ) : sections.map((section, index) => {
        const content = section.props || section.content || {};
        const heading = text(content, 'headline', 'title', 'heading') || `${section.type || 'Website'} section`;
        const body = text(content, 'subheadline', 'body', 'description', 'text');
        const isHero = section.type === 'hero';
        if (isHero) {
          return (
            <Box key={section.id || index} sx={{ minHeight: 360, p: { xs: 3, sm: 6 }, display: 'grid', placeItems: 'center', textAlign: 'center', background: `radial-gradient(circle at 75% 20%, ${primary}66, transparent 32%), linear-gradient(135deg, ${dark}, #07130f)` }}>
              <Box sx={{ maxWidth: 760 }}>
                {logo && <Box component="img" src={logo} alt="" sx={{ width: 84, height: 84, objectFit: 'contain', mb: 2 }} />}
                <Typography sx={{ color: 'white', fontSize: { xs: 30, sm: 48 }, fontWeight: 950, lineHeight: 1.05 }}>{heading}</Typography>
                {body && <Typography sx={{ color: 'rgba(255,255,255,.75)', fontSize: { xs: 13, sm: 16 }, lineHeight: 1.7, mt: 1.5 }}>{body}</Typography>}
                <Box sx={{ mt: 2.5, display: 'inline-flex', px: 2.25, py: 1.1, borderRadius: 999, bgcolor: primary, color: 'white', fontWeight: 900, fontSize: 12 }}>{text(content, 'primaryCta', 'buttonText', 'cta') || 'Learn More'}</Box>
              </Box>
            </Box>
          );
        }
        if (section.type === 'carousel') {
          const items = (Array.isArray(content.items) ? content.items : Array.isArray(content.slides) ? content.slides : []) as Array<Record<string, unknown>>;
          return (
            <Box key={section.id || index} sx={{ p: { xs: 2.5, sm: 4 }, bgcolor: '#081710', borderTop: '1px solid rgba(255,255,255,.06)' }}>
              <Typography sx={{ color: secondary, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 900 }}>Carousel</Typography>
              <Typography sx={{ color: 'white', fontSize: { xs: 20, sm: 27 }, fontWeight: 900, mt: 0.5 }}>{heading}</Typography>
              {body && <Typography sx={{ color: 'rgba(255,255,255,.7)', fontSize: 13, lineHeight: 1.75, mt: 1 }}>{body}</Typography>}
              <Box sx={{ mt: 2, display: 'grid', gridAutoFlow: 'column', gridAutoColumns: { xs: '84%', sm: '44%' }, gap: 1.25, overflowX: 'auto', scrollSnapType: 'x mandatory', pb: 1 }}>
                {items.map((item, itemIndex) => (
                  <Card key={itemIndex} sx={{ overflow: 'hidden', scrollSnapAlign: 'start', bgcolor: 'rgba(255,255,255,.045)', border: '1px solid rgba(255,255,255,.09)', borderRadius: 2.5 }}>
                    {typeof item.image === 'string' && item.image && <Box component="img" src={item.image} alt="" sx={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover' }} />}
                    <Box sx={{ p: 1.75 }}>
                      <Typography sx={{ color: 'white', fontWeight: 900, fontSize: 14 }}>{typeof item.title === 'string' ? item.title : `Slide ${itemIndex + 1}`}</Typography>
                      <Typography sx={{ color: 'rgba(255,255,255,.68)', fontSize: 12, lineHeight: 1.65, mt: 0.75 }}>{typeof item.description === 'string' ? item.description : typeof item.content === 'string' ? item.content : ''}</Typography>
                    </Box>
                  </Card>
                ))}
              </Box>
            </Box>
          );
        }
        return (
          <Box key={section.id || index} sx={{ p: { xs: 2.5, sm: 4 }, bgcolor: index % 2 ? '#0b2118' : '#081710', borderTop: '1px solid rgba(255,255,255,.06)' }}>
            <Typography sx={{ color: secondary, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 900 }}>{section.type}</Typography>
            <Typography sx={{ color: 'white', fontSize: { xs: 20, sm: 27 }, fontWeight: 900, mt: 0.5 }}>{heading}</Typography>
            {body && <Typography sx={{ color: 'rgba(255,255,255,.7)', fontSize: 13, lineHeight: 1.75, mt: 1, maxWidth: 820 }}>{body}</Typography>}
            {Array.isArray(content.items) && (
              <Box sx={{ mt: 1.5, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 1 }}>
                {(content.items as unknown[]).slice(0, 6).map((item, itemIndex) => (
                  <Card key={itemIndex} sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', color: 'white' }}>
                    <Typography sx={{ color: 'white', fontSize: 12 }}>{typeof item === 'string' ? item : JSON.stringify(item)}</Typography>
                  </Card>
                ))}
              </Box>
            )}
          </Box>
        );
      })}
      <Box sx={{ p: 2, textAlign: 'center', bgcolor: dark, color: 'rgba(255,255,255,.55)', fontSize: 11 }}>
        {typeof draft.footer?.customText === 'string' ? draft.footer.customText : `© ${new Date().getFullYear()} ${businessName}`}
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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap', maxWidth: '100%' }}>
        <MonitorSmartphone size={19} color="var(--vm-primary-400)" />
        <Chip icon={<Building2 size={14} />} label={selectedBusiness.name} size="small" sx={{ maxWidth: '100%', '& .MuiChip-label': { whiteSpace: 'normal', py: 0.5 } }} />
        <Chip icon={<Sparkles size={13} />} label="No-code means conversation only" size="small" color="success" variant="outlined" />
        {website && <Chip label={`Draft v${website.draftRevision}`} size="small" variant="outlined" />}
        {website?.status === 'published' && <Chip label={`Live v${website.publishedRevision}`} size="small" color="success" />}
        {savedDraft && (
          <Button size="small" variant={codeTab === 'preview' ? 'contained' : 'outlined'} onClick={() => setCodeTab('preview')} startIcon={<Eye size={13} />} sx={{ textTransform: 'none', ml: 'auto', fontSize: 11 }}>Preview</Button>
        )}
        {savedDraft && (
          <Button size="small" variant={codeTab === 'code' ? 'contained' : 'outlined'} onClick={() => { if (codeTab === 'code') setCodeTab('preview'); else { setCodeTab('code'); handleGenerateCode(savedDraft); } }} startIcon={codeLoading ? <CircularProgress size={13} /> : <Code2 size={13} />} disabled={codeLoading} sx={{ textTransform: 'none', fontSize: 11 }}>Code</Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && !website && <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}><CircularProgress size={18} /><Typography sx={{ color: 'var(--vm-text-muted)' }}>Loading website…</Typography></Box>}

      {website && codeTab === 'preview' && (
        <Card sx={{ mb: 2.5, p: 1.5, bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
            <Box>
              <Typography sx={{ color: 'var(--vm-text-primary)', fontSize: 13, fontWeight: 900 }}>Hosting & publication</Typography>
              <Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 11, mt: 0.25 }}>
                {website.status === 'published' ? 'Your website is live at the address above.' : 'Review the draft below, then press Publish when you are ready to go live.'}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', maxWidth: '100%', alignItems: 'center' }}>
              {website.subdomain && <Chip icon={<Globe2 size={13} />} label={`${website.subdomain}.venturemate.net`} size="small" variant="outlined" sx={{ maxWidth: '100%', '& .MuiChip-label': { whiteSpace: 'normal', py: 0.5 } }} />}
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
