import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters').max(100),
  description: z.string().max(500).optional().nullable(),
  image_url: z.string().max(2000).optional().nullable(),
  marathi_name: z.string().max(100).optional().nullable(),
  hindi_name: z.string().max(100).optional().nullable(),
});

export const updateCategorySchema = createCategorySchema.partial();

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

