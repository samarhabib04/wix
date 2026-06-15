
import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { adminToast } from "@/lib/utils/adminToast";
import { supabase } from "@/lib/supabase/client";
import { format } from "date-fns";
import { Eye, Search } from "lucide-react";
import OrderDetailsSheet from "./OrderDetailsSheet";
import AdminTable from "./AdminTable";
import TruncatedCellText from "./TruncatedCellText";

// Define TypeScript types for our data
interface OrderItem {
  id: string;
  title: string;
  quantity: number;
  price: number;
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
  admin_notes?: string;
  created_at: string;
}

const OrdersTable = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Fetch orders from Supabase
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('shop_orders')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        // Parse the JSON fields
        const parsedOrders = data.map(order => ({
          ...order,
          user_id: order.user_id ?? undefined,
          admin_notes: order.admin_notes ?? undefined,
          order_items: Array.isArray(order.order_items) 
            ? order.order_items 
            : JSON.parse(String(order.order_items)),
          shipping_info: typeof order.shipping_info === 'object' 
            ? order.shipping_info 
            : JSON.parse(String(order.shipping_info))
        })) as Order[];

        setOrders(parsedOrders);
        setFilteredOrders(parsedOrders);
      } catch (error) {
        console.error('Error fetching orders:', error);
        toast(adminToast.error("Failed to load orders. Please try again."));
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [toast]);

  // Filter and sort orders
  useEffect(() => {
    let result = [...orders];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(order => 
        order.guest_email.toLowerCase().includes(query) || 
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

  // Open order details sheet
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

  const handleOrderUpdate = (updatedOrder: Order) => {
    setOrders(orders.map(order => 
      order.id === updatedOrder.id ? updatedOrder : order
    ));
    setSelectedOrder(updatedOrder);
  };

  const columns = [
    { 
      key: "id", 
      label: "Order ID", 
      width: "w-[120px]",
      render: (value: string) => (
        <span className="font-medium">{value.substring(0, 8)}...</span>
      )
    },
    {
      key: "customer",
      label: "Customer",
      render: (value: any, row: Order) => (
        <div>
          <TruncatedCellText text={row.guest_email} maxChars={28} className="font-medium max-w-[220px]" />
          {row.shipping_info?.fullName && (
            <TruncatedCellText text={row.shipping_info.fullName} maxChars={24} className="text-sm text-muted-foreground max-w-[200px]" />
          )}
        </div>
      )
    },
    {
      key: "created_at",
      label: "Date",
      render: (value: string) => format(new Date(value), 'dd MMM yyyy')
    },
    {
      key: "total_price",
      label: "Total",
      render: (value: number, row: Order) => formatCurrency(value, row.currency)
    },
    {
      key: "payment_status",
      label: "Payment Status",
      render: (value: string) => renderStatusBadge(value)
    },
    {
      key: "fulfillment_status",
      label: "Fulfillment Status",
      render: (value: string) => renderStatusBadge(value)
    }
  ];

  const actions = [
    {
      label: "View Details",
      onClick: (order: Order) => handleViewOrderDetails(order)
    }
  ];

  return (
    <div className="space-y-4">
      {/* Search and Sort Controls */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by email or order ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-48">
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
      <AdminTable 
        data={filteredOrders} 
        columns={columns} 
        actions={actions}
        isLoading={isLoading}
        emptyMessage={orders.length === 0 ? "No orders have been placed yet. Customer orders will appear here once they start purchasing products from your shop." : "No orders match your search criteria. Try adjusting your filters or search terms."}
      />

      {/* Order Details Sheet */}
      <OrderDetailsSheet
        order={selectedOrder}
        isOpen={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        onOrderUpdate={handleOrderUpdate}
      />
    </div>
  );
};

export default OrdersTable;
