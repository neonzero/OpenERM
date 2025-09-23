import { z } from 'zod';

export const createIndicatorSchema = z.object({
  riskId: z.string().cuid(),
  name: z.string().min(3),
  direction: z.enum(['above', 'below']),
  threshold: z.number().optional(),
  unit: z.string().optional(),
  cadence: z.string().optional()
});

export type CreateIndicatorDto = z.infer<typeof createIndicatorSchema>;
