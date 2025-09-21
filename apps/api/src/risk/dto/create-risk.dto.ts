import { z } from 'zod';

export const createRiskSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(3).optional(),
  taxonomy: z.array(z.string()).default([]),
  cause: z.string().optional(),
  consequence: z.string().optional(),
  ownerId: z.string().uuid().optional(),
  inherentLikelihood: z.number().int().min(1).max(5),
  inherentImpact: z.number().int().min(1).max(5),
  residualLikelihood: z.number().int().min(1).max(5).optional(),
  residualImpact: z.number().int().min(1).max(5).optional(),

  tags: z.array(z.string()).default([])
});

export type CreateRiskDto = z.infer<typeof createRiskSchema>;
