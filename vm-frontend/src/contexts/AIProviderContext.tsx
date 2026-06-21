import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { graphqlRequest } from '../lib/api';

export interface AIProviderInfo {
  name: string;
  model: string;
  endpoint: string;
  configured: boolean;
  available: boolean;
  isDefault: boolean;
  message: string;
}

interface AIProviderStatus {
  activeProvider: string;
  allowOverride: boolean;
  providers: AIProviderInfo[];
}

interface AIProviderContextValue extends AIProviderStatus {
  selectedProvider: string;
  selectedProviderInfo: AIProviderInfo | null;
  loading: boolean;
  error: string | null;
  setSelectedProvider: (provider: string) => void;
  refreshProviders: (checkHealth?: boolean) => Promise<void>;
}

const STORAGE_KEY = 'venturemate_ai_provider';

const STATUS_QUERY = `
  query AIProviderStatus($checkHealth: Boolean) {
    aiProviderStatus(checkHealth: $checkHealth) {
      activeProvider
      allowOverride
      providers {
        name
        model
        endpoint
        configured
        available
        isDefault
        message
      }
    }
  }
`;

const fallbackStatus: AIProviderStatus = {
  activeProvider: 'openrouter',
  allowOverride: true,
  providers: [
    {
      name: 'openrouter',
      model: 'google/gemini-2.5-flash',
      endpoint: 'https://openrouter.ai/api/v1/chat/completions',
      configured: true,
      available: true,
      isDefault: true,
      message: 'OpenRouter default provider',
    },
  ],
};

const AIProviderContext = createContext<AIProviderContextValue | undefined>(undefined);

export function AIProviderProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AIProviderStatus>(fallbackStatus);
  const [selectedProvider, setSelectedProviderState] = useState(() => localStorage.getItem(STORAGE_KEY) || 'openrouter');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshProviders = useCallback(async (checkHealth = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await graphqlRequest<{ aiProviderStatus: AIProviderStatus }>(STATUS_QUERY, { checkHealth });
      const nextStatus = data.aiProviderStatus;
      setStatus(nextStatus);
      setSelectedProviderState(current => {
        const usable = nextStatus.providers.some(provider => provider.name === current && provider.configured);
        const next = usable ? current : (nextStatus.activeProvider || 'openrouter');
        localStorage.setItem(STORAGE_KEY, next);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load AI provider status');
      setStatus(fallbackStatus);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshProviders(false);
  }, [refreshProviders]);

  const setSelectedProvider = useCallback((provider: string) => {
    const normalized = provider.trim().toLowerCase() || 'openrouter';
    setSelectedProviderState(normalized);
    localStorage.setItem(STORAGE_KEY, normalized);
  }, []);

  const selectedProviderInfo = useMemo(
    () => status.providers.find(provider => provider.name === selectedProvider) || null,
    [selectedProvider, status.providers],
  );

  return (
    <AIProviderContext.Provider value={{
      ...status,
      selectedProvider,
      selectedProviderInfo,
      loading,
      error,
      setSelectedProvider,
      refreshProviders,
    }}>
      {children}
    </AIProviderContext.Provider>
  );
}

export function useAIProvider() {
  const context = useContext(AIProviderContext);
  if (!context) {
    throw new Error('useAIProvider must be used within AIProviderProvider');
  }
  return context;
}
