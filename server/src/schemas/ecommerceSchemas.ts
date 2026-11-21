import { z } from 'zod';

// Customer Authentication Schemas
// CRITICAL SECURITY RULE: Role is NEVER accepted from the client!
export const customerRegisterSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  email: z.string().email('Valid email address is required'),
  phone: z.string().min(10, 'Valid 10-digit mobile number required').max(15),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const customerLoginSchema = z.object({
  email: z.string().email('Valid email address is required'),
  password: z.string().min(6, 'Password is required'),
});

// Customer Address Schema
export const customerAddressSchema = z.object({
  recipient_name: z.string().min(2, 'Recipient name is required').max(100),
  phone: z.string().min(10, 'Phone number is required').max(15),
  alternate_phone: z.string().max(15).optional().nullable(),
  address_line1: z.string().min(5, 'Street address is required').max(255),
  address_line2: z.string().max(255).optional().nullable(),
  landmark: z.string().max(150).optional().nullable(),
  city: z.string().min(2, 'City is required').default('Ambajogai'),
  state: z.string().min(2, 'State is required').default('Maharashtra'),
  pincode: z.string().regex(/^\d{6}$/, 'Valid 6-digit PIN code required').default('431517'),
  address_type: z.enum(['HOME', 'WORK', 'OTHER']).default('HOME'),
  is_default: z.boolean().default(false),
});

// Product Query Schema (Public)
export const ecommerceProductQuerySchema = z.object({
  search: z.string().optional(),
  category_id: z.string().uuid().optional(),
  brand_id: z.string().uuid().optional(),
  in_stock_only: z.enum(['true', 'false']).default('true'),
  sort: z.enum(['popularity', 'price_asc', 'price_desc', 'newest']).default('popularity'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

// Cart Item Schema
export const cartItemInputSchema = z.object({
  product_id: z.string().uuid('Valid product ID required'),
  quantity: z.number().positive('Quantity must be greater than 0').max(50),
});

// Cart Validation Schema
export const cartValidationSchema = z.object({
  items: z.array(cartItemInputSchema).min(1, 'Cart cannot be empty'),
  cart_session_id: z.string().optional(),
});

// Order Placement Schema
export const createOrderSchema = z.object({
  items: z.array(cartItemInputSchema).min(1, 'Order must contain at least 1 item'),
  delivery_address: customerAddressSchema,
  payment_method: z.enum(['COD', 'ONLINE_UPI', 'RAZORPAY']).default('COD'),
  payment_reference: z.string().max(100).optional().nullable(),
  delivery_notes: z.string().max(500).optional().nullable(),
  idempotency_key: z.string().uuid('Valid idempotency key required'),
  cart_session_id: z.string().optional().nullable(),
});

// Cancel Order Schema
export const cancelOrderSchema = z.object({
  reason: z.string().min(3, 'Cancellation reason is required').max(300),
});

// Admin Order Status Update Schema
export const updateOrderStatusSchema = z.object({
  status: z.enum(['CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REJECTED']),
  notes: z.string().max(500).optional(),
  rejection_reason: z.string().max(500).optional(),
});

export type CustomerRegisterInput = z.infer<typeof customerRegisterSchema>;
export type CustomerLoginInput = z.infer<typeof customerLoginSchema>;
export type CustomerAddressInput = z.infer<typeof customerAddressSchema>;
export type EcommerceProductQueryInput = z.infer<typeof ecommerceProductQuerySchema>;
export type CartValidationInput = z.infer<typeof cartValidationSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
