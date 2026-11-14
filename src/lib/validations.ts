import { z } from 'zod';

/**
 * Product Form Validation Schema
 */
export const ProductSchema = z.object({
  name: z.string().min(2, 'उत्पादनाचे नाव किमान २ अक्षरे असावे (Name must be at least 2 characters)'),
  marathi_name: z.string().optional(),
  hindi_name: z.string().optional(),
  brand: z.string().optional(),
  category: z.enum([
    'Milk',
    'Curd & Chaas',
    'Paneer & Butter',
    'Ghee',
    'Sweets/Mithai',
    'Bakery & Extras'
  ]),
  unit: z.enum([
    'Litre',
    'Kg',
    'Packet (500ml)',
    'Packet (1L)',
    'Piece',
    'Gram'
  ]),
  purchase_price: z.number().min(0, 'खरेदी किंमत ऋण असू शकत नाही (Purchase price cannot be negative)'),
  selling_price: z.number().min(0, 'विक्री किंमत ऋण असू शकत नाही (Selling price cannot be negative)'),
  stock_quantity: z.number().min(0, 'साठा ऋण असू शकत नाही (Stock cannot be negative)'),
  min_stock_alert: z.number().min(0, 'किमान साठा इशारा ० पेक्षा जास्त असावा').default(10),
  barcode: z.string().optional()
});

export type ProductFormData = z.infer<typeof ProductSchema>;

/**
 * Customer Sale Checkout Validation Schema
 */
export const CustomerSaleSchema = z.object({
  customer_name: z.string().optional(),
  customer_phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'कृपया वैध १० अंकी मोबाईल नंबर टाका (Enter valid 10-digit phone)')
    .optional()
    .or(z.literal('')),
  customer_gender: z.enum(['Male', 'Female', 'Other']).default('Male'),
  customer_age_group: z.enum(['Kids (<18)', 'Youth (18-25)', 'Adults (26-45)', 'Senior (45+)']).default('Adults (26-45)'),
  payment_mode: z.enum(['Cash', 'Online_UPI', 'Split', 'Udhar'])
});

export type CustomerSaleFormData = z.infer<typeof CustomerSaleSchema>;

/**
 * Expense Entry Validation Schema
 */
export const ExpenseSchema = z.object({
  title: z.string().min(2, 'खर्चाचे शीर्षक आवश्यक आहे (Title required)'),
  category: z.string().min(1, 'प्रवर्ग निवडा (Category required)'),
  amount: z.number().positive('खर्च रक्कम ० पेक्षा जास्त असावी (Amount must be > 0)'),
  payment_mode: z.enum(['Cash', 'Online_UPI', 'Bank_Transfer', 'Udhar']),
  expense_date: z.string().min(1, 'तारीख आवश्यक आहे'),
  is_capital_investment: z.boolean().default(false),
  notes: z.string().optional()
});

export type ExpenseFormData = z.infer<typeof ExpenseSchema>;
