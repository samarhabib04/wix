'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import StudListingForm from "@/components/seller-dashboard/forms/StudListingForm";
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import LoadingSpinner from '@/components/ui/loading-spinner';

export default function AddStudListingPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, role } = useAuth();
  const [maxWaitTimeReached, setMaxWaitTimeReached] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    // Maximum wait time of 3 seconds - prevent infinite loading
    const timeoutId = setTimeout(() => {
      setMaxWaitTimeReached(true);
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, []);

  // Check session directly from Supabase as a fallback
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // User has a session, check role from profile
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            const userRole = profile.role;
            if (userRole !== 'seller' && userRole !== 'admin') {
              router.push('/my-seller-dashboard');
              return;
            }
          }
        } else if (maxWaitTimeReached) {
          // No session and max wait reached, redirect to login
          router.push(`/auth/login?next=${encodeURIComponent('/add-stud-listing')}`);
          return;
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setCheckingSession(false);
      }
    };

    // Only check session if auth context hasn't loaded user yet
    if (!user && (authLoading || maxWaitTimeReached)) {
      checkSession();
    } else {
      setCheckingSession(false);
    }
  }, [user, authLoading, maxWaitTimeReached, router]);

  // Check authentication and role from auth context
  useEffect(() => {
    // Wait for auth to load (max 3 seconds)
    if (authLoading && !maxWaitTimeReached) return;
    
    // If we have a user from auth context, check role
    if (user) {
      // Check role only if it's loaded
      if (role !== null && role !== 'seller' && role !== 'admin') {
        router.push('/my-seller-dashboard');
        return;
      }
    } else if (maxWaitTimeReached && !checkingSession) {
      // No user and session check is done, redirect to login
      router.push(`/auth/login?next=${encodeURIComponent('/add-stud-listing')}`);
      return;
    }
  }, [user, authLoading, role, router, maxWaitTimeReached, checkingSession]);

  // Show loading while checking auth or session
  if ((authLoading && !maxWaitTimeReached) || checkingSession) {
    return <LoadingSpinner fullPage label="Loading..." />;
  }

  // Don't render form if we don't have a user yet (will redirect)
  if (!user && maxWaitTimeReached && !checkingSession) {
    return <LoadingSpinner fullPage label="Redirecting..." />;
  }

  // Don't render form if role is wrong (will redirect)
  if (role !== null && role !== 'seller' && role !== 'admin') {
    return <LoadingSpinner fullPage label="Redirecting..." />;
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-blue-100 w-full min-h-screen py-6 px-4">
      <div className="container mx-auto space-y-6">
        <div className="flex flex-col space-y-2">
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
          
          <h1 className="text-4xl font-berkshire text-blue-600 mb-2">Add Stud Listing</h1>
          <p className="text-gray-600">
            Create a stud listing for your male dog. Fill in the details below and submit for review.
          </p>
        </div>

        <StudListingForm />
      </div>
    </div>
  );
}




























