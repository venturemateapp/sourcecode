import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Box, Typography, Card } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { VentureMateLayout } from './layouts/VentureMateLayout';
import { AuthLayout } from './layouts/AuthLayout';
import { SignIn } from './pages/auth/SignIn';
import { SignUp } from './pages/auth/SignUp';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { AuthCallback } from './pages/auth/AuthCallback';
import { OAuthCallback } from './pages/auth/OAuthCallback';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ToastProvider, useToast } from './components/shared/toast';
import { Dashboard } from './pages/venturemate/Dashboard';
import { Businesses } from './pages/venturemate/Businesses';
import { PitchDeck } from './pages/venturemate/PitchDeck';
import { InvestorsPage } from './pages/venturemate/Investors';
import { CoFoundersPage } from './pages/venturemate/CoFounders';
import { AIAssistant } from './pages/venturemate/AIAssistant';
import { CRMPage } from './pages/venturemate/CRM';
import { CompaniesPage } from './pages/venturemate/Companies';
import { EmailSettingsPage } from './pages/venturemate/EmailSettings';
import { CalendarPage } from './pages/venturemate/CalendarPage';
import { CustomObjectsPage } from './pages/venturemate/CustomObjectsPage';
import { WorkflowsPage } from './pages/venturemate/WorkflowsPage';
import { InvoicesPage } from './pages/venturemate/Invoices';
import { ExpenditurePage } from './pages/venturemate/Expenditure';
import { BankingPage } from './pages/venturemate/Banking';
import { SocialPage } from './pages/venturemate/Social';
import { MarketplacePage } from './pages/venturemate/Marketplace';
import { CreditScorePage } from './pages/venturemate/CreditScore';
import { HealthScorePage } from './pages/venturemate/HealthScore';
import { WebsiteBuilderPage } from './pages/venturemate/WebsiteBuilder';
import { TeamPage } from './pages/venturemate/TeamPage';
import { BillingPage } from './pages/venturemate/Billing';
import { DocumentsPage } from './pages/venturemate/Documents';
import { BusinessPlan } from './pages/venturemate/BusinessPlan';
import { FinancialForecast } from './pages/venturemate/FinancialForecast';
import { BrandingKitPage } from './pages/venturemate/BrandingKit';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { MilestonesPage } from './pages/venturemate/MilestonesPage';
import { SettingsPage } from './pages/venturemate/Settings';
import { MessagesPage } from './pages/venturemate/Messages';
import { LandingPage } from './pages/LandingPage';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { TermsOfService } from './pages/TermsOfService';
import { OnboardingPage } from './pages/onboarding/OnboardingPage';
import { BusinessProvider, useBusiness } from './contexts/BusinessContext';
import { SubscriptionProvider, useSubscription } from './contexts/SubscriptionContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { CurrencyProvider } from './contexts/CurrencyContext';
import { AIProviderProvider } from './contexts/AIProviderContext';
import { SupportChatProvider } from './contexts/SupportChatContext';
import { SupportChatFloating } from './components/support/SupportChatFloating';
import type { ViewType } from './types/venturemate';
import {
  TrendingUp,
  Lightbulb,
} from 'lucide-react';

// Placeholder component for pages under development
function PlaceholderPage({ title, description, icon: Icon }: { title: string; description: string; icon: React.ComponentType<{size?: number; color?: string}> }) {
  return (
    <Box sx={{ p: { xs: 2, md: 4 }, textAlign: 'center' }}>
      <Box
        sx={{
          width: { xs: 60, md: 80 },
          height: { xs: 60, md: 80 },
          borderRadius: 3,
          bgcolor: 'var(--vm-primary-900)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mx: 'auto',
          mb: 3,
        }}
      >
        <Icon size={40} color="var(--vm-primary-400)" />
      </Box>
      <Typography sx={{ fontSize: 24, fontWeight: 700, color: 'var(--vm-text-primary)', mb: 2 }}>
        {title}
      </Typography>
      <Typography sx={{ fontSize: 15, color: 'var(--vm-text-muted)', maxWidth: 500, mx: 'auto' }}>
        {description}
      </Typography>
    </Box>
  );
}

