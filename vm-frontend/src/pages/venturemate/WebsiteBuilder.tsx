import { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Card, Tabs, Tab, TextField, Select, MenuItem, IconButton, Dialog, DialogTitle, DialogContent, Grid, Chip } from '@mui/material';
import { GradientButton } from '../../components/shared/buttons';
import { useBusiness } from '../../contexts/BusinessContext';
import { NoBusinessSelected } from '../../components/venturemate/NoBusinessSelected';
import { DomainChat } from '../../components/venturemate/DomainChat';
import { graphqlRequest } from '../../lib/api';
import {
  Layout, Type, Image as ImageIcon, Video, MousePointer, Users,
  MessageSquare, CreditCard, Grid as GridIcon, BarChart, HelpCircle, Mail,
  Eye, Globe, Trash2, MoveUp, MoveDown,
  Loader2, AlertCircle,
} from 'lucide-react';
import type { ViewType } from '../../types/venturemate';

interface WebsiteSection {
  id: string;
  type: string;
  props: Record<string, unknown>;
  order: number;
}

interface WebsitePage {
  id: string;
  slug: string;
  title: string;
  metaDescription: string;
  sections: WebsiteSection[];
  isPublished: boolean;
}

interface BuiltWebsite {
  id: string;
  businessId: string;
  subdomain: string;
  customDomain?: string;
  template: string;
  pages: WebsitePage[];
  globalStyles: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    fontHeading: string;
    fontBody: string;
    borderRadius: string;
    buttonStyle: 'rounded' | 'pill' | 'square';
  };
  navigation: {
    items: { label: string; slug: string }[];
    style: 'horizontal' | 'vertical' | 'minimal';
    position: 'top' | 'side';
  };
  footer: {
    showLogo: boolean;
    showSocial: boolean;
    showNewsletter: boolean;
    customText?: string;
  };
  isPublished: boolean;
  publishedAt?: string;
  lastModified: string;
}

const sectionComponents = [
  {
    type: 'hero', name: 'Hero', icon: 'Layout',
    description: 'Big headline with CTA',
    defaultProps: { headline: 'Build something amazing', subheadline: 'The platform for modern startups', ctaPrimary: 'Get Started', ctaSecondary: 'Learn More', background: 'gradient', image: '', align: 'center' },
  },
  {
    type: 'features', name: 'Features Grid', icon: 'Grid',
    description: 'Showcase key features',
    defaultProps: { title: 'Why choose us', subtitle: 'Everything you need to succeed', features: [{ icon: 'Zap', title: 'Fast', description: 'Lightning quick performance' }, { icon: 'Shield', title: 'Secure', description: 'Enterprise-grade security' }, { icon: 'Scalable', title: 'Scalable', description: 'Grows with your business' }], columns: 3 },
  },
  {
    type: 'pricing', name: 'Pricing Table', icon: 'CreditCard',
    description: 'Pricing plans',
    defaultProps: { title: 'Simple pricing', subtitle: 'Choose the plan that works for you', plans: [{ name: 'Starter', price: 29, period: 'month', features: ['5 Projects', '10GB Storage', 'Basic Support'], cta: 'Start Free Trial', popular: false }, { name: 'Pro', price: 99, period: 'month', features: ['Unlimited Projects', '100GB Storage', 'Priority Support', 'Analytics'], cta: 'Start Free Trial', popular: true }] },
  },
  {
    type: 'testimonials', name: 'Testimonials', icon: 'MessageSquare',
    description: 'Customer reviews',
    defaultProps: { title: 'Loved by founders', subtitle: 'See what our customers say', testimonials: [{ quote: 'This platform changed everything for our startup.', author: 'Sarah Chen', role: 'CEO, TechCorp', avatar: '' }, { quote: 'Best investment we made in our first year.', author: 'Mike Johnson', role: 'Founder, StartupXYZ', avatar: '' }], style: 'cards' },
  },
  {
    type: 'cta', name: 'Call to Action', icon: 'MousePointer',
    description: 'Big CTA section',
    defaultProps: { headline: 'Ready to get started?', subheadline: 'Join thousands of successful startups', cta: 'Start Free Trial', background: 'solid' },
  },
  {
    type: 'team', name: 'Team', icon: 'Users',
    description: 'Team members showcase',
    defaultProps: { title: 'Meet the team', subtitle: 'The people behind the product', members: [{ name: 'Alex Chen', role: 'CEO', avatar: '' }, { name: 'Sarah Kim', role: 'CTO', avatar: '' }, { name: 'Mike Johnson', role: 'Design', avatar: '' }] },
  },
  {
    type: 'faq', name: 'FAQ', icon: 'HelpCircle',
    description: 'Frequently asked questions',
    defaultProps: { title: 'FAQ', subtitle: 'Common questions answered', items: [{ question: 'How does billing work?', answer: 'Simple monthly billing.' }, { question: 'Can I cancel anytime?', answer: 'Yes, no commitments.' }] },
  },
  {
    type: 'stats', name: 'Stats', icon: 'BarChart',
    description: 'Key metrics display',
    defaultProps: { title: 'By the numbers', stats: [{ value: '10K+', label: 'Customers' }, { value: '99.9%', label: 'Uptime' }, { value: '24/7', label: 'Support' }] },
  },
  {
    type: 'contact', name: 'Contact Form', icon: 'Mail',
    description: 'Contact form section',
    defaultProps: { title: 'Get in touch', subtitle: 'We would love to hear from you', showName: true, showCompany: true, showPhone: false },
  },
  {
    type: 'text', name: 'Text Content', icon: 'Type',
    description: 'Simple text block',
    defaultProps: { title: 'Section Title', content: 'Add your content here.', align: 'left' },
  },
  {
    type: 'image', name: 'Image', icon: 'Image',
    description: 'Image with caption',
    defaultProps: { src: '', alt: '', caption: '', align: 'center' },
  },
  {
    type: 'video', name: 'Video', icon: 'Video',
    description: 'Video embed',
    defaultProps: { url: '', title: '' },
  },
];

