import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { graphqlRequest } from '../lib/api';
import { useAuth } from './AuthContext';

const EXCHANGE_RATES_QUERY = `
  query ExchangeRates {
    exchangeRates
  }
`;

export interface CurrencyRate {
  code: string;
  name: string;
  symbol: string;
  rate: number;
}

interface CurrencyContextValue {
  currency: string;
  rates: CurrencyRate[];
  setCurrency: (code: string) => Promise<void>;
  convert: (usdAmount: number) => number;
  format: (usdAmount: number) => string;
  formatWithCode: (usdAmount: number) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

const defaultRates: CurrencyRate[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$', rate: 1 },
  { code: 'EUR', name: 'Euro', symbol: '€', rate: 0.92 },
  { code: 'GBP', name: 'British Pound', symbol: '£', rate: 0.79 },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵', rate: 15.50 },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', rate: 1550.00 },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', rate: 145.00 },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', rate: 18.20 },
];

function findRate(rates: CurrencyRate[], code: string): CurrencyRate {
  return rates.find(r => r.code === code) || rates[0];
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { user, updateProfile } = useAuth();
  const [rates, setRates] = useState<CurrencyRate[]>(defaultRates);

  const currency = user?.preferredCurrency || 'USD';

  useEffect(() => {
    let cancelled = false;
    graphqlRequest<{ exchangeRates: string }>(EXCHANGE_RATES_QUERY).then(data => {
      if (!cancelled) {
        try {
          const parsed: CurrencyRate[] = JSON.parse(data.exchangeRates);
          if (parsed.length > 0) setRates(parsed);
        } catch { /* keep defaults */ }
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const setCurrency = useCallback(async (code: string) => {
    await updateProfile({ preferredCurrency: code });
  }, [updateProfile]);

  const convert = useCallback((usdAmount: number): number => {
    if (currency === 'USD') return usdAmount;
    const rate = findRate(rates, currency).rate;
    return usdAmount * rate;
  }, [currency, rates]);

  const format = useCallback((usdAmount: number): string => {
    const r = findRate(rates, currency);
    const converted = usdAmount * r.rate;
    if (converted >= 1000000) return `${r.symbol}${(converted / 1000000).toFixed(1)}M`;
    if (converted >= 1000) return `${r.symbol}${(converted / 1000).toFixed(1)}K`;
    return `${r.symbol}${Math.round(converted).toLocaleString()}`;
  }, [currency, rates]);

  const formatWithCode = useCallback((usdAmount: number): string => {
    const r = findRate(rates, currency);
    const converted = usdAmount * r.rate;
    if (converted >= 1000000) return `${r.symbol}${(converted / 1000000).toFixed(1)}M ${r.code}`;
    if (converted >= 1000) return `${r.symbol}${(converted / 1000).toFixed(1)}K ${r.code}`;
    return `${r.symbol}${Math.round(converted).toLocaleString()} ${r.code}`;
  }, [currency, rates]);

  return (
    <CurrencyContext.Provider value={{ currency, rates, setCurrency, convert, format, formatWithCode }}>
      {children}
    </CurrencyContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}
