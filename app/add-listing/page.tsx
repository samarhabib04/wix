'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/ui/loading-spinner';

export default function AddListingPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [maxWaitTimeReached, setMaxWaitTimeReached] = useState(false);

  useEffect(() => {
    // Maximum wait time of 3 seconds - prevent infinite loading
    const timeoutId = setTimeout(() => {
      setMaxWaitTimeReached(true);
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    // Wait for auth to load (max 3 seconds)
    if (isLoading && !maxWaitTimeReached) return;

    // Redirect to the listing type selection page
    router.replace('/seller-dashboard/create-listing');
  }, [router, isLoading, maxWaitTimeReached]);

  // Show loading only briefly (max 3 seconds)
  if (isLoading && !maxWaitTimeReached) {
    return <LoadingSpinner fullPage label="Loading..." />;
  }

  return <LoadingSpinner fullPage label="Redirecting..." />;
}




























