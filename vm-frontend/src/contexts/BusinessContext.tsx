import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { graphqlRequest } from '../lib/api';
import { decodeToken, getToken } from '../lib/auth';
import type { Business } from '../types/venturemate';

interface BusinessContextValue {
  businesses: Business[];
  selectedBusinessId: string;
  selectedBusiness: Business | null;
  setSelectedBusinessId: (id: string) => void;
  addBusiness: (data: Partial<Business>) => Promise<Business | null>;
  updateBusiness: (id: string, data: Partial<Business>) => Promise<boolean>;
  deleteBusiness: (id: string) => Promise<boolean>;
  loading: boolean;
  userId: string;
  refreshBusiness: () => Promise<void>;
}

const BusinessContext = createContext<BusinessContextValue | undefined>(undefined);

const MY_BUSINESSES_QUERY = `
  query MyBusinesses($userId: ID!) {
    myBusinesses(userId: $userId) {
      id, userId, name, tagline, description, industry, stage, foundedDate, location, website, status,
      brandKit, pitchDeck, businessPlan, milestones, team, documents, websiteConfig, financials, metrics, aiGenerated,
      totalRevenue, revenueByCurrency, createdAt, updatedAt
    }
  }
`;

const CREATE_BUSINESS_MUTATION = `
  mutation CreateBusiness($userId: ID!, $name: String!, $tagline: String, $description: String, $industry: String, $stage: String, $foundedDate: String, $location: String, $website: String) {
    createBusiness(userId: $userId, name: $name, tagline: $tagline, description: $description, industry: $industry, stage: $stage, foundedDate: $foundedDate, location: $location, website: $website) {
      id, userId, name, tagline, description, industry, stage, foundedDate, location, website, status,
      brandKit, pitchDeck, businessPlan, milestones, team, documents, websiteConfig, financials, metrics, aiGenerated,
      totalRevenue, revenueByCurrency, createdAt, updatedAt
    }
  }
`;

const UPDATE_BUSINESS_MUTATION = `
  mutation UpdateBusiness($id: ID!, $userId: ID!, $name: String, $tagline: String, $description: String, $industry: String, $stage: String, $foundedDate: String, $location: String, $website: String, $status: String, $team: String, $milestones: String, $documents: String, $brandKit: String, $pitchDeck: String, $businessPlan: String, $websiteConfig: String, $financials: String, $metrics: String, $aiGenerated: String) {
    updateBusiness(id: $id, userId: $userId, name: $name, tagline: $tagline, description: $description, industry: $industry, stage: $stage, foundedDate: $foundedDate, location: $location, website: $website, status: $status, team: $team, milestones: $milestones, documents: $documents, brandKit: $brandKit, pitchDeck: $pitchDeck, businessPlan: $businessPlan, websiteConfig: $websiteConfig, financials: $financials, metrics: $metrics, aiGenerated: $aiGenerated) {
      id, userId, name, tagline, description, industry, stage, foundedDate, location, website, status,
      brandKit, pitchDeck, businessPlan, milestones, team, documents, websiteConfig, financials, metrics, aiGenerated,
      totalRevenue, revenueByCurrency, createdAt, updatedAt
    }
  }
`;

const DELETE_BUSINESS_MUTATION = `
  mutation DeleteBusiness($id: ID!, $userId: ID!) {
    deleteBusiness(id: $id, userId: $userId)
  }
`;

interface ApiBusiness {
  id: string;
  userId: string;
  name: string;
  tagline: string;
  description: string;
  industry: string;
  stage: string;
  foundedDate: string;
  location: string;
  website: string;
  status: string;
  brandKit: string;
  pitchDeck: string;
  businessPlan: string;
  milestones: string;
  team: string;
  documents: string;
  websiteConfig: string;
  financials: string;
  metrics: string;
  aiGenerated: string;
  totalRevenue: number;
  revenueByCurrency: string;
  createdAt: string;
  updatedAt: string;
}

function parseJsonField<T>(val: string, fallback: T): T {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
}

