
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { Order } from "./OrdersTracking";
import { Package } from "lucide-react";

interface OrderDetailsDialogProps {
  order: Order | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const OrderDetailsDialog: React.FC<OrderDetailsDialogProps> = ({
  order,
  isOpen,
  onOpenChange,
}) => {
  if (!order) return null;

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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md md:max-w-lg overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Package className="mr-2 h-5 w-5" /> Order Details
          </DialogTitle>
          <DialogDescription>
            Order ID: {String(order.id).substring(0, 8)}... | {format(new Date(order.created_at), 'dd MMM yyyy')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
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

              <div className="flex justify-between">
                <p className="text-sm">Fulfillment Status</p>
                <div>{renderStatusBadge(order.fulfillment_status)}</div>
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailsDialog;
