import { z } from 'zod';

export const createAuditPlanSchema = z.object({
  period: z.string().min(2),
  status: z.string().default('Draft'),
  resourceModel: z.record(z.any()).optional(),
  engagements: z
    .array(
      z.object({
        title: z.string().min(3),
        scope: z.string().optional(),
        objectives: z.string().optional(),
        start: z.coerce.date().optional(),
        end: z.coerce.date().optional(),
        entityRef: z.string().optional(),
        criticality: z.number().int().min(1).max(5).optional()
      })
    )
    .default([])
});

export type CreateAuditPlanDto = z.infer<typeof createAuditPlanSchema>;
