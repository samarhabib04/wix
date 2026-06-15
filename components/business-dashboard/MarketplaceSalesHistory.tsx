'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase/client';
import { Package, Euro, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface MarketplaceSale {
  id: string;
  product_id: string;
  business_id: string;
  buyer_id: string | null;
  quantity: number;
  unit_price: number;
  total_amount: number;
  commission_amount: number;
  business_payout_amount: number;
  stripe_payment_intent_id: string;
  stripe_transfer_id: string | null;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  payout_status: 'pending' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  marketplace_products?: {
    name: string;
  };
}

interface MarketplaceSalesHistoryProps {
  businessId: string;
}

export default function MarketplaceSalesHistory({ businessId }: MarketplaceSalesHistoryProps) {
  const [sales, setSales] = useState<MarketplaceSale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<'all' | '7d' | '30d' | '90d'>('all');

  useEffect(() => {
    fetchSales();
  }, [businessId, dateFilter]);

  // Real-time subscription for sales updates
  useEffect(() => {
    if (!businessId) return;

    const salesChannel = supabase
      .channel(`marketplace-sales-history:${businessId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'marketplace_sales',
          filter: `business_id=eq.${businessId}`,
        },
        () => {
          fetchSales();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(salesChannel);
    };
  }, [businessId]);

  const fetchSales = async () => {
    try {
      setIsLoading(true);
      
let query = (supabase as any)
        .from('marketplace_sales')
        .select(`
          *,
          marketplace_products!product_id (
            name
          )
        `)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      // Apply date filter
      if (dateFilter !== 'all') {
        const daysAgo = dateFilter === '7d' ? 7 : dateFilter === '30d' ? 30 : 90;
        const dateThreshold = new Date();
        dateThreshold.setDate(dateThreshold.getDate() - daysAgo);
        query = query.gte('created_at', dateThreshold.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching sales:', error);
        return;
      }

      setSales((data as any) || []);
    } catch (error: any) {
      console.error('Error fetching sales:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string, type: 'payment' | 'payout') => {
    if (type === 'payment') {
      switch (status) {
        case 'paid':
          return <Badge className="bg-green-600">Paid</Badge>;
        case 'pending':
          return <Badge variant="outline">Pending</Badge>;
        case 'failed':
          return <Badge className="bg-red-600">Failed</Badge>;
        case 'refunded':
          return <Badge className="bg-amber-600">Refunded</Badge>;
        default:
          return <Badge variant="outline">{status}</Badge>;
      }
    } else {
      switch (status) {
        case 'completed':
          return <Badge className="bg-green-600">Completed</Badge>;
        case 'pending':
          return <Badge variant="outline">Pending</Badge>;
        case 'failed':
          return <Badge className="bg-red-600">Failed</Badge>;
        default:
          return <Badge variant="outline">{status}</Badge>;
      }
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sales History</CardTitle>
          <CardDescription>View all your marketplace product sales</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Sales History
            </CardTitle>
            <CardDescription>View all your marketplace product sales</CardDescription>
          </div>
          <div className="flex gap-2">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="px-3 py-1 border rounded-md text-sm"
            >
              <option value="all">All Time</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sales.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No sales yet</p>
            <p className="text-sm mt-2">Your sales will appear here once customers purchase your products</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">Product</th>
                    <th className="text-left p-2 font-medium">Quantity</th>
                    <th className="text-left p-2 font-medium">Unit Price</th>
                    <th className="text-left p-2 font-medium">Total</th>
                    <th className="text-left p-2 font-medium">Commission</th>
                    <th className="text-left p-2 font-medium">Payout</th>
                    <th className="text-left p-2 font-medium">Payment</th>
                    <th className="text-left p-2 font-medium">Payout Status</th>
                    <th className="text-left p-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => (
                    <tr key={sale.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">
                        <div className="font-medium">
                          {sale.marketplace_products?.name || 'Product'}
                        </div>
                      </td>
                      <td className="p-2">{sale.quantity}</td>
                      <td className="p-2">
                        <div className="flex items-center gap-1">
                          <Euro className="h-3 w-3" />
                          {(sale.unit_price / 100).toFixed(2)}
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-1">
                          <Euro className="h-3 w-3" />
                          {(sale.total_amount / 100).toFixed(2)}
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-1 text-red-600">
                          <Euro className="h-3 w-3" />
                          -{(sale.commission_amount / 100).toFixed(2)}
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-1 text-green-600 font-semibold">
                          <Euro className="h-3 w-3" />
                          +{(sale.business_payout_amount / 100).toFixed(2)}
                        </div>
                      </td>
                      <td className="p-2">
                        {getStatusBadge(sale.payment_status, 'payment')}
                      </td>
                      <td className="p-2">
                        {getStatusBadge(sale.payout_status, 'payout')}
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(sale.created_at), 'MMM d, yyyy')}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {format(new Date(sale.created_at), 'h:mm a')}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
