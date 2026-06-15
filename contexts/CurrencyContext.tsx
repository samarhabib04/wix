
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { detectUserCurrency, CURRENCIES, CurrencyInfo } from '@/services/currencyService';

interface CurrencyContextType {
  currency: 'EUR' | 'GBP';
  currencyInfo: CurrencyInfo;
  setCurrency: (currency: 'EUR' | 'GBP') => void;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<'EUR' | 'GBP'>('EUR');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeCurrency = async () => {
      try {
        const detectedCurrency = await detectUserCurrency();
        setCurrencyState(detectedCurrency);

      } catch (error) {
        console.error('Failed to detect currency:', error);
        setCurrencyState('EUR');
      } finally {
        setIsLoading(false);
      }
    };

    initializeCurrency();
  }, []);

  const setCurrency = (newCurrency: 'EUR' | 'GBP') => {
    setCurrencyState(newCurrency);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('user_currency', newCurrency);

      }
    } catch (error) {
    }
  };

  const currencyInfo = CURRENCIES[currency];

  return (
    <CurrencyContext.Provider value={{
      currency,
      currencyInfo,
      setCurrency,
      isLoading
    }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
