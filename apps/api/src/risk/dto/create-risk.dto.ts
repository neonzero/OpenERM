import { z } from 'zod';

export const createRiskSchema = z.object({
  referenceId: z.string().min(3),
  title: z.string().min(3),
  description: z.string().min(5).optional(),
  categoryId: z.string().uuid(),
  ownerId: z.string().uuid().optional(),
  inherentScore: z.number().min(0).max(25),
  tags: z.array(z.string()).default([])
});

export type CreateRiskDto = z.infer<typeof createRiskSchema>;