const fallbackWebsiteDefault: BuiltWebsite = {
  id: '', businessId: '', subdomain: '', template: '',
  pages: [],
  globalStyles: { primaryColor: '#10b981', secondaryColor: '#059669', accentColor: '#34d399', fontHeading: 'Inter', fontBody: 'Inter', borderRadius: '8px', buttonStyle: 'rounded' },
  navigation: { items: [{ label: 'Home', slug: '/' }], style: 'horizontal', position: 'top' },
  footer: { showLogo: true, showSocial: true, showNewsletter: false },
  isPublished: false, lastModified: new Date().toISOString(),
};

const WEBSITE_TEMPLATES_QUERY = `
  query WebsiteTemplates {
    websiteTemplates {
      id, name, description, thumbnail, category, templateData, isActive
    }
  }
`;

const MY_WEBSITE_QUERY = `
  query MyWebsite($businessId: ID!) {
    myWebsite(businessId: $businessId) {
      id, businessId, templateId, subdomain, customDomain,
      pages, globalStyles, navigation, footer,
      status, publishedAt, lastModified
    }
  }
`;

const CREATE_WEBSITE_MUTATION = `
  mutation CreateWebsite($businessId: ID!, $templateId: String!, $subdomain: String) {
    createWebsite(businessId: $businessId, templateId: $templateId, subdomain: $subdomain) {
      id, businessId, templateId, subdomain, pages, globalStyles, navigation, footer, status, lastModified
    }
  }
`;

const UPDATE_WEBSITE_MUTATION = `
  mutation UpdateWebsite($id: ID!, $businessId: ID!, $pages: String, $globalStyles: String, $navigation: String, $footer: String, $status: String) {
    updateWebsite(id: $id, businessId: $businessId, pages: $pages, globalStyles: $globalStyles, navigation: $navigation, footer: $footer, status: $status) {
      id, pages, globalStyles, navigation, footer, status, lastModified
    }
  }
`;

const PUBLISH_WEBSITE_MUTATION = `
  mutation PublishWebsite($id: ID!, $businessId: ID!) {
    publishWebsite(id: $id, businessId: $businessId)
  }
`;

