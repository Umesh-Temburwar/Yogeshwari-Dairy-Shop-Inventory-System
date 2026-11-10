import { z } from 'zod';

export const createSupplierSchema = z.object({
  name: z.string().min(2, 'Supplier name is required').max(150),
  contact_person: z.string().max(100).optional().nullable(),
  phone: z
    .string()
    .regex(/^[0-9+ -]{7,15}$/, 'Invalid phone number format')
    .optional()
    .nullable(),
  email: z.string().email('Invalid email address').optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  gst_number: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid 15-character GST format')
    .optional()
    .nullable()
    .or(z.literal('')),
});

export const updateSupplierSchema = createSupplierSchema.partial();

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;

