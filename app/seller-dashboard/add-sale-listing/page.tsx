'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/ui/loading-spinner';

export default function SellerDashboardAddSaleListingPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the root-level add-sale-listing page
    router.replace('/add-sale-listing');
  }, [router]);

  return <LoadingSpinner fullPage label="Redirecting..." />;
}




























