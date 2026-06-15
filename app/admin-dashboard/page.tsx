'use client';

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase/client";

export default function AdminDashboardHome() {
  // Fetch dashboard statistics
  const { data: stats } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      // Get active listings count
      const [saleListings, studListings, showcaseListings] = await Promise.all([
        supabase
          .from('sale_listings')
          .select('id', { count: 'exact' })
          .eq('admin_approved', true)
          .eq('is_published', true),
        supabase
          .from('stud_listings')
          .select('id', { count: 'exact' })
          .eq('admin_approved', true)
          .eq('is_published', true),
        supabase
          .from('showcase_listings')
          .select('id', { count: 'exact' })
          .eq('admin_approved', true)
          .eq('is_published', true)
      ]);

      // Get user count from last week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const { count: newUsersCount } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', oneWeekAgo.toISOString());

      // Get revenue directly from Stripe
      const { data: stripeRevenue, error: revenueError } = await supabase.functions.invoke('get-stripe-revenue');
      
      if (revenueError) {
        console.error('Error fetching Stripe revenue:', revenueError);
      }

      const totalActiveListings = (saleListings.count || 0) + (studListings.count || 0) + (showcaseListings.count || 0);
      const totalRevenue = stripeRevenue?.revenue || 0;

      return {
        activeListings: totalActiveListings,
        newUsers: newUsersCount ?? 0,
        revenue: totalRevenue,
        paymentCount: stripeRevenue?.payment_count || 0,
      };
    }
  });

  // Fetch recent activity
  const { data: recentActivity } = useQuery({
    queryKey: ['admin-recent-activity'],
    queryFn: async () => {
      // Get verified Stripe transactions
      const { data: stripeData } = await supabase.functions.invoke('get-stripe-revenue');
      const recentTransactions = stripeData?.recent_transactions || [];

      // Get recent user registrations (always real)
      const { data: newUsers } = await supabase
        .from('user_profiles')
        .select('id, created_at, first_name, last_name, email, role')
        .order('created_at', { ascending: false })
        .limit(10);

      // Get recent approved sale listings (always real)
      const { data: recentListings } = await supabase
        .from('sale_listings')
        .select(`
          id,
          title,
          breed,
          created_at,
          seller_id
        `)
        .eq('admin_approved', true)
        .order('created_at', { ascending: false })
        .limit(10);

      // Get seller names
      const sellerIds = recentListings?.map(listing => listing.seller_id) || [];
      const { data: sellers } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name')
        .in('id', sellerIds);

      const activities: Array<{ id: string; text: string; time: string }> = [];

      // Add verified Stripe transactions only
      recentTransactions.forEach((transaction: any) => {
        const currency = transaction.currency === 'EUR' ? '€' : '£';
        const description = transaction.metadata?.type || transaction.description || 'Payment';
        activities.push({
          id: transaction.id,
          text: `${description}: ${currency}${transaction.amount.toFixed(2)}`,
          time: new Date(transaction.created * 1000).toISOString()
        });
      });

      // Add approved listings (real submissions)
      recentListings?.forEach(listing => {
        const seller = sellers?.find(s => s.id === listing.seller_id);
        const userName = seller 
          ? `${seller.first_name || ''} ${seller.last_name || ''}`.trim()
          : 'Unknown User';
        activities.push({
          id: listing.id,
          text: `New ${listing.breed} listing approved by ${userName}`,
          time: listing.created_at
        });
      });

      // Add new user registrations (always real)
      newUsers?.forEach(user => {
        const userName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
        if (user.created_at) {
          activities.push({
            id: user.id,
            text: `New ${user.role} registered: ${userName}`,
            time: user.created_at
          });
        }
      });

      // Sort by time and return latest 10
      return activities
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        .slice(0, 10);
    }
  });

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
      <p className="text-muted-foreground">
        Welcome to the Dog Quest admin dashboard. Use the sidebar to navigate to different sections.
      </p>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Active Listings</CardTitle>
            <CardDescription>Total active listings across the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats?.activeListings || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Sale, Stud & Showcase combined</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>New Users</CardTitle>
            <CardDescription>New user registrations this week</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats?.newUsers || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Past 7 days</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Revenue</CardTitle>
            <CardDescription>Total platform revenue this month</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">€{(stats?.revenue || 0).toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              From Stripe ({stats?.paymentCount || 0} successful payments)
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Recent activity across the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity && recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div key={activity.id} className="border-b pb-2 last:border-b-0">
                  <p className="font-medium">{activity.text}</p>
                  <p className="text-sm text-muted-foreground">{formatTimeAgo(activity.time)}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">No recent activity found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