function mapApiToBusiness(api: ApiBusiness): Business {
  const now = new Date().toISOString();
  return {
    id: api.id,
    userId: api.userId,
    name: api.name,
    tagline: api.tagline,
    description: api.description,
    industry: api.industry,
    stage: (api.stage as Business['stage']) || 'idea',
    foundedDate: api.foundedDate,
    location: api.location,
    website: api.website,
    status: (api.status as Business['status']) || 'active',
    brandKit: parseJsonField(api.brandKit, { logo: '', logoWhite: '', logoIcon: '', primaryColor: '#059669', secondaryColor: '#10b981', accentColor: '#34d399', darkColor: '#064e3b', fontHeading: 'Inter', fontBody: 'Inter', patterns: [], socialBanners: [] }),
    pitchDeck: parseJsonField(api.pitchDeck, { id: '', title: '', slides: [], template: '', lastModified: now, exportFormats: ['pdf'], shareLink: '', views: 0 }),
    businessPlan: parseJsonField(api.businessPlan, { id: '', title: '', sections: [], executiveSummary: '', lastModified: now, version: '1.0', exportFormats: ['pdf'] }),
    milestones: parseJsonField(api.milestones, []),
    team: parseJsonField(api.team, []),
    documents: parseJsonField(api.documents, []),
    websiteConfig: parseJsonField(api.websiteConfig, { id: '', subdomain: '', status: 'draft', template: '', pages: [], seo: { title: '', description: '', keywords: [] }, analytics: {} }),
    financials: parseJsonField(api.financials, { fundingRaised: 0, fundingRounds: [], revenue: { currentMRR: 0, currentARR: 0, growthRate: 0, history: [] }, expenses: { monthlyBurn: 0, breakdown: [] }, runway: 0, burnRate: 0, projections: [] }) ?? { fundingRaised: 0, fundingRounds: [], revenue: { currentMRR: 0, currentARR: 0, growthRate: 0, history: [] }, expenses: { monthlyBurn: 0, breakdown: [] }, runway: 0, burnRate: 0, projections: [] },
    metrics: parseJsonField(api.metrics, { totalUsers: 0, activeUsers: 0, retentionRate: 0, churnRate: 0, nps: 0, cac: 0, ltv: 0, customMetrics: [] }),
    aiGenerated: parseJsonField(api.aiGenerated, { ideas: [] }),
    totalRevenue: api.totalRevenue ?? 0,
    revenueByCurrency: api.revenueByCurrency || '{}',
    createdAt: api.createdAt || now,
  };
}

export function BusinessProvider({ children }: { children: ReactNode }) {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const token = getToken();
  const jwt = token ? decodeToken(token) : null;
  const userId = jwt?.user_id || '';

  const selectedBusiness = businesses.find(b => b.id === selectedBusinessId) || null;

  const doFetch = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await graphqlRequest<{ myBusinesses: ApiBusiness[] }>(MY_BUSINESSES_QUERY, { userId });
      const mapped = (data.myBusinesses || []).map(mapApiToBusiness);
      setBusinesses(mapped);
      setSelectedBusinessId(prev => !prev && mapped.length > 0 ? mapped[0].id : prev);
    } catch (err) {
      console.error('Failed to fetch businesses:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { doFetch(); }, [doFetch]);

  function serializeForApi(val: unknown): string {
    if (val === null || val === undefined) return '';
    if (typeof val === 'string') return val;
    return JSON.stringify(val);
  }

  const addBusiness = useCallback(async (data: Partial<Business>): Promise<Business | null> => {
    if (!userId) return null;
    try {
      const vars: Record<string, unknown> = { userId, name: data.name || '' };
      if (data.tagline) vars.tagline = data.tagline;
      if (data.description) vars.description = data.description;
      if (data.industry) vars.industry = data.industry;
      if (data.stage) vars.stage = data.stage;
      if (data.foundedDate) vars.foundedDate = data.foundedDate;
      if (data.location) vars.location = data.location;
      if (data.website) vars.website = data.website;
      const result = await graphqlRequest<{ createBusiness: ApiBusiness }>(CREATE_BUSINESS_MUTATION, vars);
      const business = mapApiToBusiness(result.createBusiness);
      setBusinesses(prev => [...prev, business]);
      return business;
    } catch (err) {
      console.error('Failed to create business:', err);
      return null;
    }
  }, [userId]);

  const updateBusiness = useCallback(async (id: string, data: Partial<Business>): Promise<boolean> => {
    if (!userId) return false;
    try {
      const vars: Record<string, unknown> = { id, userId };
      for (const [key, val] of Object.entries(data)) {
        vars[key] = serializeForApi(val);
      }
      const result = await graphqlRequest<{ updateBusiness: ApiBusiness }>(UPDATE_BUSINESS_MUTATION, vars);
      const updated = mapApiToBusiness(result.updateBusiness);
      setBusinesses(prev => prev.map(b => b.id === id ? updated : b));
      return true;
    } catch (err) {
      console.error('Failed to update business:', err);
      return false;
    }
  }, [userId]);

  const deleteBusiness = useCallback(async (id: string): Promise<boolean> => {
    if (!userId) return false;
    try {
      await graphqlRequest<{ deleteBusiness: boolean }>(DELETE_BUSINESS_MUTATION, { id, userId });
      setBusinesses(prev => prev.filter(b => b.id !== id));
      setSelectedBusinessId(prev => prev === id ? '' : prev);
      return true;
    } catch (err) {
      console.error('Failed to delete business:', err);
      return false;
    }
  }, [userId]);

  return (
    <BusinessContext.Provider value={{
      businesses,
      selectedBusinessId,
      selectedBusiness,
      setSelectedBusinessId,
      addBusiness,
      updateBusiness,
      deleteBusiness,
      loading,
      userId,
      refreshBusiness: doFetch,
    }}>
      {children}
    </BusinessContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBusiness() {
  const ctx = useContext(BusinessContext);
  if (!ctx) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return ctx;
}
