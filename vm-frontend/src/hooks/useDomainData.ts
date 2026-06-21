import { useState, useCallback, useEffect } from 'react';
import { graphqlRequest } from '../lib/api';

const DOMAIN_DATA_QUERY = `
  query DomainData($businessId: ID!, $domain: String!) {
    domainData(businessId: $businessId, domain: $domain) {
      id
      businessId
      domain
      data
    }
  }
`;

const UPDATE_DOMAIN_DATA_MUTATION = `
  mutation UpdateDomainData($businessId: ID!, $domain: String!, $data: String!) {
    updateDomainData(businessId: $businessId, domain: $domain, data: $data) {
      id
      businessId
      domain
      data
    }
  }
`;

export function useDomainData(businessId: string | undefined, domain: string) {
  const [data, setData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!businessId) { setData(null); return; }
    setLoading(true);
    setError(null);
    try {
      const result = await graphqlRequest<{ domainData: { data: string } | null }>(DOMAIN_DATA_QUERY, { businessId, domain });
      setData(result.domainData?.data || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [businessId, domain]);

  useEffect(() => {
    void fetch();
    const handleAIRefresh = (event: Event) => {
      const detail = (event as CustomEvent<{ businessId?: string; domain?: string }>).detail;
      if (detail?.businessId && detail.businessId !== businessId) return;
      if (detail?.domain && detail.domain !== domain && detail.domain !== 'general') return;
      void fetch();
    };
    window.addEventListener('venturemate:ai-data-changed', handleAIRefresh);
    return () => window.removeEventListener('venturemate:ai-data-changed', handleAIRefresh);
  }, [businessId, domain, fetch]);

  const save = useCallback(async (newData: string): Promise<boolean> => {
    if (!businessId) return false;
    setLoading(true);
    setError(null);
    try {
      await graphqlRequest(UPDATE_DOMAIN_DATA_MUTATION, { businessId, domain, data: newData });
      setData(newData);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save data');
      return false;
    } finally {
      setLoading(false);
    }
  }, [businessId, domain]);

  return { data, loading, error, fetch, save };
}
