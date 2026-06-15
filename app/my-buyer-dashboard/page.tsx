'use client';

import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Heart, Search, HelpCircle, Package, MessageSquare, Star, Settings } from "lucide-react";
import { useBuyerActivity } from "@/hooks/useBuyerActivity";

export default function BuyerDashboardHome() {
  const router = useRouter();
  const { data: recentActivity, isLoading } = useBuyerActivity();
  
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'wishlist':
        return <Heart className="h-4 w-4 text-rose-500" />;
      case 'message':
        return <MessageSquare className="h-4 w-4 text-orange-500" />;
      case 'order':
        return <Package className="h-4 w-4 text-purple-500" />;
      case 'quiz':
        return <HelpCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <Search className="h-4 w-4 text-gray-500" />;
    }
  };
  
  return (
    <div>
      <h2 className="text-2xl font-berkshire mb-6">Welcome to Your Dashboard</h2>
      
      <div className="space-y-6">
        <p className="text-gray-600">
          Manage your Dog Quest journey from this personalised dashboard. Track your favourite listings, communicate with sellers, and more.
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-gray-50 p-4 sm:p-6 rounded-lg border border-gray-100 hover:border-emerald-200 transition-colors">
            <Search className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-600 mb-3" />
            <h3 className="text-base sm:text-lg font-semibold mb-2">Browse Listings</h3>
            <p className="text-xs sm:text-sm text-gray-500 mb-4">Find your perfect dog companion from thousands of listings</p>
            <Button 
              onClick={() => router.push('/listings')} 
              className="w-full bg-brand-soft-green/20 border border-brand-soft-green text-brand-dark-green hover:bg-brand-soft-green/40 text-sm"
            >
              Find Dogs
            </Button>
          </div>

          <div className="bg-gray-50 p-4 sm:p-6 rounded-lg border border-gray-100 hover:border-orange-200 transition-colors">
            <MessageSquare className="h-6 w-6 sm:h-8 sm:w-8 text-orange-500 mb-3" />
            <h3 className="text-base sm:text-lg font-semibold mb-2">Messages</h3>
            <p className="text-xs sm:text-sm text-gray-500 mb-4">Chat with sellers and manage conversations</p>
            <Button 
              onClick={() => router.push('/my-buyer-dashboard/messages')} 
              className="w-full bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 text-sm"
            >
              View Messages
            </Button>
          </div>
          
          <div className="bg-gray-50 p-4 sm:p-6 rounded-lg border border-gray-100 hover:border-rose-200 transition-colors">
            <Heart className="h-6 w-6 sm:h-8 sm:w-8 text-rose-500 mb-3" />
            <h3 className="text-base sm:text-lg font-semibold mb-2">View Wishlist</h3>
            <p className="text-xs sm:text-sm text-gray-500 mb-4">See all of your favourite listings in one place</p>
            <Button 
              onClick={() => router.push('/my-buyer-dashboard/wishlist')} 
              className="w-full bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-sm"
            >
              My Wishlist
            </Button>
          </div>
          
          <div className="bg-gray-50 p-4 sm:p-6 rounded-lg border border-gray-100 hover:border-blue-200 transition-colors">
            <HelpCircle className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 mb-3" />
            <h3 className="text-base sm:text-lg font-semibold mb-2">Take the Quiz</h3>
            <p className="text-xs sm:text-sm text-gray-500 mb-4">Find breeds that match your lifestyle and preferences</p>
            <Button 
              onClick={() => router.push('/quiz')} 
              className="w-full bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-sm"
            >
              Start Quiz
            </Button>
          </div>

          <div className="bg-gray-50 p-4 sm:p-6 rounded-lg border border-gray-100 hover:border-purple-200 transition-colors">
            <Package className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500 mb-3" />
            <h3 className="text-base sm:text-lg font-semibold mb-2">My Orders</h3>
            <p className="text-xs sm:text-sm text-gray-500 mb-4">Track your Dog Quest Shop purchases and order history</p>
            <Button 
              onClick={() => router.push('/my-buyer-dashboard/orders')} 
              className="w-full bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-sm"
            >
              View Orders
            </Button>
          </div>

          <div className="bg-gray-50 p-4 sm:p-6 rounded-lg border border-gray-100 hover:border-green-200 transition-colors">
            <Star className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 mb-3" />
            <h3 className="text-base sm:text-lg font-semibold mb-2">Reviews</h3>
            <p className="text-xs sm:text-sm text-gray-500 mb-4">Manage your sellers and business reviews and feedback</p>
            <Button 
              onClick={() => router.push('/my-buyer-dashboard/reviews')} 
              className="w-full bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 text-sm"
            >
              My Reviews
            </Button>
          </div>

          <div className="bg-gray-50 p-4 sm:p-6 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
            <Settings className="h-6 w-6 sm:h-8 sm:w-8 text-gray-500 mb-3" />
            <h3 className="text-base sm:text-lg font-semibold mb-2">Settings</h3>
            <p className="text-xs sm:text-sm text-gray-500 mb-4">Manage your account settings and preferences</p>
            <Button 
              onClick={() => router.push('/my-buyer-dashboard/account-settings')} 
              className="w-full bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 text-sm"
            >
              Account Settings
            </Button>
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-100">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            {isLoading ? (
              <div className="text-center text-gray-500">Loading your recent activity...</div>
            ) : recentActivity && recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 pb-3 border-b border-gray-200 last:border-b-0 last:pb-0">
                    <div className="flex-shrink-0 mt-0.5">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{activity.text}</p>
                      <p className="text-xs text-gray-500">{formatTimeAgo(activity.time)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500">
                <p>No recent activity yet</p>
                <p className="text-xs mt-1">Start browsing listings or take the quiz to see your activity here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}




























