export type UserRole = 'admin' | 'owner' | 'manager' | 'cashier' | 'delivery_boy';

export interface User {
  id: string;
  email: string;
  fullName?: string;
  role: UserRole;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Brand {
  id: string;
  name: string;
  created_at: string;
}

export interface Unit {
  id: string;
  name: string;
  short_code: string;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  gst_number: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  category_id: string;
  brand_id: string | null;
  unit_id: string;
  sku: string;
  barcode: string | null;
  purchase_price: number;
  selling_price: number;
  gst_percent: number;
  min_stock: number;
  max_stock: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  category?: Category;
  brand?: Brand;
  unit?: Unit;
  current_stock?: number;
  stock_status?: 'OUT_OF_STOCK' | 'LOW' | 'NORMAL' | 'OVERSTOCK';
}

export interface Batch {
  id: string;
  product_id: string;
  batch_no: string;
  mfg_date: string;
  expiry_date: string;
  qty_received: number;
  qty_remaining: number;
  purchase_price: number;
  supplier_id: string | null;
  created_at: string;
  expiry_status?: 'EXPIRED' | 'EXPIRING_TODAY' | 'EXPIRING_TOMORROW' | 'EXPIRING_IN_3_DAYS' | 'FRESH';
  days_to_expiry?: number;
}

export interface StockSummary {
  totalProducts: number;
  activeProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalStockQuantity: number;
  totalStockValue: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

