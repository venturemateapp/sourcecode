import { createContext, useContext, type ReactNode } from 'react';

interface AIProviderContextValue {
  providerName: string;
}

const AIProviderContext = createContext<AIProviderContextValue>({ providerName: 'opper' });

export function AIProviderProvider({ children }: { children: ReactNode }) {
  return (
    <AIProviderContext.Provider value={{ providerName: 'opper' }}>
      {children}
    </AIProviderContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAIProvider() {
  return useContext(AIProviderContext);
}
