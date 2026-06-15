import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase/client";
import { format } from "date-fns";
import { Eye, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import OrderDetailsDialog from "./OrderDetailsDialog";

// We'll use the global Order interface defined in vite-env.d.ts
// No need to redefine Order type here as it's now globally available

interface OrderItem {
  id: string;
  title: string;
  quantity: number;
  price: number;
  image?: string; // Made optional as some orders might not have images
}

interface ShippingInfo {
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  county: string;
  eircode?: string;
  country: string;
  phone?: string;
}

export interface Order {
  id: string;
  user_id?: string;
  guest_email: string;
  order_items: OrderItem[];
  shipping_info: ShippingInfo;
  total_price: number;
  currency: string;
  payment_status: string;
  fulfillment_status: string;
  created_at: string;
  stripe_session_id?: string; // Make optional to handle cases where it might not exist
  admin_notes?: string;
}

const OrdersTracking: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch orders from Supabase
  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('shop_orders')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        // Parse the JSON fields and construct proper Order objects
        const parsedOrders = data.map(order => {
          const typedOrder: Order = {
            id: order.id,
            user_id: order.user_id ?? undefined,
            guest_email: order.guest_email || '',
            order_items: typeof order.order_items === 'string' 
              ? JSON.parse(order.order_items) 
              : order.order_items,
            shipping_info: typeof order.shipping_info === 'string' 
              ? JSON.parse(order.shipping_info) 
              : order.shipping_info,
            total_price: order.total_price,
            currency: order.currency,
            payment_status: order.payment_status ?? '',
            fulfillment_status: order.fulfillment_status ?? '',
            created_at: order.created_at,
            stripe_session_id: order.stripe_session_id ?? undefined,
            admin_notes: order.admin_notes ?? undefined
          };
          return typedOrder;
        });

        setOrders(parsedOrders);
        setFilteredOrders(parsedOrders);
      } catch (error) {
        console.error('Error fetching orders:', error);
        toast({
          title: "Failed to load orders",
          description: "There was an error loading your orders. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [toast, user]);

  // Filter and sort orders
  useEffect(() => {
    let result = [...orders];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(order => 
        String(order.id).toLowerCase().includes(query)
      );
    }

    // Sort orders
    result = result.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'date-asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'status':
          return a.fulfillment_status.localeCompare(b.fulfillment_status);
        default:
          return 0;
      }
    });

    setFilteredOrders(result);
  }, [orders, searchQuery, sortBy]);

  // Open order details dialog
  const handleViewOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailsOpen(true);
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

  if (!user) {
    return (
      <div className="text-center py-8">
        <p>Please log in to view your orders.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search by order ID..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select
          value={sortBy}
          onValueChange={setSortBy}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Date (Newest first)</SelectItem>
            <SelectItem value="date-asc">Date (Oldest first)</SelectItem>
            <SelectItem value="status">Status</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders Table */}
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Order ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  Loading orders...
                </TableCell>
              </TableRow>
            ) : filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No orders found
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">
                    {String(order.id).substring(0, 8)}...
                  </TableCell>
                  <TableCell>{format(new Date(order.created_at), 'dd MMM yyyy')}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(order.total_price, order.currency)}
                  </TableCell>
                  <TableCell>
                    {renderStatusBadge(order.fulfillment_status)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleViewOrderDetails(order)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Order Details Dialog */}
      <OrderDetailsDialog 
        order={selectedOrder}
        isOpen={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
      />
    </div>
  );
};

export default OrdersTracking;
