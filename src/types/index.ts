export type ProductCategory = 
  | 'Milk' 
  | 'Curd & Chaas' 
  | 'Paneer & Butter' 
  | 'Ghee' 
  | 'Sweets/Mithai' 
  | 'Bakery & Extras';

export type ProductUnit = 
  | 'Litre' 
  | 'Kg' 
  | 'Packet (500ml)' 
  | 'Packet (1L)' 
  | 'Piece' 
  | 'Gram';

export interface Product {
  id: string;
  name: string;
  hindi_name?: string;
  marathi_name?: string;
  category: ProductCategory;
  unit: ProductUnit;
  purchase_price: number;
  selling_price: number;
  stock_quantity: number;
  min_stock_alert: number;
  barcode?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface SaleItem {
  id: string;
  sale_id?: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  purchase_cost: number;
  total_price: number;
}

export type PaymentMode = 'Cash' | 'Online_UPI' | 'Split' | 'Udhar';

export interface Sale {
  id: string;
  invoice_no: string;
  customer_name: string;
  customer_phone?: string;
  total_amount: number;
  discount: number;
  net_amount: number;
  payment_mode: PaymentMode;
  cash_amount: number;
  online_amount: number;
  udhar_amount: number;
  sale_date: string; // YYYY-MM-DD
  created_at: string;
  items: SaleItem[];
}

export interface Purchase {
  id: string;
  product_id: string;
  product_name: string;
  supplier_name: string;
  quantity: number;
  unit: string;
  purchase_price: number;
  total_amount: number;
  payment_mode: 'Cash' | 'Online_UPI' | 'Bank_Transfer' | 'Udhar';
  purchase_date: string; // YYYY-MM-DD
  invoice_number?: string;
  notes?: string;
  created_at: string;
}

export type DamageReason = 
  | 'Doodh Fat Gya (Curdled)' 
  | 'Theli Phat Gayi (Leaked)' 
  | 'Expiry Date Over' 
  | 'Handling Spoilage' 
  | 'Other';

export interface DamageRecord {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit: string;
  estimated_loss_amount: number;
  reason: DamageReason;
  damage_date: string; // YYYY-MM-DD
  notes?: string;
  created_at: string;
}

export interface UdharCustomer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  total_credit: number;
  total_paid: number;
  current_balance: number;
  status: 'Active' | 'Cleared' | 'Overdue';
  last_transaction_date: string;
  notes?: string;
  created_at: string;
}

export interface UdharTransaction {
  id: string;
  customer_id: string;
  type: 'Credit_Given' | 'Payment_Received';
  amount: number;
  payment_mode: 'Cash' | 'Online_UPI';
  notes?: string;
  transaction_date: string;
  created_at: string;
}

export type ExpenseCategory = 
  | 'Dukan Rent' 
  | 'Light / Electricity Bill' 
  | 'Gadi Petrol / Diesel' 
  | 'Deep Chiller Maintenance' 
  | 'Staff Salary' 
  | 'Packaging / Theli' 
  | 'Shop Capital Investment' 
  | 'General Repair' 
  | 'Other';

export interface Expense {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  payment_mode: 'Cash' | 'Online_UPI' | 'Bank_Transfer';
  expense_date: string; // YYYY-MM-DD
  is_capital_investment: boolean;
  notes?: string;
  created_at: string;
}

export type TimeRangeFilter = 'today' | 'week' | 'month' | 'year' | 'all';

