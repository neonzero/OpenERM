import { z } from 'zod';

export const createEngagementSchema = z.object({
  auditPlanId: z.string().cuid().optional(),
  title: z.string().min(3),
  scope: z.string().optional(),
  objectives: z.string().optional(),
  status: z.string().default('Planned'),
  start: z.coerce.date().optional(),
  end: z.coerce.date().optional(),
  entityRef: z.string().optional(),
  criticality: z.number().int().min(1).max(5).optional(),
  priority: z.number().int().min(1).optional(),
  riskScore: z.number().min(0).optional(),
  team: z.record(z.any()).optional()
});

export type CreateEngagementDto = z.infer<typeof createEngagementSchema>;
