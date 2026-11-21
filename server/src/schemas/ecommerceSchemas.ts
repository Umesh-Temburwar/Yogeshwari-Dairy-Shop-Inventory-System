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

// Customer Address Schema (Includes verified coordinates & delivery instructions)
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
  latitude: z.number().min(-90, 'Latitude must be between -90 and 90').max(90, 'Latitude must be between -90 and 90').optional().nullable(),
  longitude: z.number().min(-180, 'Longitude must be between -180 and 180').max(180, 'Longitude must be between -180 and 180').optional().nullable(),
  delivery_instructions: z.string().max(500, 'Delivery instructions cannot exceed 500 characters').optional().nullable(),
  is_default: z.boolean().default(false),
});

// Update Customer Address Schema (Partial for safe PATCH/PUT)
export const updateCustomerAddressSchema = customerAddressSchema.partial();

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
  delivery_partner_name: z.string().max(100).optional(),
  delivery_partner_phone: z.string().max(25).optional(),
  delivery_partner_vehicle: z.string().max(50).optional(),
  assigned_rider_id: z.string().uuid().optional().nullable(),
});

// Admin Rider Assignment Schema
export const assignRiderSchema = z.object({
  rider_id: z.string().uuid().optional().nullable(),
  rider_name: z.string().min(2, 'Rider name is required').max(100),
  rider_phone: z.string().min(10, 'Valid 10-digit mobile number required').max(25),
  rider_vehicle: z.string().max(50).optional().nullable(),
  notes: z.string().max(300).optional().nullable(),
});

// Admin Store Open/Close Status Schema
export const updateStoreStatusSchema = z.object({
  is_open: z.boolean(),
  message: z.string().max(300).optional(),
  reopen_time: z.string().max(50).optional(),
});

export type CustomerRegisterInput = z.infer<typeof customerRegisterSchema>;
export type CustomerLoginInput = z.infer<typeof customerLoginSchema>;
export type CustomerAddressInput = z.infer<typeof customerAddressSchema>;
export type UpdateCustomerAddressInput = z.infer<typeof updateCustomerAddressSchema>;
export type EcommerceProductQueryInput = z.infer<typeof ecommerceProductQuerySchema>;
export type CartValidationInput = z.infer<typeof cartValidationSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type AssignRiderInput = z.infer<typeof assignRiderSchema>;
export type UpdateStoreStatusInput = z.infer<typeof updateStoreStatusSchema>;
