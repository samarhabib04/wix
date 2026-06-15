'use client';

import React, { useEffect, useState, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { sendConfirmationEmail, sendAdminOrderNotification } from '@/lib/utils/email-utils';
import { Order } from '@/types/order';
import { toast } from 'sonner';
import NavigationSection from "@/components/NavigationSection";

interface OrderDetails extends Omit<Order, 'user_id'> {
  user_id?: string;
}

function CheckoutSuccessContent() {
  const { clearCart } = useCart();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [emailStatus, setEmailStatus] = useState<{
    customer: 'pending' | 'success' | 'failed';
    admin: 'pending' | 'success' | 'failed';
  }>({
    customer: 'pending',
    admin: 'pending'
  });
  const cartClearedRef = useRef(false); // Track if cart has been cleared
  
  // Get session_id from URL params
  const sessionId = searchParams.get('session_id');
  
  // Fetch order details from Supabase
  useEffect(() => {
    let isMounted = true;
    
    const fetchOrderDetails = async () => {
      if (!sessionId) {
        if (isMounted) setIsLoading(false);
        return;
      }
      
      try {

        const { data, error } = await supabase
          .from('shop_orders')
          .select('*')
          .eq('stripe_session_id', sessionId)
          .single();
        
        if (error) {
          console.error('❌ Error fetching order:', error);
          if (isMounted) setIsLoading(false);
          return;
        }
        
        if (data && isMounted) {

          // Parse JSON fields if needed
          let order_items;
          let shipping_info;
          
          try {
            order_items = typeof data.order_items === 'string' 
              ? JSON.parse(data.order_items) 
              : data.order_items;
          } catch (e) {
            console.error('Error parsing order_items:', e);
            order_items = data.order_items || [];
          }
          
          try {
            shipping_info = typeof data.shipping_info === 'string'
              ? JSON.parse(data.shipping_info)
              : data.shipping_info;
          } catch (e) {
            console.error('Error parsing shipping_info:', e);
            shipping_info = data.shipping_info || {};
          }
          
          // Create a properly typed OrderDetails object
          const parsedData: OrderDetails = {
            id: data.id,
            created_at: data.created_at,
            order_items: order_items,
            total_price: data.total_price,
            currency: data.currency,
            guest_email: data.guest_email,
            payment_status: data.payment_status,
            fulfillment_status: data.fulfillment_status,
            stripe_session_id: data.stripe_session_id || undefined,
            shipping_info: shipping_info,
            admin_notes: data.admin_notes || undefined
          };
          
          setOrderDetails(parsedData);
          
          // Update order status if needed
          if (data.payment_status === 'Pending') {
            try {
              await supabase
                .from('shop_orders')
                .update({ payment_status: 'Paid' })
                .eq('id', data.id);
            } catch (updateError) {
              console.error('Error updating order status:', updateError);
            }
          }
          
          // Send emails
          if (isMounted) {
            await sendOrderEmails(parsedData);
          }
        }
      } catch (error) {
        console.error('❌ Error in order fetch:', error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    
    fetchOrderDetails();
    
    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  const sendOrderEmails = async (order: OrderDetails) => {
    if (!order.guest_email || !order.order_items || !order.shipping_info) {
      console.error('❌ Missing required order data for emails');
      return;
    }

    const orderNumber = `DQ-${order.id.slice(0, 6).toUpperCase()}`;
    
    // Send customer confirmation email
    try {

      const customerEmailResult = await sendConfirmationEmail({
        email: order.guest_email,
        orderNumber,
        cartItems: order.order_items,
        shippingInfo: order.shipping_info,
        totalPrice: order.total_price,
        currency: order.currency,
      });
      
      if (customerEmailResult.success) {

        setEmailStatus(prev => ({ ...prev, customer: 'success' }));
        try {
          toast.success('Order confirmation email sent!');
        } catch (toastError) {
          console.error('Toast error:', toastError);
        }
      } else {
        console.error('❌ Customer email failed:', customerEmailResult.message);
        setEmailStatus(prev => ({ ...prev, customer: 'failed' }));
        try {
          toast.error('Failed to send confirmation email');
        } catch (toastError) {
          console.error('Toast error:', toastError);
        }
      }
    } catch (error) {
      console.error('❌ Customer email error:', error);
      setEmailStatus(prev => ({ ...prev, customer: 'failed' }));
      try {
        toast.error('Failed to send confirmation email');
      } catch (toastError) {
        console.error('Toast error:', toastError);
      }
    }

    // Send admin notification email
    try {

      const adminEmailResult = await sendAdminOrderNotification({
        orderNumber,
        customerEmail: order.guest_email,
        cartItems: order.order_items,
        shippingInfo: order.shipping_info,
        totalPrice: order.total_price,
        currency: order.currency,
      });
      
      if (adminEmailResult.success) {

        setEmailStatus(prev => ({ ...prev, admin: 'success' }));
      } else {
        console.error('❌ Admin email failed:', adminEmailResult.message);
        setEmailStatus(prev => ({ ...prev, admin: 'failed' }));
      }
    } catch (error) {
      console.error('❌ Admin email error:', error);
      setEmailStatus(prev => ({ ...prev, admin: 'failed' }));
    }
  };
  
  // Clear cart on successful checkout - only once
  useEffect(() => {
    if (orderDetails && !cartClearedRef.current) {
      try {
        cartClearedRef.current = true; // Mark as cleared to prevent multiple calls
        clearCart();
      } catch (error) {
        console.error('Error clearing cart:', error);
      }
    }
  }, [orderDetails]); // Remove clearCart from dependencies to prevent infinite loop
  
  // If accessed directly without checkout session ID, redirect to home
  useEffect(() => {
    if (!sessionId && !isLoading) {
      router.push('/');
    }
  }, [sessionId, isLoading, router]);

  // Handle view orders click - check auth status and route accordingly
  const handleViewOrders = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // User is authenticated, go directly to buyer dashboard orders
        router.push('/my-buyer-dashboard/orders');
      } else {
        // Not authenticated, redirect to login with return path
        router.push(`/auth/login?next=${encodeURIComponent('/my-buyer-dashboard/orders')}`);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      // Fallback to login
      router.push('/auth/login');
    }
  };
  
  // Format currency display
  const formatCurrency = (amount: number, currency: string) => {
    const symbol = currency === 'GBP' ? '£' : '€';
    return `${symbol}${amount.toFixed(2)}`;
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16 min-h-[70vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-dark-green"></div>
      </div>
    );
  }
  
  const orderNumber = orderDetails?.id ? `DQ-${orderDetails.id.slice(0, 6).toUpperCase()}` : '-';
  const orderDate = orderDetails?.created_at ? new Date(orderDetails.created_at).toLocaleDateString() : new Date().toLocaleDateString();
  
  return (
    <>
      <div className="container mx-auto px-4 py-16 min-h-[70vh] flex flex-col items-center justify-center text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-xl mx-auto w-full"
        >
          <div className="h-24 w-24 rounded-full bg-green-100 mx-auto mb-6 flex items-center justify-center">
            <Check className="h-12 w-12 text-green-600" />
          </div>
          
          <h1 className="text-3xl font-berkshire text-brand-dark-green mb-4">
            Thank You for Your Order!
          </h1>
          
          <p className="text-gray-700 mb-6">
            Your order has been received and is being processed. 
            {emailStatus.customer === 'success' && ' You will receive a confirmation email shortly.'}
            {emailStatus.customer === 'failed' && ' Please note: confirmation email could not be sent.'}
          </p>

          {/* Email Status Debug Info (only show if there are issues) */}
          {(emailStatus.customer === 'failed' || emailStatus.admin === 'failed') && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-800">
                {emailStatus.customer === 'failed' && '⚠️ Customer email failed to send. '}
                {emailStatus.admin === 'failed' && '⚠️ Admin notification failed to send. '}
                Please check console logs for details.
              </p>
            </div>
          )}
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-8">
            <h3 className="text-lg font-medium mb-4">Order Details</h3>
            <div className="flex justify-between mb-2">
              <p className="text-gray-700">Order #:</p>
              <p className="font-medium">{orderNumber}</p>
            </div>
            <div className="flex justify-between mb-2">
              <p className="text-gray-700">Date:</p>
              <p className="font-medium">{orderDate}</p>
            </div>
            {orderDetails?.guest_email && (
              <div className="flex justify-between mb-2">
                <p className="text-gray-700">Email:</p>
                <p className="font-medium">{orderDetails.guest_email}</p>
              </div>
            )}
            <div className="flex justify-between mb-2">
              <p className="text-gray-700">Status:</p>
              <p className="font-medium text-green-600">Paid</p>
            </div>
            <div className="flex justify-between mb-2">
              <p className="text-gray-700">Shipping:</p>
              <p className="font-medium text-brand-soft-green">Free Shipping</p>
            </div>
            <div className="flex justify-between mb-2">
              <p className="text-gray-700">Delivery:</p>
              <p className="font-medium">3-5 business days</p>
            </div>
            
            <hr className="my-4" />
            
            {orderDetails?.order_items && (
              <div className="space-y-3 mb-4">
                <h4 className="font-medium text-left">Items</h4>
                {orderDetails.order_items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="h-10 w-10 bg-gray-100 rounded overflow-hidden mr-3">
                        <img 
                          src={item.image} 
                          alt={item.title} 
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <span className="text-gray-700 text-sm">
                        {item.title} {item.quantity > 1 ? `(x${item.quantity})` : ''}
                      </span>
                    </div>
                    <span className="font-medium">
                      {formatCurrency(item.price * item.quantity, orderDetails.currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex justify-between mt-4 pt-4 border-t">
              <p className="font-medium">Total:</p>
              <p className="font-semibold text-lg">
                {orderDetails ? formatCurrency(orderDetails.total_price, orderDetails.currency) : '-'}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild className="bg-brand-soft-green hover:bg-brand-dark-green">
              <Link href="/shop">Continue Shopping</Link>
            </Button>
            <Button 
              onClick={handleViewOrders}
              variant="outline"
            >
              View My Orders
            </Button>
          </div>
        </motion.div>
      </div>
      {/* Navigation Section - Using the reusable component */}
      <NavigationSection />
    </>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-16 min-h-[70vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-dark-green"></div>
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}