interface ApiWebsite {
  id: string; businessId: string; templateId: string; subdomain: string;
  customDomain: string; pages: string; globalStyles: string; navigation: string;
  footer: string; status: string; publishedAt: string | null; lastModified: string;
}

interface ApiTemplate {
  id: string; name: string; description: string; thumbnail: string;
  category: string; templateData: string; isActive: boolean;
}

const iconMap: Record<string, React.ComponentType<{ size?: number }>> = {
  Layout, Type, 'Image': ImageIcon, Video, MousePointer, Users,
  MessageSquare, CreditCard, Grid: GridIcon, BarChart, HelpCircle, Mail,
};

function mapApiToBuiltWebsite(api: ApiWebsite, templateData?: string): BuiltWebsite {
  let pages: WebsitePage[] = [];
  let globalStyles = { primaryColor: '#10b981', secondaryColor: '#059669', accentColor: '#34d399', fontHeading: 'Inter', fontBody: 'Inter', borderRadius: '8px', buttonStyle: 'rounded' as const };
  let navigation = { items: [{ label: 'Home', slug: '/' }], style: 'horizontal' as const, position: 'top' as const };
  let footer = { showLogo: true, showSocial: true, showNewsletter: false };

  try { pages = JSON.parse(api.pages); } catch { pages = []; }
  try { globalStyles = JSON.parse(api.globalStyles); } catch {}
  try { navigation = JSON.parse(api.navigation); } catch {}
  try { footer = JSON.parse(api.footer); } catch {}

  if ((!pages || pages.length === 0) && templateData) {
    try {
      const tpl = JSON.parse(templateData);
      if (tpl.pages) {
        pages = tpl.pages.map((p: any, idx: number) => ({
          id: `page_${idx}`,
          slug: p.slug,
          title: p.title,
          metaDescription: '',
          isPublished: false,
          sections: (p.sections || []).map((s: any, sIdx: number) => ({
            id: `sec_${idx}_${sIdx}`,
            type: s.type,
            props: { ...s.defaultProps },
            order: sIdx + 1,
          })),
        }));
      }
      if (tpl.brandDefaults) {
        globalStyles = {
          ...globalStyles,
          primaryColor: tpl.brandDefaults.primaryColor || globalStyles.primaryColor,
          secondaryColor: tpl.brandDefaults.secondaryColor || globalStyles.secondaryColor,
          fontHeading: tpl.brandDefaults.fontHeading || globalStyles.fontHeading,
          fontBody: tpl.brandDefaults.fontBody || globalStyles.fontBody,
        };
      }
    } catch {}
  }

  return {
    id: api.id,
    businessId: api.businessId,
    subdomain: api.subdomain,
    customDomain: api.customDomain,
    template: api.templateId,
    pages,
    globalStyles,
    navigation,
    footer,
    isPublished: api.status === 'published',
    publishedAt: api.publishedAt || undefined,
    lastModified: api.lastModified,
  };
}

interface WebsiteBuilderProps {
  onViewChange?: (_view: ViewType) => void;
}

