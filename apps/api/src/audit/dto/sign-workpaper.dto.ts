import { z } from 'zod';

export const signWorkpaperSchema = z.object({
  signature: z.string().min(2).optional(),
  signedAt: z.coerce.date().optional()
});

export type SignWorkpaperDto = z.infer<typeof signWorkpaperSchema>;
