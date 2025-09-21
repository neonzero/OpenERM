import { z } from 'zod';

export const createRiskIndicatorSchema = z.object({
  name: z.string().min(3),
  description: z.string().min(3).optional(),
  cadence: z.string().min(2).optional(),
  direction: z.enum(['INCREASE', 'DECREASE', 'RANGE']).optional(),
  threshold: z.number().optional(),
  target: z.number().optional()
});

export type CreateRiskIndicatorDto = z.infer<typeof createRiskIndicatorSchema>;
