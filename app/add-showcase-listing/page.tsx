'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ShowcaseListingForm from "@/components/seller-dashboard/forms/ShowcaseListingForm";
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/ui/loading-spinner';

export default function AddShowcaseListingPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, role } = useAuth();
  const [maxWaitTimeReached, setMaxWaitTimeReached] = useState(false);

  useEffect(() => {
    // Maximum wait time of 3 seconds - prevent infinite loading
    const timeoutId = setTimeout(() => {
      setMaxWaitTimeReached(true);
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, []);

  // Check authentication and role
  useEffect(() => {
    // Wait for auth to load (max 3 seconds)
    if (authLoading && !maxWaitTimeReached) return;
    
    // Redirect to login if not authenticated after max wait
    if (!user && maxWaitTimeReached) {
      router.push(`/auth/login?next=${encodeURIComponent('/add-showcase-listing')}`);
      return;
    }
    
    // Check role only if it's loaded
    if (role !== null && role !== 'seller' && role !== 'admin') {
      router.push('/my-seller-dashboard');
      return;
    }
  }, [user, authLoading, role, router, maxWaitTimeReached]);

  // Show loading only briefly (max 3 seconds)
  if (authLoading && !maxWaitTimeReached) {
    return <LoadingSpinner fullPage label="Loading..." />;
  }

  return (
    <div className="bg-pink-50 w-full min-h-screen py-6 px-4">
      <div className="container mx-auto space-y-6">
        <div className="flex flex-col space-y-2 mb-12">
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="mb-2 text-gray-600 -ml-2"
              asChild
            >
              <Link href="/seller-dashboard/create-listing">
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back to Select Listing Type
              </Link>
            </Button>
          </div>
          
          <h1 className="text-4xl font-berkshire text-pink-600 mb-2">Add Showcase Listing</h1>
          <p className="text-gray-600">
            Create a showcase listing for your puppy or litter. Fill in the details below and submit for review.
          </p>
        </div>

        <ShowcaseListingForm />
      </div>
    </div>
  );
}




























