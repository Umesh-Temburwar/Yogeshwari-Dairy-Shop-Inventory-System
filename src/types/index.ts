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
  subtotal?: number;
}

export type PaymentMode = 'Cash' | 'Online_UPI' | 'Split' | 'Udhar';

export type CustomerGender = 'Male' | 'Female' | 'Other';
export type CustomerAgeGroup = 'Kids/Teens (<18)' | 'Youth (18-25)' | 'Adults (26-45)' | 'Seniors (45+)';

export interface Sale {
  id: string;
  invoice_no: string;
  customer_name: string;
  customer_phone?: string;
  customer_gender?: CustomerGender;
  customer_age_group?: CustomerAgeGroup;
  customer_age?: number;
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
  created_by_name?: string;
  created_by_email?: string;
  created_by_role?: UserRole;
  admin_slot?: 1 | 2 | null;
  counter_name?: string;
}

export type ExpiryStatus =
  | 'EXPIRED'
  | 'EXPIRING_TODAY'
  | 'EXPIRING_TOMORROW'
  | 'EXPIRING_IN_3_DAYS'
  | 'EXPIRING_IN_7_DAYS'
  | 'FRESH';

export interface ProductBatch {
  id: string;
  product_id: string;
  product_name: string;
  batch_no: string;
  mfg_date: string; // YYYY-MM-DD
  expiry_date: string; // YYYY-MM-DD
  qty_received: number;
  qty_remaining: number;
  purchase_price: number;
  selling_price?: number;
  product?: Product;
  supplier_name?: string;
  notes?: string;
  created_at: string;
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
  batch_no?: string;
  expiry_date?: string;
  notes?: string;
  created_at: string;
}

export type DamageReason = 
  | 'Doodh Fat Gya (Curdled)' 
  | 'Theli Phat Gayi (Leaked)' 
  | 'Expiry Date Over' 
  | 'Handling Spoilage' 
  | 'Customer Return Defective'
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
  payment_mode: 'Cash' | 'Online_UPI' | 'Bank_Transfer' | 'Udhar';
  expense_date: string; // YYYY-MM-DD
  is_capital_investment: boolean;
  notes?: string;
  created_at: string;
}

export type TimeRangeFilter = 'today' | 'week' | 'month' | 'year' | 'all';

// Strictly restricted to Owner and Admin profiles only (No cashier/staff/guest profiles)
export type UserRole = 'Owner' | 'Admin';

export interface UserProfile {
  id: string;
  role: UserRole;
  adminSlot?: 1 | 2 | null;
  displayName: string;
  email: string;
  defaultRedirectView?: 'dashboard' | 'pos' | 'inventory';
}

// Product / Sales Return Management
export type ReturnReason = 
  | 'Customer Changed Mind'
  | 'Defective / Spoiled'
  | 'Wrong Product Taken'
  | 'Quality Issue'
  | 'Other';

export type RefundMode = 'Cash' | 'Online_UPI' | 'Udhar_Credit' | 'Replacement';

export type ReturnCondition = 'Resellable' | 'Damaged_Waste';

export interface ProductReturn {
  id: string;
  return_no: string; // e.g. RET-2026-0001
  sale_id?: string;
  invoice_no?: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  refund_amount: number;
  refund_mode: RefundMode;
  reason: ReturnReason;
  condition: ReturnCondition; // 'Resellable' (restocked) or 'Damaged_Waste' (waste/damage record)
  customer_name?: string;
  customer_phone?: string;
  notes?: string;
  return_date: string; // YYYY-MM-DD
  created_at: string;
}

// Supplier / Inward Goods Purchase Return (सप्लायर खरेदी परतावा - खराब/एक्सपायर माल परत पाठवणे)
export type SupplierReturnReason =
  | 'Damaged / Leaked on Delivery' // डिलिव्हरीच्या वेळी फुटलेले / लिक
  | 'Expired on Delivery'         // एक्सपायरी तारीख संपलेली
  | 'Curdled / Spoiled Milk'      // दूध फाटले / आंबले
  | 'Poor Quality / Bad Taste'    // खराब गुणवत्ता / वास येणे
  | 'Short Expiry (Near Expiry)'  // कमी शिल्लक मुदत
  | 'Wrong Product Delivered'     // चुकीचा माल पाठवला
  | 'Other';

export type SupplierRefundStatus =
  | 'Pending'                     // सप्लायरकडून रिफंड येणे बाकी
  | 'Refund_Received'             // रोख / UPI रिफंड जमा झाला
  | 'Adjusted_In_Next_Bill'       // पुढील बिलात वजावट झाली (Credit Note)
  | 'Replacement_Received';       // बदल्यात नवीन माल मिळाला

export interface SupplierReturn {
  id: string;
  return_no: string; // e.g. VRET-2026-0001
  supplier_name: string;
  product_id: string;
  product_name: string;
  batch_no?: string;
  purchase_id?: string;
  quantity: number;
  unit: string;
  purchase_price: number;
  total_refund_amount: number;
  reason: SupplierReturnReason;
  refund_status: SupplierRefundStatus;
  refund_mode?: 'Cash' | 'Online_UPI' | 'Credit_Deduction' | 'Replacement';
  refund_date?: string;
  return_date: string; // YYYY-MM-DD
  notes?: string;
  created_at: string;
}

// 2 Admins & Counter Activity Tracking
export type AdminActionType = 
  | 'SALE_CREATED'
  | 'SALE_DELETED'
  | 'PRODUCT_ADDED'
  | 'PRODUCT_UPDATED'
  | 'STOCK_INWARD'
  | 'EXPENSE_ADDED'
  | 'DAMAGE_RECORDED'
  | 'CUSTOMER_RETURN'
  | 'CUSTOMER_FULL_RETURN'
  | 'CUSTOMER_PARTIAL_RETURN'
  | 'SUPPLIER_RETURN'
  | 'UDHAR_PAYMENT'
  | 'UDHAR_GIVEN';

export interface AdminActivity {
  id: string;
  admin_name: string;
  admin_email?: string;
  admin_role: UserRole;
  admin_slot?: 1 | 2 | null;
  counter_name: string;
  action_type: AdminActionType;
  title: string;
  details: string;
  amount?: number;
  reference_id?: string;
  reference_table?: string;
  created_at: string;
}




