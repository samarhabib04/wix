declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

export const GA_MEASUREMENT_ID = 'G-7XN44Y0L0B';

// Add this safety check at the beginning of each function
export const initGA = () => {
  if (typeof window === 'undefined') return;
  
  try {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
    
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID, {
      anonymize_ip: true,
      allow_google_signals: false,
      page_title: document.title,
      page_location: window.location.href,
    });
  } catch (error) {
  }
};

export const trackPageView = (url: string, title?: string) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  try {
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: url,
      page_title: title || document.title,
    });
  } catch (error) {
  }
};

// Track custom events
export const trackEvent = (action: string, category: string, label?: string, value?: number) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  });
};

// Track quiz completion
export const trackQuizCompletion = (breedMatches: string[]) => {
  trackEvent('quiz_completed', 'engagement', `breeds_matched_${breedMatches.length}`);
};

// Track listing views
export const trackListingView = (listingType: string, breed: string) => {
  trackEvent('listing_view', 'listings', `${listingType}_${breed}`);
};

// Track search
export const trackSearch = (searchTerm: string, category: string) => {
  trackEvent('search', 'engagement', `${category}_${searchTerm}`);
};


