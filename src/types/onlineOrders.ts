export type OnlineOrderStatus =
  | 'PLACED'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REJECTED';

export interface OnlineOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  pack_size: string | null;
  unit: string;
  unit_price: number;
  mrp: number;
  quantity: number;
  total_price: number;
  image_url: string | null;
  created_at: string;
}

export interface OnlineOrderAddress {
  recipient_name?: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  landmark?: string;
  city?: string;
  state?: string;
  pincode?: string;
  address_type?: string;
}

export interface OnlineOrder {
  id: string;
  order_no: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  delivery_address: OnlineOrderAddress;
  order_status: OnlineOrderStatus;
  payment_method: 'COD' | 'UPI' | 'ONLINE';
  payment_status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  payment_reference: string | null;
  subtotal: number;
  delivery_fee: number;
  discount_amount: number;
  total_amount: number;
  notes?: string | null;
  cancellation_reason?: string | null;
  rejection_reason?: string | null;
  items?: OnlineOrderItem[];
  created_at: string;
  updated_at: string;
  confirmed_at?: string | null;
  delivered_at?: string | null;
  cancelled_at?: string | null;
}
