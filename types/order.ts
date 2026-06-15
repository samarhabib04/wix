export interface OrderItem {
  id: string;
  title: string;
  quantity: number;
  price: number;
  image?: string;
}

export interface ShippingInfo {
  firstName: string;
  lastName: string;
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
  stripe_session_id?: string;
  admin_notes?: string;
}

