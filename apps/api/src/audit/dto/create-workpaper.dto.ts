import { z } from 'zod';

export const createWorkpaperSchema = z.object({
  referenceCode: z.string().min(2),
  name: z.string().min(3),
  description: z.string().optional(),
  assigneeId: z.string().uuid().optional()
});

export type CreateWorkpaperDto = z.infer<typeof createWorkpaperSchema>;
