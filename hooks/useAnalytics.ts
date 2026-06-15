
import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { trackPageView } from '@/lib/analytics';

export const useAnalytics = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Get consent status from localStorage
    const cookieConsent = localStorage.getItem('cookieConsent');
    
    // Only track if user has given consent
    if (cookieConsent === 'accepted' && pathname !== null) {
      const search = searchParams?.toString();
      trackPageView(search ? `${pathname}?${search}` : pathname);
    }
  }, [pathname, searchParams]);
};
