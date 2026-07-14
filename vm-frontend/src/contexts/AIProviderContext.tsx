import { createContext, useContext, type ReactNode } from 'react';

interface AIProviderContextValue {
  providerName: string;
}

const AIProviderContext = createContext<AIProviderContextValue>({ providerName: 'deepseek' });

export function AIProviderProvider({ children }: { children: ReactNode }) {
  return (
    <AIProviderContext.Provider value={{ providerName: 'deepseek' }}>
      {children}
    </AIProviderContext.Provider>
  );
}

export function useAIProvider() {
  return useContext(AIProviderContext);
}
