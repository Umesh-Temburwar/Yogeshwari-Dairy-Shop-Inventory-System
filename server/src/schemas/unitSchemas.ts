import { z } from 'zod';

export const createUnitSchema = z.object({
  name: z.string().min(1, 'Unit name is required').max(50),
  short_code: z.string().min(1, 'Short code is required').max(15),
});

export const updateUnitSchema = createUnitSchema.partial();

export type CreateUnitInput = z.infer<typeof createUnitSchema>;
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>;

