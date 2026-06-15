
export interface CurrencyInfo {
  code: 'EUR' | 'GBP';
  symbol: string;
  name: string;
  exchangeRate: number;
}

export const CURRENCIES: Record<string, CurrencyInfo> = {
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    exchangeRate: 1, // Base currency
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    exchangeRate: 0.85, // Approximate rate - in production, fetch from API
  },
};

export const detectUserCurrency = async (): Promise<'EUR' | 'GBP'> => {
  // Ensure we're in a browser environment
  if (typeof window === 'undefined') {

    return 'EUR';
  }

  // Check for debug override first (for testing)
  try {
    const debugCurrency = new URLSearchParams(window.location.search).get('debug_currency');
    if (debugCurrency === 'EUR' || debugCurrency === 'GBP') {

      return debugCurrency;
    }
  } catch (error) {
  }

  // Check localStorage for user preference
  try {
    const savedCurrency = localStorage.getItem('user_currency');
    if (savedCurrency === 'EUR' || savedCurrency === 'GBP') {

      return savedCurrency;
    }
  } catch (error) {
  }

  // Try to detect currency from IP geolocation with timeout
  try {
    // Use ipapi.co for IP geolocation (free tier allows 1000 requests/day)
    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch('https://ipapi.co/json/', {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Geolocation API failed with status: ${response.status}`);
    }
    
    const data = await response.json();

    // More specific handling for UK and Northern Ireland
    const isUKOrNorthernIreland = data.country_code === 'GB' || 
                                 (data.country_code === 'IE' && data.city && 
                                  ['Belfast', 'Derry', 'Lisburn', 'Newtownabbey', 'Bangor', 'Craigavon'].includes(data.city));
    
    // Additional check for UK postal codes if available
    const hasUKPostalCode = data.postal && /^[A-Z]{1,2}[0-9R][0-9A-Z]?\s?[0-9][A-Z]{2}$/i.test(data.postal);
    
    const detectedCurrency = (isUKOrNorthernIreland || hasUKPostalCode) ? 'GBP' : 'EUR';

    return detectedCurrency;
  } catch (error) {
    // Handle different error types gracefully
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
      } else if (error.message.includes('Failed to fetch')) {
      } else {
      }
    } else {
    }
    // Default to EUR if detection fails
    return 'EUR';
  }
};

export const convertPrice = (priceInEUR: number, toCurrency: 'EUR' | 'GBP'): number => {
  if (toCurrency === 'EUR') return priceInEUR;
  return priceInEUR * CURRENCIES.GBP.exchangeRate;
};

export const formatPrice = (price: number, currency: 'EUR' | 'GBP'): string => {
  const convertedPrice = convertPrice(price, currency);
  const currencyInfo = CURRENCIES[currency];
  return `${currencyInfo.symbol}${convertedPrice.toFixed(2)}`;
};
