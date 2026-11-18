import { z } from 'zod';

/**
 * Product Form Validation Schema
 */
export const ProductSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters'),
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
  purchase_price: z.number().min(0, 'Purchase price cannot be negative'),
  selling_price: z.number().min(0, 'Selling price cannot be negative'),
  stock_quantity: z.number().min(0, 'Stock quantity cannot be negative'),
  min_stock_alert: z.number().min(0, 'Minimum stock alert cannot be negative').default(10),
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
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number')
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
  title: z.string().min(2, 'Expense title is required'),
  category: z.string().min(1, 'Category is required'),
  amount: z.number().positive('Amount must be greater than 0'),
  payment_mode: z.enum(['Cash', 'Online_UPI', 'Bank_Transfer', 'Udhar']),
  expense_date: z.string().min(1, 'Date is required'),
  is_capital_investment: z.boolean().default(false),
  notes: z.string().optional()
});

export type ExpenseFormData = z.infer<typeof ExpenseSchema>;
