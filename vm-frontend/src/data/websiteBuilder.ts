// Website Builder Data - Templates, Sections, Components

export interface WebsiteTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  category: 'startup' | 'saas' | 'agency' | 'ecommerce' | 'portfolio';
  pages: PageTemplate[];
  brandDefaults: {
    primaryColor: string;
    secondaryColor: string;
    fontHeading: string;
    fontBody: string;
  };
}

export interface PageTemplate {
  slug: string;
  title: string;
  sections: SectionTemplate[];
}

export interface SectionTemplate {
  type: string;
  name: string;
  icon: string;
  defaultProps: Record<string, unknown>;
}

export interface WebsiteSection {
  id: string;
  type: string;
  props: Record<string, unknown>;
  order: number;
}

export interface WebsitePage {
  id: string;
  slug: string;
  title: string;
  metaDescription: string;
  sections: WebsiteSection[];
  isPublished: boolean;
}

export interface BuiltWebsite {
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

// Section Component Definitions
export const sectionComponents = [
  {
    type: 'hero',
    name: 'Hero',
    icon: 'Layout',
    description: 'Big headline with CTA',
    defaultProps: {
      headline: 'Build something amazing',
      subheadline: 'The platform for modern startups',
      ctaPrimary: 'Get Started',
      ctaSecondary: 'Learn More',
      background: 'gradient',
      image: '',
      align: 'center',
    },
  },
  {
    type: 'features',
    name: 'Features Grid',
    icon: 'Grid',
    description: 'Showcase key features',
    defaultProps: {
      title: 'Why choose us',
      subtitle: 'Everything you need to succeed',
      features: [
        { icon: 'Zap', title: 'Fast', description: 'Lightning quick performance' },
        { icon: 'Shield', title: 'Secure', description: 'Enterprise-grade security' },
        { icon: 'Scalable', title: 'Scalable', description: 'Grows with your business' },
      ],
      columns: 3,
    },
  },
  {
    type: 'pricing',
    name: 'Pricing Table',
    icon: 'CreditCard',
    description: 'Pricing plans',
    defaultProps: {
      title: 'Simple pricing',
      subtitle: 'Choose the plan that works for you',
      plans: [
        {
          name: 'Starter',
          price: 29,
          period: 'month',
          features: ['5 Projects', '10GB Storage', 'Basic Support'],
          cta: 'Start Free Trial',
          popular: false,
        },
        {
          name: 'Pro',
          price: 99,
          period: 'month',
          features: ['Unlimited Projects', '100GB Storage', 'Priority Support', 'Analytics'],
          cta: 'Start Free Trial',
          popular: true,
        },
      ],
    },
  },
  {
    type: 'testimonials',
    name: 'Testimonials',
    icon: 'MessageSquare',
    description: 'Customer reviews',
    defaultProps: {
      title: 'Loved by founders',
      subtitle: 'See what our customers say',
      testimonials: [
        {
          quote: 'This platform changed everything for our startup.',
          author: 'Sarah Chen',
          role: 'CEO, TechCorp',
          avatar: '',
        },
        {
          quote: 'Best investment we made in our first year.',
          author: 'Mike Johnson',
          role: 'Founder, StartupXYZ',
          avatar: '',
        },
      ],
      style: 'cards',
    },
  },
  {
    type: 'cta',
    name: 'Call to Action',
    icon: 'MousePointer',
    description: 'Big CTA section',
    defaultProps: {
      headline: 'Ready to get started?',
      subheadline: 'Join thousands of successful startups',
      cta: 'Start Free Trial',
      background: 'solid',
    },
  },
  {
    type: 'team',
    name: 'Team',
    icon: 'Users',
    description: 'Team members showcase',
    defaultProps: {
      title: 'Meet the team',
      subtitle: 'The people behind the product',
      members: [
        { name: 'Alex Chen', role: 'CEO', avatar: '' },
        { name: 'Sarah Kim', role: 'CTO', avatar: '' },
        { name: 'Mike Johnson', role: 'Design', avatar: '' },
      ],
    },
  },
  {
    type: 'faq',
    name: 'FAQ',
    icon: 'HelpCircle',
    description: 'Frequently asked questions',
    defaultProps: {
      title: 'FAQ',
      subtitle: 'Common questions answered',
      items: [
        { question: 'How does billing work?', answer: 'Simple monthly billing.' },
        { question: 'Can I cancel anytime?', answer: 'Yes, no commitments.' },
      ],
    },
  },
  {
    type: 'stats',
    name: 'Stats',
    icon: 'BarChart',
    description: 'Key metrics display',
    defaultProps: {
      title: 'By the numbers',
      stats: [
        { value: '10K+', label: 'Customers' },
        { value: '99.9%', label: 'Uptime' },
        { value: '24/7', label: 'Support' },
      ],
    },
  },
  {
    type: 'contact',
    name: 'Contact Form',
    icon: 'Mail',
    description: 'Contact form section',
    defaultProps: {
      title: 'Get in touch',
      subtitle: 'We would love to hear from you',
      showName: true,
      showCompany: true,
      showPhone: false,
    },
  },
  {
    type: 'text',
    name: 'Text Content',
    icon: 'Type',
    description: 'Simple text block',
    defaultProps: {
      title: 'Section Title',
      content: 'Add your content here.',
      align: 'left',
    },
  },
  {
    type: 'image',
    name: 'Image',
    icon: 'Image',
    description: 'Image with caption',
    defaultProps: {
      src: '',
      alt: '',
      caption: '',
      align: 'center',
    },
  },
  {
    type: 'video',
    name: 'Video',
    icon: 'Video',
    description: 'Video embed',
    defaultProps: {
      url: '',
      title: '',
    },
  },
] as const;

// Website Templates
export const websiteTemplates: WebsiteTemplate[] = [
  {
    id: 'saas-modern',
    name: 'SaaS Modern',
    description: 'Clean, modern design for SaaS startups',
    thumbnail: 'https://placeholder.com/template-saas.png',
    category: 'saas',
    brandDefaults: {
      primaryColor: '#10b981',
      secondaryColor: '#059669',
      fontHeading: 'Inter',
      fontBody: 'Inter',
    },
    pages: [
      {
        slug: '/',
        title: 'Home',
        sections: [
          { type: 'hero', name: 'Hero', icon: 'Layout', defaultProps: sectionComponents.find(s => s.type === 'hero')!.defaultProps },
          { type: 'features', name: 'Features', icon: 'Grid', defaultProps: sectionComponents.find(s => s.type === 'features')!.defaultProps },
          { type: 'testimonials', name: 'Testimonials', icon: 'MessageSquare', defaultProps: sectionComponents.find(s => s.type === 'testimonials')!.defaultProps },
          { type: 'pricing', name: 'Pricing', icon: 'CreditCard', defaultProps: sectionComponents.find(s => s.type === 'pricing')!.defaultProps },
          { type: 'cta', name: 'CTA', icon: 'MousePointer', defaultProps: sectionComponents.find(s => s.type === 'cta')!.defaultProps },
        ],
      },
      {
        slug: '/about',
        title: 'About',
        sections: [
          { type: 'text', name: 'About Text', icon: 'Type', defaultProps: { title: 'Our Story', content: 'We are building the future.', align: 'center' } },
          { type: 'team', name: 'Team', icon: 'Users', defaultProps: sectionComponents.find(s => s.type === 'team')!.defaultProps },
          { type: 'stats', name: 'Stats', icon: 'BarChart', defaultProps: sectionComponents.find(s => s.type === 'stats')!.defaultProps },
        ],
      },
      {
        slug: '/contact',
        title: 'Contact',
        sections: [
          { type: 'contact', name: 'Contact Form', icon: 'Mail', defaultProps: sectionComponents.find(s => s.type === 'contact')!.defaultProps },
        ],
      },
    ],
  },
  {
    id: 'startup-bold',
    name: 'Startup Bold',
    description: 'Bold, vibrant design for early-stage startups',
    thumbnail: 'https://placeholder.com/template-bold.png',
    category: 'startup',
    brandDefaults: {
      primaryColor: '#6366f1',
      secondaryColor: '#4f46e5',
      fontHeading: 'Poppins',
      fontBody: 'Open Sans',
    },
    pages: [
      {
        slug: '/',
        title: 'Home',
        sections: [
          { type: 'hero', name: 'Hero', icon: 'Layout', defaultProps: { ...sectionComponents.find(s => s.type === 'hero')!.defaultProps, align: 'left' } },
          { type: 'stats', name: 'Stats', icon: 'BarChart', defaultProps: sectionComponents.find(s => s.type === 'stats')!.defaultProps },
          { type: 'features', name: 'Features', icon: 'Grid', defaultProps: { ...sectionComponents.find(s => s.type === 'features')!.defaultProps, columns: 2 } },
          { type: 'cta', name: 'CTA', icon: 'MousePointer', defaultProps: sectionComponents.find(s => s.type === 'cta')!.defaultProps },
        ],
      },
    ],
  },
  {
    id: 'agency-minimal',
    name: 'Agency Minimal',
    description: 'Minimal, elegant design for agencies',
    thumbnail: 'https://placeholder.com/template-minimal.png',
    category: 'agency',
    brandDefaults: {
      primaryColor: '#18181b',
      secondaryColor: '#71717a',
      fontHeading: 'Playfair Display',
      fontBody: 'Inter',
    },
    pages: [
      {
        slug: '/',
        title: 'Home',
        sections: [
          { type: 'hero', name: 'Hero', icon: 'Layout', defaultProps: { ...sectionComponents.find(s => s.type === 'hero')!.defaultProps, background: 'image' } },
          { type: 'text', name: 'Intro', icon: 'Type', defaultProps: { title: 'What we do', content: 'We create digital experiences.', align: 'center' } },
          { type: 'testimonials', name: 'Testimonials', icon: 'MessageSquare', defaultProps: sectionComponents.find(s => s.type === 'testimonials')!.defaultProps },
          { type: 'contact', name: 'Contact', icon: 'Mail', defaultProps: sectionComponents.find(s => s.type === 'contact')!.defaultProps },
        ],
      },
    ],
  },
];

// Demo Website Data
export const demoWebsite: BuiltWebsite = {
  id: 'web_demo_001',
  businessId: 'biz_001',
  subdomain: 'neurotask',
  template: 'saas-modern',
  pages: [
    {
      id: 'page_001',
      slug: '/',
      title: 'Home',
      metaDescription: 'AI-powered task automation for knowledge workers',
      isPublished: true,
      sections: [
        {
          id: 'sec_001',
          type: 'hero',
          order: 1,
          props: {
            headline: 'Automate Your Workflows with AI',
            subheadline: 'Save 10+ hours every week with intelligent automation that learns from you',
            ctaPrimary: 'Start Free Trial',
            ctaSecondary: 'Watch Demo',
            background: 'gradient',
            align: 'center',
          },
        },
        {
          id: 'sec_002',
          type: 'features',
          order: 2,
          props: {
            title: 'Powerful Features',
            subtitle: 'Everything you need to automate your work',
            columns: 3,
            features: [
              { icon: 'Zap', title: 'AI Workflows', description: 'Natural language automation creation' },
              { icon: 'Integration', title: '100+ Integrations', description: 'Connect with your favorite tools' },
              { icon: 'Analytics', title: 'Smart Analytics', description: 'Track time saved and ROI' },
              { icon: 'Clock', title: 'Scheduling', description: 'Automated task scheduling' },
              { icon: 'Shield', title: 'Enterprise Security', description: 'SOC 2 compliant infrastructure' },
              { icon: 'Support', title: '24/7 Support', description: 'Always here to help' },
            ],
          },
        },
        {
          id: 'sec_003',
          type: 'testimonials',
          order: 3,
          props: {
            title: 'Loved by Teams',
            subtitle: 'See what our customers say',
            style: 'cards',
            testimonials: [
              { quote: 'Saved me 15 hours/week. Game changer!', author: 'Jane D.', role: 'PM at Stripe', avatar: '' },
              { quote: 'Best automation tool we have used.', author: 'Tom S.', role: 'Founder', avatar: '' },
              { quote: 'The AI suggestions are incredibly accurate.', author: 'Lisa M.', role: 'Ops Lead', avatar: '' },
            ],
          },
        },
        {
          id: 'sec_004',
          type: 'pricing',
          order: 4,
          props: {
            title: 'Simple Pricing',
            subtitle: 'Choose the plan that works for you',
            plans: [
              {
                name: 'Free',
                price: 0,
                period: 'month',
                features: ['50 automations/month', '5 integrations', 'Basic analytics'],
                cta: 'Get Started',
                popular: false,
              },
              {
                name: 'Pro',
                price: 29,
                period: 'month',
                features: ['Unlimited automations', 'All integrations', 'Advanced analytics', 'Priority support'],
                cta: 'Start Trial',
                popular: true,
              },
              {
                name: 'Enterprise',
                price: 99,
                period: 'month',
                features: ['Everything in Pro', 'SSO', 'Custom AI training', 'Dedicated success manager'],
                cta: 'Contact Sales',
                popular: false,
              },
            ],
          },
        },
        {
          id: 'sec_005',
          type: 'cta',
          order: 5,
          props: {
            headline: 'Ready to automate?',
            subheadline: 'Join 10,000+ users saving time with NeuroTask',
            cta: 'Get Started Free',
            background: 'gradient',
          },
        },
      ],
    },
    {
      id: 'page_002',
      slug: '/features',
      title: 'Features',
      metaDescription: 'Explore all features of NeuroTask AI',
      isPublished: true,
      sections: [
        {
          id: 'sec_f1',
          type: 'hero',
          order: 1,
          props: {
            headline: 'Features that power productivity',
            subheadline: 'Everything you need to automate your workflow',
            ctaPrimary: 'Try Free',
            background: 'solid',
            align: 'left',
          },
        },
        {
          id: 'sec_f2',
          type: 'features',
          order: 2,
          props: {
            title: 'Core Capabilities',
            subtitle: '',
            columns: 2,
            features: [
              { icon: 'Brain', title: 'AI Learning', description: 'Learns your patterns automatically' },
              { icon: 'Zap', title: 'Instant Automation', description: 'Set up workflows in seconds' },
              { icon: 'Lock', title: 'Secure', description: 'Bank-grade encryption' },
              { icon: 'Globe', title: 'Global', description: 'Works anywhere in the world' },
            ],
          },
        },
      ],
    },
    {
      id: 'page_003',
      slug: '/about',
      title: 'About',
      metaDescription: 'Meet the team behind NeuroTask AI',
      isPublished: true,
      sections: [
        {
          id: 'sec_a1',
          type: 'text',
          order: 1,
          props: {
            title: 'Our Story',
            content: 'Founded in 2024, NeuroTask AI is on a mission to democratize automation for every knowledge worker.',
            align: 'center',
          },
        },
        {
          id: 'sec_a2',
          type: 'team',
          order: 2,
          props: {
            title: 'Meet the Team',
            subtitle: 'The people building the future of work',
            members: [
              { name: 'Alex Chen', role: 'CEO & Co-founder', avatar: '' },
              { name: 'Sarah Kim', role: 'CTO & Co-founder', avatar: '' },
              { name: 'Mike Johnson', role: 'Head of Design', avatar: '' },
              { name: 'Emily Davis', role: 'Head of Engineering', avatar: '' },
            ],
          },
        },
        {
          id: 'sec_a3',
          type: 'stats',
          order: 3,
          props: {
            title: 'Our Impact',
            stats: [
              { value: '50K+', label: 'Users' },
              { value: '1M+', label: 'Hours Saved' },
              { value: '100+', label: 'Countries' },
              { value: '99.9%', label: 'Uptime' },
            ],
          },
        },
      ],
    },
  ],
  globalStyles: {
    primaryColor: '#10b981',
    secondaryColor: '#059669',
    accentColor: '#34d399',
    fontHeading: 'Inter',
    fontBody: 'Inter',
    borderRadius: '8px',
    buttonStyle: 'rounded',
  },
  navigation: {
    items: [
      { label: 'Home', slug: '/' },
      { label: 'Features', slug: '/features' },
      { label: 'About', slug: '/about' },
      { label: 'Contact', slug: '/contact' },
    ],
    style: 'horizontal',
    position: 'top',
  },
  footer: {
    showLogo: true,
    showSocial: true,
    showNewsletter: true,
    customText: '© 2024 NeuroTask AI. All rights reserved.',
  },
  isPublished: true,
  publishedAt: '2024-04-01T00:00:00Z',
  lastModified: '2024-04-04T00:00:00Z',
};

// Helper functions
export const getTemplateById = (id: string) => websiteTemplates.find(t => t.id === id);
export const getSectionComponent = (type: string) => sectionComponents.find(s => s.type === type);
