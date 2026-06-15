
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, ExternalLink } from 'lucide-react';
import { initGA } from '@/lib/analytics';

export const CookieConsent = () => {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('cookieConsent');

    if (!consent) {

      setShowBanner(true);
    } else if (consent === 'accepted') {

      // Initialize GA if consent was previously given
      initGA();
    } else {

    }
  }, []);

  const handleAccept = () => {

    localStorage.setItem('cookieConsent', 'accepted');
    setShowBanner(false);
    initGA();
  };

  const handleDecline = () => {

    localStorage.setItem('cookieConsent', 'declined');
    setShowBanner(false);
  };

  const handleClose = () => {

    localStorage.setItem('cookieConsent', 'declined');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[10000] p-3 sm:p-4">
      <Card className="mx-auto max-w-4xl border-2 border-brand-dark-green bg-white shadow-lg">
        <div className="relative p-4 sm:p-6">
          {/* Close button for mobile */}
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close cookie banner"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>

          <div className="w-full sm:pr-0">
            <h3 className="text-lg sm:text-xl font-semibold text-brand-dark-green mb-2">
              🍪 Cookie Consent
            </h3>
            <p className="text-sm sm:text-base text-gray-600 mb-3 leading-relaxed">
              We use cookies and analytics to improve your experience on Dog Quest. 
              This helps us understand how you use our site and make it better for finding your perfect companion.
            </p>
            
            {/* Policy Links */}
            <div className="mb-4 space-y-1">
              <a
                href="/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-brand-dark-green hover:text-brand-dark-green/80 hover:underline transition-colors mr-4"
              >
                <span>Privacy Policy</span>
                <ExternalLink className="h-3 w-3" />
              </a>
              <a
                href="/cookie-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-brand-dark-green hover:text-brand-dark-green/80 hover:underline transition-colors"
              >
                <span>Cookie Policy</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            
            {/* Mobile-first button layout with full width */}
            <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
              <Button
                variant="outline"
                onClick={handleDecline}
                className="w-full sm:w-auto border-gray-300 text-gray-600 hover:bg-gray-50 order-2 sm:order-1"
              >
                Decline
              </Button>
              <Button
                onClick={handleAccept}
                className="w-full sm:w-auto bg-brand-dark-green hover:bg-brand-dark-green/90 text-white order-1 sm:order-2"
              >
                Accept Cookies
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