export function WebsiteBuilderPage(_props: WebsiteBuilderProps) {
  const { selectedBusiness, userId } = useBusiness();
  const [website, setWebsite] = useState<BuiltWebsite | null>(null);
  const [dbTemplates, setDbTemplates] = useState<ApiTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState(0);
  const [selectedPage, setSelectedPage] = useState(0);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  const currentPage = website?.pages?.[selectedPage];

  const fetchData = useCallback(async () => {
    if (!selectedBusiness?.id || !userId) return;
    setLoading(true);
    setError(null);
    try {
      const [tplData, webData] = await Promise.all([
        graphqlRequest<{ websiteTemplates: ApiTemplate[] }>(WEBSITE_TEMPLATES_QUERY).catch(() => ({ websiteTemplates: [] })),
        graphqlRequest<{ myWebsite: ApiWebsite | null }>(MY_WEBSITE_QUERY, { businessId: selectedBusiness.id }),
      ]);
      setDbTemplates(tplData.websiteTemplates || []);

      if (webData.myWebsite) {
        const tpl = tplData.websiteTemplates?.find(t => t.id === webData.myWebsite?.templateId);
        setWebsite(mapApiToBuiltWebsite(webData.myWebsite, tpl?.templateData));
      } else {
        setShowTemplates(true);
        setWebsite(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load website data');
      setWebsite(fallbackWebsiteDefault);
    } finally {
      setLoading(false);
    }
  }, [selectedBusiness?.id, userId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSelectTemplate = async (tpl: ApiTemplate) => {
    if (!selectedBusiness?.id || !userId) return;
    setShowTemplates(false);
    setLoading(true);
    try {
      const data = await graphqlRequest<{ createWebsite: ApiWebsite }>(CREATE_WEBSITE_MUTATION, {
        businessId: selectedBusiness.id,
        templateId: tpl.id,
        subdomain: selectedBusiness.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      });
      setWebsite(mapApiToBuiltWebsite(data.createWebsite, tpl.templateData));
    } catch (err: any) {
      setError(err.message || 'Failed to create website');
    } finally {
      setLoading(false);
    }
  };

  const saveWebsite = useCallback(async (updated: BuiltWebsite) => {
    if (!updated?.id || !selectedBusiness?.id) return;
    setSaving(true);
    try {
      await graphqlRequest(UPDATE_WEBSITE_MUTATION, {
        id: updated.id,
        businessId: selectedBusiness.id,
        pages: JSON.stringify(updated.pages),
        globalStyles: JSON.stringify(updated.globalStyles),
        navigation: JSON.stringify(updated.navigation),
        footer: JSON.stringify(updated.footer),
      });
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [selectedBusiness?.id]);

  const handleAddSection = (type: string) => {
    if (!website || !currentPage) return;
    const component = sectionComponents.find(c => c.type === type);
    if (!component) return;
    const newSection: WebsiteSection = {
      id: `sec_${Date.now()}`,
      type,
      props: { ...component.defaultProps },
      order: currentPage.sections.length + 1,
    };
    const updatedPages = [...website.pages];
    updatedPages[selectedPage].sections.push(newSection);
    const updated = { ...website, pages: updatedPages, lastModified: new Date().toISOString() };
    setWebsite(updated);
    saveWebsite(updated);
  };

  const handleRemoveSection = (sectionId: string) => {
    if (!website) return;
    const updatedPages = [...website.pages];
    updatedPages[selectedPage].sections = currentPage!.sections.filter(s => s.id !== sectionId);
    const updated = { ...website, pages: updatedPages, lastModified: new Date().toISOString() };
    setWebsite(updated);
    setSelectedSection(null);
    saveWebsite(updated);
  };

  const handleMoveSection = (sectionId: string, direction: 'up' | 'down') => {
    if (!website) return;
    const sections = [...currentPage!.sections];
    const idx = sections.findIndex(s => s.id === sectionId);
    if (idx === -1) return;
    if (direction === 'up' && idx > 0) { [sections[idx], sections[idx - 1]] = [sections[idx - 1], sections[idx]]; }
    else if (direction === 'down' && idx < sections.length - 1) { [sections[idx], sections[idx + 1]] = [sections[idx + 1], sections[idx]]; }
    else return;
    const updatedPages = [...website.pages];
    updatedPages[selectedPage].sections = sections;
    const updated = { ...website, pages: updatedPages };
    setWebsite(updated);
    saveWebsite(updated);
  };

  const handleUpdateSection = (sectionId: string, newProps: Record<string, unknown>) => {
    if (!website) return;
    const updatedPages = [...website.pages];
    const section = updatedPages[selectedPage].sections.find(s => s.id === sectionId);
    if (section) {
      section.props = { ...section.props, ...newProps };
      const updated = { ...website, pages: updatedPages, lastModified: new Date().toISOString() };
      setWebsite(updated);
      saveWebsite(updated);
    }
  };

  const handleApplyTemplate = (templateId: string) => {
    const tpl = dbTemplates.find(t => t.id === templateId || t.name === templateId);
    if (!tpl || !website) return;
    const tplData = 'templateData' in tpl ? (tpl as ApiTemplate).templateData : null;
    let pages: WebsitePage[] = [];
    let gs = website.globalStyles;
    if (tplData) {
      try {
        const td = JSON.parse(tplData);
        pages = td.pages?.map((p: any, idx: number) => ({
          id: `page_${Date.now()}_${idx}`,
          slug: p.slug, title: p.title, metaDescription: '', isPublished: false,
          sections: (p.sections || []).map((s: any, sIdx: number) => ({
            id: `sec_${Date.now()}_${sIdx}`, type: s.type, props: { ...s.defaultProps }, order: sIdx + 1,
          })),
        })) || [];
        if (td.brandDefaults) {
          gs = { ...gs, primaryColor: td.brandDefaults.primaryColor || gs.primaryColor, secondaryColor: td.brandDefaults.secondaryColor || gs.secondaryColor, fontHeading: td.brandDefaults.fontHeading || gs.fontHeading, fontBody: td.brandDefaults.fontBody || gs.fontBody };
        }
      } catch {}
    }
    const updated = { ...website, template: templateId, pages, globalStyles: gs, lastModified: new Date().toISOString() };
    setWebsite(updated);
    setShowTemplates(false);
    setSelectedPage(0);
    saveWebsite(updated);
  };

  const handlePublish = async () => {
    if (!website?.id || !selectedBusiness?.id) return;
    setSaving(true);
    try {
      await graphqlRequest(PUBLISH_WEBSITE_MUTATION, { id: website.id, businessId: selectedBusiness.id });
      setWebsite({ ...website, isPublished: true, publishedAt: new Date().toISOString() });
      setShowPublishDialog(false);
    } catch (err: any) {
      setError(err.message || 'Failed to publish');
    } finally {
      setSaving(false);
    }
  };

  if (!selectedBusiness) {
    return <NoBusinessSelected message="Select a business to build your website." />;
  }

  if (loading && !website) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Box sx={{ textAlign: 'center' }}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--vm-primary-500)' }} />
          <Typography sx={{ mt: 2, color: 'var(--vm-text-muted)' }}>Loading website...</Typography>
        </Box>
      </Box>
    );
  }

  if (!website) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography sx={{ fontSize: 24, fontWeight: 700, color: 'var(--vm-text-primary)', mb: 3 }}>Choose a Template</Typography>
        <TemplateGrid templates={dbTemplates} onSelect={handleSelectTemplate} />
        <DomainChat domain="website" placeholder="Ask me to create a website..." />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, height: { xs: 'auto', md: 'calc(100vh - 100px)' } }}>
      <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', mb: { xs: 2, md: 3 }, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 2, sm: 0 } }}>
        <Box>
<Typography sx={{ fontSize: { xs: 16, sm: 18, md: 20 }, fontWeight: 700, color: 'var(--vm-text-primary)' }}>
              Website Builder
            </Typography>
            <Typography sx={{ fontSize: { xs: 11, sm: 12, md: 13 }, color: 'var(--vm-text-muted)', display: 'flex', alignItems: 'center', gap: 1 }}>
              {website.subdomain}.venturemate.app • Last saved {new Date(website.lastModified).toLocaleTimeString()}
              {saving && <Box component="span" sx={{ fontSize: 10, color: 'var(--vm-primary-400)' }}>(saving...)</Box>}
            </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: { xs: 1, sm: 2 }, justifyContent: 'center', width: { xs: '100%', sm: 'auto' }, '& > *': { flex: { xs: 1, sm: 'none' } } }}>
          <GradientButton variant="outline" size="md" onClick={() => setPreviewMode(previewMode === 'desktop' ? 'mobile' : 'desktop')} sx={{ borderColor: 'var(--vm-border-primary)', color: 'var(--vm-text-secondary)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Eye size={18} /> Preview</Box>
          </GradientButton>
          <GradientButton variant="outline" size="md" onClick={() => setShowTemplates(true)} sx={{ borderColor: 'var(--vm-border-primary)', color: 'var(--vm-text-secondary)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Layout size={18} /> Templates</Box>
          </GradientButton>
          <GradientButton variant="primary" size="md" onClick={() => setShowPublishDialog(true)} disabled={saving} sx={{ bgcolor: 'var(--vm-primary-600)', '&:hover': { bgcolor: 'var(--vm-primary-500)' } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Globe size={18} /> {website.isPublished ? 'Update' : 'Publish'}</Box>
          </GradientButton>
        </Box>
      </Box>

      {error && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, mb: 2, borderRadius: 2, bgcolor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 13 }}>
          <AlertCircle size={16} /> {error}
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: { xs: 2, md: 3 }, flexDirection: { xs: 'column', md: 'row' }, height: { md: 'calc(100% - 80px)' } }}>
        <Card sx={{ width: { xs: '100%', md: 280 }, flex: { xs: 'none', md: '0 0 auto' }, bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, display: 'flex', flexDirection: 'column' }}>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="scrollable" scrollButtons="auto" sx={{ '& .MuiTabs-indicator': { bgcolor: 'var(--vm-primary-500)' }, '& .MuiTab-root': { color: 'var(--vm-text-muted)', textTransform: 'none', fontSize: { xs: '0.75rem', sm: '0.875rem' }, minWidth: { xs: 'auto', sm: 90 }, '&.Mui-selected': { color: 'var(--vm-primary-400)' } } }}>
            <Tab label="Sections" /><Tab label="Pages" /><Tab label="Style" />
          </Tabs>
          <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
            {activeTab === 0 && (
              <>
                <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)', mb: 2, fontWeight: 600 }}>ADD SECTION</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, justifyContent: 'center' }}>
                  {sectionComponents.map((component) => {
                    const Icon = iconMap[component.icon] || Layout;
                    return (
                      <GradientButton key={component.type} onClick={() => handleAddSection(component.type)} variant="primary" size="md"
                        sx={{ justifyContent: 'flex-start', py: 1.5, px: 2, borderRadius: 2, bgcolor: 'var(--vm-bg-tertiary)', color: 'var(--vm-text-secondary)', '&:hover': { bgcolor: 'var(--vm-bg-hover)' } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Icon size={18} />
                          <Box sx={{ textAlign: 'left' }}><Typography sx={{ fontSize: 13, fontWeight: 500 }}>{component.name}</Typography><Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)' }}>{component.description}</Typography></Box>
                        </Box>
                      </GradientButton>
                    );
                  })}
                </Box>
              </>
            )}
            {activeTab === 1 && (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)', fontWeight: 600 }}>PAGES</Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {website.pages.map((page, idx) => (
                    <Box key={page.id} onClick={() => setSelectedPage(idx)}
                      sx={{ p: 2, borderRadius: 2, bgcolor: selectedPage === idx ? 'var(--vm-primary-900)' : 'var(--vm-bg-tertiary)', border: selectedPage === idx ? '1px solid var(--vm-primary-600)' : '1px solid transparent', cursor: 'pointer' }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'var(--vm-text-primary)' }}>{page.title}</Typography>
                      <Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)' }}>{page.slug} • {page.sections.length} sections</Typography>
                    </Box>
                  ))}
                </Box>
              </>
            )}
            {activeTab === 2 && (
              <Box>
                <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)', mb: 2, fontWeight: 600 }}>BRAND COLORS</Typography>
                <Box sx={{ mb: 3 }}>
                  <Typography sx={{ fontSize: 12, color: 'var(--vm-text-secondary)', mb: 1 }}>Primary Color</Typography>
                  <input type="color" value={website.globalStyles.primaryColor} onChange={(e) => { const updated = { ...website, globalStyles: { ...website.globalStyles, primaryColor: e.target.value }, lastModified: new Date().toISOString() }; setWebsite(updated); saveWebsite(updated); }}
                    style={{ width: '100%', height: 40, border: '1px solid var(--vm-border-subtle)', borderRadius: 8, cursor: 'pointer', background: 'none' }} />
                </Box>
                <Box sx={{ mb: 3 }}>
                  <Typography sx={{ fontSize: 12, color: 'var(--vm-text-secondary)', mb: 1 }}>Secondary Color</Typography>
                  <input type="color" value={website.globalStyles.secondaryColor} onChange={(e) => { const updated = { ...website, globalStyles: { ...website.globalStyles, secondaryColor: e.target.value }, lastModified: new Date().toISOString() }; setWebsite(updated); saveWebsite(updated); }}
                    style={{ width: '100%', height: 40, border: '1px solid var(--vm-border-subtle)', borderRadius: 8, cursor: 'pointer', background: 'none' }} />
                </Box>
                <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)', mb: 2, fontWeight: 600, mt: 2 }}>TYPOGRAPHY</Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography sx={{ fontSize: 12, color: 'var(--vm-text-secondary)', mb: 1 }}>Heading Font</Typography>
                  <Select value={website.globalStyles.fontHeading} onChange={(e) => { const updated = { ...website, globalStyles: { ...website.globalStyles, fontHeading: e.target.value }, lastModified: new Date().toISOString() }; setWebsite(updated); saveWebsite(updated); }}
                    size="small" sx={{ width: '100%', color: 'var(--vm-text-primary)', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-subtle)' } }}>
                    {['Inter', 'Poppins', 'Playfair Display', 'Roboto', 'Open Sans'].map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                  </Select>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography sx={{ fontSize: 12, color: 'var(--vm-text-secondary)', mb: 1 }}>Body Font</Typography>
                  <Select value={website.globalStyles.fontBody} onChange={(e) => { const updated = { ...website, globalStyles: { ...website.globalStyles, fontBody: e.target.value }, lastModified: new Date().toISOString() }; setWebsite(updated); saveWebsite(updated); }}
                    size="small" sx={{ width: '100%', color: 'var(--vm-text-primary)', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-subtle)' } }}>
                    {['Inter', 'Poppins', 'Playfair Display', 'Roboto', 'Open Sans'].map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                  </Select>
                </Box>
              </Box>
            )}
          </Box>
        </Card>

        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, overflow: 'auto', minHeight: { xs: 400, md: 'auto' } }}>
          {currentPage ? (
            <Card sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, p: { xs: 2, sm: 3 }, flex: 1, overflow: 'auto' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Typography sx={{ fontSize: 18, fontWeight: 700, color: 'var(--vm-text-primary)' }}>{currentPage.title}</Typography>
                <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>{currentPage.sections.length} sections</Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {currentPage.sections.map((section) => (
                  <Card key={section.id}
                    onClick={() => setSelectedSection(section.id)}
                    sx={{ p: 2, borderRadius: 2, bgcolor: 'var(--vm-bg-tertiary)', border: selectedSection === section.id ? '2px solid var(--vm-primary-500)' : '1px solid var(--vm-border-subtle)', cursor: 'pointer', '&:hover': { borderColor: 'var(--vm-primary-400)' } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'var(--vm-text-primary)', textTransform: 'capitalize' }}>{section.type}</Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleMoveSection(section.id, 'up'); }} sx={{ color: 'var(--vm-text-muted)' }}><MoveUp size={14} /></IconButton>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleMoveSection(section.id, 'down'); }} sx={{ color: 'var(--vm-text-muted)' }}><MoveDown size={14} /></IconButton>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleRemoveSection(section.id); }} sx={{ color: '#ef4444' }}><Trash2 size={14} /></IconButton>
                      </Box>
                    </Box>
                    {section.type === 'hero' && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <TextField size="small" label="Headline" value={(section.props.headline as string) || ''} onChange={(e) => handleUpdateSection(section.id, { headline: e.target.value })}
                          sx={{ '& .MuiInputBase-input': { fontSize: 13, color: 'var(--vm-text-primary)' }, '& .MuiInputLabel-root': { fontSize: 12 } }} />
                        <TextField size="small" label="Subheadline" value={(section.props.subheadline as string) || ''} onChange={(e) => handleUpdateSection(section.id, { subheadline: e.target.value })}
                          sx={{ '& .MuiInputBase-input': { fontSize: 13, color: 'var(--vm-text-primary)' }, '& .MuiInputLabel-root': { fontSize: 12 } }} />
                        <TextField size="small" label="CTA Button" value={(section.props.ctaPrimary as string) || ''} onChange={(e) => handleUpdateSection(section.id, { ctaPrimary: e.target.value })}
                          sx={{ '& .MuiInputBase-input': { fontSize: 13, color: 'var(--vm-text-primary)' }, '& .MuiInputLabel-root': { fontSize: 12 } }} />
                      </Box>
                    )}
                    {section.type === 'text' && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <TextField size="small" label="Title" value={(section.props.title as string) || ''} onChange={(e) => handleUpdateSection(section.id, { title: e.target.value })}
                          sx={{ '& .MuiInputBase-input': { fontSize: 13, color: 'var(--vm-text-primary)' }, '& .MuiInputLabel-root': { fontSize: 12 } }} />
                        <TextField size="small" label="Content" multiline rows={3} value={(section.props.content as string) || ''} onChange={(e) => handleUpdateSection(section.id, { content: e.target.value })}
                          sx={{ '& .MuiInputBase-input': { fontSize: 13, color: 'var(--vm-text-primary)' }, '& .MuiInputLabel-root': { fontSize: 12 } }} />
                      </Box>
                    )}
                  </Card>
                ))}
              </Box>
            </Card>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--vm-text-muted)' }}>
              <Typography>Select a page to edit</Typography>
            </Box>
          )}
        </Box>
      </Box>

      <Dialog open={showTemplates} onClose={() => setShowTemplates(false)} maxWidth="md" fullWidth>
        <DialogTitle><Typography sx={{ fontWeight: 700 }}>Choose a Template</Typography></DialogTitle>
        <DialogContent>
          <TemplateGrid templates={dbTemplates} onSelect={(tpl) => handleApplyTemplate(tpl.id || tpl.name)} />
        </DialogContent>
      </Dialog>

      <Dialog open={showPublishDialog} onClose={() => setShowPublishDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle><Typography sx={{ fontWeight: 700 }}>{website.isPublished ? 'Update' : 'Publish'} Website</Typography></DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <Typography sx={{ color: 'var(--vm-text-secondary)', mb: 2 }}>
              Your website will be available at:
            </Typography>
            <TextField fullWidth size="small" label="Subdomain" value={website.subdomain} onChange={(e) => setWebsite({ ...website, subdomain: e.target.value })}
              sx={{ mb: 2, '& .MuiInputBase-input': { color: 'var(--vm-text-primary)' } }} />
            <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)', mb: 3 }}>
              {website.subdomain}.venturemate.app
            </Typography>
            <GradientButton variant="primary" size="lg" onClick={handlePublish} disabled={saving} sx={{ width: '100%' }}>
              {saving ? 'Publishing...' : website.isPublished ? 'Update Website' : 'Publish Website'}
            </GradientButton>
          </Box>
        </DialogContent>
      </Dialog>

      <DomainChat domain="website" placeholder="Ask me to build or edit your website..." />
    </Box>
  );
}

