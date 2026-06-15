'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Package, MessageSquare, Heart, Star, Settings, Bell, ShoppingBag, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { StripeConnectOnboarding } from '@/components/seller-dashboard/StripeConnectOnboarding';
import { ReservationManagement } from '@/components/seller-dashboard/ReservationManagement';
import { BoostModal } from '@/components/BoostModal';
import SellerEngagementWidget from '@/components/seller-dashboard/SellerEngagementWidget';
import { useState, useEffect } from 'react';

interface DashboardStats {
  totalListings: number;
  activeListings: number;
  studListings: number;
  publishedApprovedStudListings: number;
  showcaseListings: number;
  unreadNotifications: number;
  totalReviews: number;
}

export default function SellerDashboardHome() {
  const router = useRouter();
  const { user } = useAuth();
  
  // Boost modal state
  const [isBoostModalOpen, setIsBoostModalOpen] = useState(false);
  const [boostListingId, setBoostListingId] = useState<string>('');
  const [boostListingType, setBoostListingType] = useState<'sale' | 'stud'>('sale');
  const [boostListingTitle, setBoostListingTitle] = useState<string>('');

  // Check for boost modal state on navigation
  useEffect(() => {
    // Check URL params for boost modal
    const params = new URLSearchParams(window.location.search);
    if (params.get('openBoostModal') === 'true') {
      setBoostListingId(params.get('listingId') || '');
      setBoostListingType((params.get('listingType') as 'sale' | 'stud') || 'sale');
      setBoostListingTitle(params.get('listingTitle') || '');
      setIsBoostModalOpen(true);
      
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const fetchDashboardStats = async () => {
    if (!user?.id) {
      return {
        totalListings: 0,
        activeListings: 0,
        studListings: 0,
        publishedApprovedStudListings: 0,
        showcaseListings: 0,
        unreadNotifications: 0,
        totalReviews: 0,
      };
    }

    // Fetch sale listings count
    const saleListingsQuery = await supabase
      .from('sale_listings')
      .select('id, is_published, admin_approved', { count: 'exact' })
      .eq('seller_id', user.id)
      .or('is_deleted.is.null,is_deleted.eq.false');

    // Fetch stud listings count
    const studListingsQuery = await supabase
      .from('stud_listings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Fetch approved + published stud listings count
    const approvedPublishedStudListingsQuery = await supabase
      .from('stud_listings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_published', true)
      .eq('admin_approved', true);

    // Fetch showcase listings count
    const showcaseListingsQuery = await supabase
      .from('showcase_listings')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', user.id);

    // Fetch notifications count
    const notificationsQuery = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false);

    const activeListings = saleListingsQuery.data?.filter(l => l.is_published && l.admin_approved).length || 0;

    const result: DashboardStats = {
      totalListings: (saleListingsQuery.count || 0) + (studListingsQuery.count || 0) + (showcaseListingsQuery.count || 0),
      activeListings,
      studListings: studListingsQuery.count || 0,
      publishedApprovedStudListings: approvedPublishedStudListingsQuery.count || 0,
      showcaseListings: showcaseListingsQuery.count || 0,
      unreadNotifications: notificationsQuery.count || 0,
      totalReviews: 0,
    };

    return result;
  };

  const { data: stats, isLoading } = useQuery({
    queryKey: ['seller-dashboard-stats', user?.id],
    queryFn: fetchDashboardStats,
    enabled: !!user?.id,
  });

  if (isLoading) {
    return <div>Loading dashboard...</div>;
  }
  
  return (
    <div>
      <h2 className="text-2xl font-berkshire mb-6">Welcome to Your Seller Dashboard</h2>
      
      <div className="space-y-6">
        <p className="text-gray-600">
          Manage your listings, track your performance, and connect with potential buyers.
        </p>

        <SellerEngagementWidget />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Listings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-brand-dark-green">{stats?.totalListings || 0}</div>
              <p className="text-xs text-gray-600 mt-1">{stats?.activeListings || 0} active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-brand-dark-green">{stats?.totalReviews || 0}</div>
              <p className="text-xs text-gray-600 mt-1">From buyers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Stud Listings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-brand-dark-green">{stats?.studListings || 0}</div>
              <p className="text-xs text-gray-600 mt-1">
                {stats?.publishedApprovedStudListings || 0} published &amp; approved
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-brand-dark-green">{stats?.unreadNotifications || 0}</div>
              <p className="text-xs text-gray-600 mt-1">Unread updates</p>
            </CardContent>
          </Card>
        </div>

        {/* Stripe Connect and Reservations */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <StripeConnectOnboarding />
          <ReservationManagement sellerId={user?.id || ''} />
        </div>
        
        {/* Quick Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="relative bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-4 sm:p-6 rounded-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <Plus className="h-6 w-6 sm:h-8 sm:w-8 text-white mb-3" />
              <h3 className="text-base sm:text-lg font-semibold mb-2 text-white">Add New Listing</h3>
              <p className="text-xs sm:text-sm text-white/90 mb-4">Create a new puppy, stud, or showcase listing</p>
              <Button 
                onClick={() => router.push('/add-listing')} 
                className="w-full bg-white/20 backdrop-blur-sm border border-white/40 text-white hover:bg-white/30 text-sm"
              >
                Create Listing
              </Button>
            </div>
          </div>

          {/* Boost - placed near top as key monetisation feature (especially visible on mobile) */}
          <div className="relative bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 p-4 sm:p-6 rounded-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-white mb-3" />
              <h3 className="text-base sm:text-lg font-semibold mb-2 text-white">Boost Listings</h3>
              <p className="text-xs sm:text-sm text-white/90 mb-4">Increase visibility of your listings</p>
              <Button 
                onClick={() => router.push('/boost-listing')} 
                className="w-full bg-white/20 backdrop-blur-sm border border-white/40 text-white hover:bg-white/30 text-sm"
              >
                View Boost Options
              </Button>
            </div>
          </div>

          <div className="relative bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-500 p-4 sm:p-6 rounded-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <Package className="h-6 w-6 sm:h-8 sm:w-8 text-white mb-3" />
              <h3 className="text-base sm:text-lg font-semibold mb-2 text-white">My Listings</h3>
              <p className="text-xs sm:text-sm text-white/90 mb-4">View and manage all your active listings</p>
              <Button 
                onClick={() => router.push('/my-seller-dashboard/listings')} 
                className="w-full bg-white/20 backdrop-blur-sm border border-white/40 text-white hover:bg-white/30 text-sm"
              >
                View Listings
              </Button>
            </div>
          </div>

          <div className="relative bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 p-4 sm:p-6 rounded-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <MessageSquare className="h-6 w-6 sm:h-8 sm:w-8 text-white mb-3" />
              <h3 className="text-base sm:text-lg font-semibold mb-2 text-white">Messages</h3>
              <p className="text-xs sm:text-sm text-white/90 mb-4">Respond to buyer inquiries and questions</p>
              <Button 
                onClick={() => router.push('/my-seller-dashboard/messages')} 
                className="w-full bg-white/20 backdrop-blur-sm border border-white/40 text-white hover:bg-white/30 text-sm"
              >
                View Messages
              </Button>
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 sm:p-6 rounded-lg border border-gray-100 hover:border-rose-200 transition-colors">
            <Heart className="h-6 w-6 sm:h-8 sm:w-8 text-rose-500 mb-3" />
            <h3 className="text-base sm:text-lg font-semibold mb-2">Wishlist</h3>
            <p className="text-xs sm:text-sm text-gray-500 mb-4">Items you've saved for later</p>
            <Button 
              onClick={() => router.push('/my-seller-dashboard/wishlist')} 
              className="w-full bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-sm"
            >
              My Wishlist
            </Button>
          </div>

          <div className="bg-gray-50 p-4 sm:p-6 rounded-lg border border-gray-100 hover:border-purple-200 transition-colors">
            <ShoppingBag className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500 mb-3" />
            <h3 className="text-base sm:text-lg font-semibold mb-2">My Orders</h3>
            <p className="text-xs sm:text-sm text-gray-500 mb-4">Track your Dog Quest Shop purchases</p>
            <Button 
              onClick={() => router.push('/my-seller-dashboard/orders')} 
              className="w-full bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-sm"
            >
              View Orders
            </Button>
          </div>

          <div className="bg-gray-50 p-4 sm:p-6 rounded-lg border border-gray-100 hover:border-yellow-200 transition-colors">
            <Star className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500 mb-3" />
            <h3 className="text-base sm:text-lg font-semibold mb-2">Reviews</h3>
            <p className="text-xs sm:text-sm text-gray-500 mb-4">View reviews from your buyers</p>
            <Button 
              onClick={() => router.push('/my-seller-dashboard/reviews')} 
              className="w-full bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200 text-sm"
            >
              My Reviews
            </Button>
          </div>

          <div className="bg-gray-50 p-4 sm:p-6 rounded-lg border border-gray-100 hover:border-indigo-200 transition-colors">
            <Bell className="h-6 w-6 sm:h-8 sm:w-8 text-indigo-500 mb-3" />
            <h3 className="text-base sm:text-lg font-semibold mb-2">Notifications</h3>
            <p className="text-xs sm:text-sm text-gray-500 mb-4">Stay updated with important alerts</p>
            <Button 
              onClick={() => router.push('/my-seller-dashboard/notifications')} 
              className="w-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 text-sm"
            >
              View Notifications
            </Button>
          </div>

          <div className="bg-gray-50 p-4 sm:p-6 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
            <Settings className="h-6 w-6 sm:h-8 sm:w-8 text-gray-500 mb-3" />
            <h3 className="text-base sm:text-lg font-semibold mb-2">Settings</h3>
            <p className="text-xs sm:text-sm text-gray-500 mb-4">Manage your account and preferences</p>
            <Button 
              onClick={() => router.push('/my-seller-dashboard/settings')} 
              className="w-full bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 text-sm"
            >
              Account Settings
            </Button>
          </div>
        </div>

        {/* Performance Tips */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <h3 className="text-lg font-semibold mb-4">Performance Tips</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Add high-quality photos to your listings to attract more buyers</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Respond to messages within 24 hours to maintain a good reputation</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Keep your listings up-to-date with current availability</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Consider boosting your listings for increased visibility</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Boost Modal */}
      {boostListingId && (
        <BoostModal
          isOpen={isBoostModalOpen}
          onClose={() => setIsBoostModalOpen(false)}
          listingId={boostListingId}
          listingType={boostListingType}
          listingTitle={boostListingTitle}
        />
      )}
    </div>
  );
}


