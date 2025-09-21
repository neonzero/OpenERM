import { z } from 'zod';

export const createRiskAssessmentSchema = z.object({
  riskId: z.string().cuid(),
  method: z.enum(['qual', 'quant']).default('qual'),
  criteriaConfig: z.record(z.any()).optional(),
  scores: z.object({
    likelihood: z.number().int().min(1).max(5),
    impact: z.number().int().min(1).max(5),
    velocity: z.number().int().min(1).max(5).optional(),
    residualLikelihood: z.number().int().min(1).max(5).optional(),
    residualImpact: z.number().int().min(1).max(5).optional(),
    appetiteThreshold: z.number().int().min(1).max(25).optional()
  }),
  reviewerId: z.string().uuid().optional(),
  notes: z.string().optional()
});

export type CreateRiskAssessmentDto = z.infer<typeof createRiskAssessmentSchema>;
