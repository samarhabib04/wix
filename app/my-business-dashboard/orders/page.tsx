'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import OrdersTracking from '@/components/shared/OrdersTracking';
import SavedQuizResults from '@/components/shared/SavedQuizResults';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function BusinessOrdersPage() {
  const [activeTab, setActiveTab] = useState("orders");
  const { user } = useAuth();
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [isLoadingSales, setIsLoadingSales] = useState(false);
  const [currentBusinessId, setCurrentBusinessId] = useState<string | null>(null);

  useEffect(() => {
    const fetchBusiness = async () => {
      if (!user) return;

      try {
        const { data: business, error } = await supabase
          .from('business_listings')
          .select('id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching business:', error);
          return;
        }

        if (business) {
          setCurrentBusinessId(business.id);
          fetchMarketplaceSales(business.id);
        }
      } catch (error) {
        console.error('Error in fetchBusiness:', error);
      }
    };

    if (user) {
      fetchBusiness();
    }
  }, [user]);

  const fetchMarketplaceSales = async (businessId: string) => {
    try {
      setIsLoadingSales(true);
      
const { data: sales, error } = await (supabase as any)
        .from('marketplace_sales')
        .select(`
          *,
          marketplace_products!product_id (
            name
          )
        `)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching sales:', error);
        return;
      }

      setRecentSales((sales as any) || []);
    } catch (error: any) {
      console.error('Error fetching sales:', error);
    } finally {
      setIsLoadingSales(false);
    }
  };

  // Real-time subscription for sales updates
  useEffect(() => {
    if (!currentBusinessId) return;

    const salesChannel = supabase
      .channel(`marketplace-sales-orders:${currentBusinessId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'marketplace_sales',
          filter: `business_id=eq.${currentBusinessId}`,
        },
        () => {
          fetchMarketplaceSales(currentBusinessId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(salesChannel);
    };
  }, [currentBusinessId]);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">My Orders</h1>
      
      {/* Marketplace Sales Section */}
      {currentBusinessId && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Marketplace Sales</CardTitle>
            <CardDescription>Your latest product sales</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingSales ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : recentSales.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No sales yet</p>
                <p className="text-sm mt-2">Your marketplace product sales will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentSales.map((sale: any) => (
                  <div key={sale.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">
                        {sale.marketplace_products?.name || 'Product'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {sale.quantity} × €{(sale.unit_price / 100).toFixed(2)} = €{(sale.total_amount / 100).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(sale.created_at).toLocaleDateString()} at {new Date(sale.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">
                        +€{(sale.business_payout_amount / 100).toFixed(2)}
                      </p>
                      {sale.payout_status === 'completed' ? (
                        <Badge className="bg-green-600">Completed</Badge>
                      ) : sale.payout_status === 'failed' ? (
                        <Badge className="bg-red-600">Failed</Badge>
                      ) : sale.payment_status === 'paid' ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">Payment Received</Badge>
                      ) : (
                        <Badge variant="outline">Pending</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      <Tabs defaultValue="orders" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="orders">
            Orders
          </TabsTrigger>
          <TabsTrigger value="quiz-results">
            Quiz Results
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-0">
          <OrdersTracking />
        </TabsContent>

        <TabsContent value="quiz-results" className="mt-0">
          <SavedQuizResults />
        </TabsContent>
      </Tabs>
    </div>
  );
}

