'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/ui/loading-spinner';

export default function SellerDashboardAddStudListingPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the root-level add-stud-listing page
    router.replace('/add-stud-listing');
  }, [router]);

  return <LoadingSpinner fullPage label="Redirecting..." />;
}




























