import { z } from 'zod';

export const createFindingSchema = z.object({
  severity: z.string().min(2),
  condition: z.string().min(3),
  cause: z.string().min(3),
  effect: z.string().min(3),
  recommendation: z.string().min(3),
  riskId: z.string().uuid().optional(),
  ownerId: z.string().uuid().optional(),
  due: z.coerce.date().optional(),
  status: z.string().default('Open')
});

export type CreateFindingDto = z.infer<typeof createFindingSchema>;