function TemplateGrid({ templates, onSelect }: { templates: ApiTemplate[], onSelect: (tpl: ApiTemplate) => void }) {
  return (
    <Grid container spacing={2}>
      {templates.map((tpl) => {
        const brandColor = (() => { try { return JSON.parse(tpl.templateData).brandDefaults?.primaryColor || '#10b981'; } catch { return '#10b981'; } })();
        return (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={tpl.id}>
            <Card
              onClick={() => onSelect(tpl)}
              sx={{ p: 2, borderRadius: 3, bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', cursor: 'pointer', '&:hover': { borderColor: 'var(--vm-primary-500)', transform: 'translateY(-2px)', transition: 'all 0.2s' } }}>
              <Box sx={{ height: 100, borderRadius: 2, mb: 1.5, background: `linear-gradient(135deg, ${brandColor}22, ${brandColor}44)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Layout size={32} style={{ color: brandColor }} />
              </Box>
              <Typography sx={{ fontSize: 15, fontWeight: 600, color: 'var(--vm-text-primary)' }}>{tpl.name}</Typography>
              <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)', mb: 1 }}>{tpl.description}</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip label={tpl.category} size="small" sx={{ fontSize: 10, bgcolor: `${brandColor}22`, color: brandColor }} />
              </Box>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
}