// Business Overview Page
function BusinessOverview() {
  const { selectedBusiness } = useBusiness();
  const business = selectedBusiness;
  if (!business) return null;

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 2, md: 3 }, mb: 4, flexWrap: 'wrap' }}>
        <Box
          sx={{
            width: { xs: 60, md: 80 },
            height: { xs: 60, md: 80 },
            borderRadius: 3,
            background: `linear-gradient(135deg, ${business.brandKit.primaryColor} 0%, ${business.brandKit.secondaryColor} 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 700, color: 'white' }}>
            {business.name[0]}
          </Typography>
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: { xs: 22, md: 28 }, fontWeight: 700, color: 'var(--vm-text-primary)', wordBreak: 'break-word' }}>
            {business.name}
          </Typography>
          <Typography sx={{ fontSize: { xs: 14, md: 16 }, color: 'var(--vm-text-muted)' }}>
            {business.tagline}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(12, 1fr)' }, gap: { xs: 2, md: 3 } }}>
        <Box sx={{ gridColumn: { md: 'span 8' } }}>
          <Card sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, p: { xs: 2, md: 3 }, mb: 3 }}>
            <Typography sx={{ fontSize: { xs: 16, md: 18 }, fontWeight: 700, color: 'var(--vm-text-primary)', mb: 2 }}>
              About
            </Typography>
            <Typography sx={{ fontSize: { xs: 13, md: 14 }, color: 'var(--vm-text-secondary)', lineHeight: 1.8, wordBreak: 'break-word' }}>
              {business.description}
            </Typography>
          </Card>
        </Box>
        <Box sx={{ gridColumn: { md: 'span 4' } }}>
          <Card sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, p: { xs: 2, md: 3 } }}>
            <Typography sx={{ fontSize: { xs: 15, md: 16 }, fontWeight: 700, color: 'var(--vm-text-primary)', mb: 2 }}>
              Quick Stats
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: { xs: 1, sm: 1.5, md: 2 } }}>
              {[
                { label: 'Stage', value: business.stage },
                { label: 'Industry', value: business.industry },
                { label: 'Location', value: business.location },
                { label: 'Founded', value: new Date(business.foundedDate).toLocaleDateString('en-GB') },
              ].map((stat) => (
                <Box key={stat.label} sx={{ bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2, p: { xs: 1.5, sm: 2 }, textAlign: 'center' }}>
                  <Typography sx={{ fontSize: { xs: 10, sm: 11, md: 11 }, color: 'var(--vm-text-muted)', mb: 0.5, textTransform: 'uppercase', fontWeight: 600, lineHeight: 1.3 }}>{stat.label}</Typography>
                  <Typography sx={{ fontSize: { xs: 12, sm: 13, md: 14 }, color: 'var(--vm-text-primary)', fontWeight: 600, wordBreak: 'break-word' }}>{stat.value}</Typography>
                </Box>
              ))}
            </Box>
          </Card>
        </Box>
      </Box>
    </Box>
  );
}





function VentureMateApp() {
  const navigate = useNavigate();
  const location = window.location;
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const onboardingCompleted = localStorage.getItem('venturemate_onboarding_completed') === 'true';
  const { subscription, plans } = useSubscription();
  const toast = useToast();

  const subscriptionLoaded = !!subscription?.plan;
  const plansLoaded = plans.length > 0;

  const viewFeatureMap: Partial<Record<ViewType, string>> = {
    'crm': 'CRM',
    'invoices': 'Invoicing',
    'banking': 'Banking Integrations',
    'website-builder': 'Website Creator',
    'websites': 'Website Creator',
    'documents': 'Document Vault',
    'social': 'Social Media Scheduler',
    'marketplace': 'Marketplace Access',
    'investors': 'Investor Matching',
    'financial-forecast': 'Advanced Financial Modeling',
    'milestones': 'Milestones & Team Management',
    'team': 'Milestones & Team Management',
    'companies': 'CRM',
    'health-score': 'Business Health Score',
    'credit-score': 'Credit Score overview',
    'branding-kit': 'Basic Brand Kit',
    'pitch-deck': 'Basic Pitch Deck Generator',
    'business-plan': 'Basic Business Plan Generator',
    'expenditure': 'Invoicing',
    'cofounders': 'Investor Matching',
  };

  const hasFeature = (view: ViewType): boolean => {
    if (!subscriptionLoaded || !plansLoaded) return true;
    const feature = viewFeatureMap[view];
    if (!feature) return true;
    const userSort = subscription?.plan?.sortOrder ?? 0;
    return plans.some(p =>
      p.sortOrder <= userSort &&
      p.features.some(f => f.text === feature && f.included)
    );
  };

  const getUpgradePlan = (view: ViewType): string => {
    const requiredFeature = viewFeatureMap[view];
    if (!requiredFeature) return 'Growth';
    // Features included on Free but not Starter
    const freeIncluded = ['Dashboard', 'AI Assistant', 'AI Assistant (limited)', 'Business Health Score', 'Credit Score overview', 'Basic Pitch Deck Generator', 'Basic Business Plan Generator', 'Basic Brand Kit', 'Community Support'];
    if (freeIncluded.includes(requiredFeature)) return 'Starter';
    // Features included on Starter but not Growth
    const starterIncluded = ['Website Creator', 'CRM', 'Invoicing', 'Banking Integrations', 'Document Vault', 'Social Media Scheduler', 'Marketplace Access', 'Milestones & Team Management', 'Email Support'];
    if (starterIncluded.includes(requiredFeature)) return 'Growth';
    // Everything else requires Scale
    return 'Scale';
  };

  useEffect(() => {
    if (!onboardingCompleted && !location.pathname.includes('/onboarding')) {
      navigate('/vm/onboarding', { replace: true });
    }
  }, [location.pathname, navigate, onboardingCompleted]);

  if (!onboardingCompleted && !location.pathname.includes('/onboarding')) {
    return null;
  }

  const handleViewChange = (view: ViewType) => {
    if (!hasFeature(view)) {
      const plan = getUpgradePlan(view);
      toast.warning('Upgrade required', {
        description: `Your current plan doesn't include this feature. Upgrade to ${plan} to access it.`,
        duration: 6000,
      });
      return;
    }
    setActiveView(view);
  };

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard onViewChange={handleViewChange} />;
      case 'businesses':
        return <Businesses onViewChange={handleViewChange} />;
      case 'business-overview':
        return <BusinessOverview />;
      case 'pitch-deck':
        return <PitchDeck onViewChange={handleViewChange} />;
      case 'milestones':
        return <MilestonesPage />;
      case 'team':
        return <TeamPage />;
      case 'ai-assistant':
        return <AIAssistant />;
      case 'investors':
        return <InvestorsPage onViewChange={handleViewChange} />;
      case 'cofounders':
        return <CoFoundersPage onViewChange={handleViewChange} />;
      case 'messages':
        return <MessagesPage />;
      case 'business-plan':
        return <BusinessPlan />;
      case 'branding-kit':
        return <BrandingKitPage onViewChange={handleViewChange} />;
      case 'website-builder':
      case 'websites':
        return <WebsiteBuilderPage onViewChange={setActiveView} />;
      case 'documents':
        return <DocumentsPage onViewChange={handleViewChange} />;
      case 'market-research':
        return <PlaceholderPage title="Market Research" description="AI-powered market analysis and insights." icon={TrendingUp} />;
      case 'financial-forecast':
        return <FinancialForecast />;
      case 'generate-idea':
        return <PlaceholderPage title="Generate Idea" description="Let AI help you brainstorm startup ideas." icon={Lightbulb} />;
      case 'billing':
        return <BillingPage />;
      case 'settings':
        return <SettingsPage />;
      case 'email-settings':
        return <EmailSettingsPage />;
      case 'calendar':
        return <CalendarPage />;
      case 'custom-objects':
        return <CustomObjectsPage />;
      case 'workflows':
        return <WorkflowsPage />;
      case 'crm':
        return <CRMPage />;
      case 'companies':
        return <CompaniesPage />;
      case 'invoices':
        return <InvoicesPage />;
      case 'expenditure':
        return <ExpenditurePage />;
      case 'banking':
        return <BankingPage onViewChange={handleViewChange} />;
      case 'social':
        return <SocialPage />;
      case 'marketplace':
        return <MarketplacePage />;
      case 'credit-score':
        return <CreditScorePage onViewChange={handleViewChange} />;
      case 'health-score':
        return <HealthScorePage onViewChange={handleViewChange} />;
      default:
        return <Dashboard onViewChange={handleViewChange} />;
    }
  };

  return (
    <BusinessProvider>
      <AIProviderProvider>
      <NotificationProvider>
      <CurrencyProvider>
      <SupportChatProvider>
      <VentureMateLayout
        activeView={activeView}
        onViewChange={handleViewChange}
      >
        {renderContent()}
      </VentureMateLayout>
      <SupportChatFloating />
      </SupportChatProvider>
      </CurrencyProvider>
      </NotificationProvider>
      </AIProviderProvider>
    </BusinessProvider>
  );
}

function App() {
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <BrowserRouter>
        <Routes>
        <Route path="/vm/auth" element={<ToastProvider><AuthLayout /></ToastProvider>}>
          <Route path="signin" element={<SignIn />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="callback" element={<AuthCallback />} />
          <Route path="oauth/callback" element={<OAuthCallback />} />
          <Route index element={<Navigate to="/vm/auth/signin" replace />} />
        </Route>
        <Route path="/vm/onboarding" element={<ToastProvider><OnboardingPage /></ToastProvider>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/vm/*" element={<SubscriptionProvider><ToastProvider><VentureMateApp /></ToastProvider></SubscriptionProvider>} />
          <Route path="/vm/admin" element={<AdminDashboard />} />
        </Route>
        <Route path="/" element={<LandingPage />} />
        <Route path="/policy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/signup" element={<ToastProvider><SignUp /></ToastProvider>} />
      </Routes>
    </BrowserRouter>
    </LocalizationProvider>
  );
}

export default App;
