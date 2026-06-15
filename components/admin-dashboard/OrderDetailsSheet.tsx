import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase/client";
import { format } from "date-fns";
import { Order } from './OrdersTable';
import { Loader2 } from 'lucide-react';
import { sendOrderShippedEmail } from '@/lib/utils/email-utils';
import { adminToast } from '@/lib/utils/adminToast';

interface OrderDetailsSheetProps {
  order: Order | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderUpdate: (updatedOrder: Order) => void;
}

const OrderDetailsSheet: React.FC<OrderDetailsSheetProps> = ({
  order,
  isOpen,
  onOpenChange,
  onOrderUpdate,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [fulfillmentStatus, setFulfillmentStatus] = useState<string>('');
  const [adminNotes, setAdminNotes] = useState<string>('');
  const { toast } = useToast();

  React.useEffect(() => {
    if (order) {
      setFulfillmentStatus(order.fulfillment_status);
      setAdminNotes(order.admin_notes || '');
    }
  }, [order]);

  const handleSaveChanges = async () => {
    if (!order) return;

    try {
      setIsSaving(true);
      const { data, error } = await supabase
        .from('shop_orders')
        .update({
          fulfillment_status: fulfillmentStatus,
          admin_notes: adminNotes,
        })
        .eq('id', String(order.id))
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Parse the JSON fields
      const updatedOrder: Order = {
        ...data,
        user_id: data.user_id ?? undefined,
        admin_notes: data.admin_notes ?? undefined,
        order_items: Array.isArray(data.order_items) 
          ? data.order_items 
          : JSON.parse(String(data.order_items)),
        shipping_info: typeof data.shipping_info === 'object' 
          ? data.shipping_info 
          : JSON.parse(String(data.shipping_info)),
      };

      // Send shipped email if status changed to "Shipped"
      if (fulfillmentStatus === 'Shipped' && order.fulfillment_status !== 'Shipped') {

        const orderNumber = `DQ-${String(order.id).slice(0, 6).toUpperCase()}`;
        
        // Transform shipping info to match the expected interface
        const transformedShippingInfo = {
          firstName: updatedOrder.shipping_info.fullName?.split(' ')[0] || '',
          lastName: updatedOrder.shipping_info.fullName?.split(' ').slice(1).join(' ') || '',
          addressLine1: updatedOrder.shipping_info.addressLine1 || '',
          addressLine2: updatedOrder.shipping_info.addressLine2,
          county: updatedOrder.shipping_info.county,
          eircode: updatedOrder.shipping_info.eircode,
          country: updatedOrder.shipping_info.country,
        };
        
        try {
          const emailResult = await sendOrderShippedEmail({
            email: order.guest_email,
            orderNumber,
            cartItems: updatedOrder.order_items,
            shippingInfo: transformedShippingInfo,
            totalPrice: updatedOrder.total_price,
            currency: updatedOrder.currency,
          });
          
          if (emailResult.success) {

            toast(adminToast.success(`Order ${String(order.id).substring(0, 8)}... has been updated and shipping notification sent.`));
          } else {
            console.error('❌ Order shipped email failed:', emailResult.message);
            toast(adminToast.warning(`Order ${String(order.id).substring(0, 8)}... has been updated, but shipping email failed to send.`));
          }
        } catch (emailError) {
          console.error('❌ Error sending shipped email:', emailError);
          toast(adminToast.warning(`Order ${String(order.id).substring(0, 8)}... has been updated, but shipping email failed to send.`));
        }
      } else {
        toast(adminToast.success(`Order ${String(order.id).substring(0, 8)}... has been updated.`));
      }

      onOrderUpdate(updatedOrder);
    } catch (error) {
      console.error('Error updating order:', error);
      toast(adminToast.error("There was an error updating the order. Please try again."));
    } finally {
      setIsSaving(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number, currency: string) => {
    const symbol = currency === 'EUR' ? '€' : '£';
    return `${symbol}${amount.toFixed(2)}`;
  };

  // Render status badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'Shipped':
        return <Badge className="bg-[#F2FCE2] text-green-700 hover:bg-[#E3F5C5]">{status}</Badge>;
      case 'Pending':
        return <Badge className="bg-[#E5DEFF] text-[#9b87f5] hover:bg-[#D6CCFF]">{status}</Badge>;
      case 'Cancelled':
        return <Badge className="bg-[#FFDEE2] text-red-700 hover:bg-[#FFCED4]">{status}</Badge>;
      case 'Refunded':
        return <Badge className="bg-[#FFE7CC] text-orange-700 hover:bg-[#FFD7AD]">{status}</Badge>;
      case 'Paid':
        return <Badge className="bg-[#F2FCE2] text-green-700 hover:bg-[#E3F5C5]">{status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!order) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md md:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Order Details</SheetTitle>
          <SheetDescription>
            Order ID: {String(order.id).substring(0, 8)}... | {format(new Date(order.created_at), 'dd MMM yyyy')}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Order Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {order.order_items.map((item, index) => (
                  <div key={index} className="flex justify-between">
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <p>{formatCurrency(item.price * item.quantity, order.currency)}</p>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="flex justify-between font-medium">
                <p>Total</p>
                <p>{formatCurrency(order.total_price, order.currency)}</p>
              </div>

              <div className="flex justify-between">
                <p className="text-sm">Payment Status</p>
                <div>{renderStatusBadge(order.payment_status)}</div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Information */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Shipping Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <p className="font-medium">{order.shipping_info.fullName}</p>
                <p>{order.shipping_info.addressLine1}</p>
                {order.shipping_info.addressLine2 && (
                  <p>{order.shipping_info.addressLine2}</p>
                )}
                <p>
                  {order.shipping_info.county}
                  {order.shipping_info.eircode && `, ${order.shipping_info.eircode}`}
                </p>
                <p>{order.shipping_info.country}</p>
                {order.shipping_info.phone && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Phone: {order.shipping_info.phone}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Fulfillment Controls */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Fulfillment Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Fulfillment Status</label>
                <Select
                  value={fulfillmentStatus}
                  onValueChange={setFulfillmentStatus}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Shipped">Shipped</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Admin Notes</label>
                <Textarea
                  placeholder="Add notes about this order (only visible to admins)"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={4}
                />
              </div>

              <Button 
                className="w-full bg-brand-soft-green hover:bg-brand-dark-green" 
                onClick={handleSaveChanges}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default OrderDetailsSheet;
