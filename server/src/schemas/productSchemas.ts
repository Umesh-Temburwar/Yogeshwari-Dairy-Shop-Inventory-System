import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(2, 'Product name is required').max(150),
  category_id: z.string().uuid('Valid Category ID is required'),
  brand_id: z.string().uuid('Valid Brand ID is required').optional().nullable(),
  unit_id: z.string().uuid('Valid Unit ID is required'),
  sku: z.string().min(1, 'SKU is required').max(50),
  barcode: z.string().max(50).optional().nullable(),
  purchase_price: z.number().nonnegative('Purchase price must be positive'),
  selling_price: z.number().positive('Selling price must be greater than zero'),
  gst_percent: z.number().min(0).max(28).default(0),
  min_stock: z.number().min(0).default(0),
  max_stock: z.number().min(0).default(100),
  image_url: z.string().url('Invalid image URL').optional().nullable().or(z.literal('')),
  is_active: z.boolean().default(true),
});

export const updateProductSchema = createProductSchema.partial();

export const productQuerySchema = z.object({
  search: z.string().optional(),
  category_id: z.string().uuid().optional(),
  brand_id: z.string().uuid().optional(),
  low_stock: z.enum(['true', 'false']).optional(),
  is_active: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;

