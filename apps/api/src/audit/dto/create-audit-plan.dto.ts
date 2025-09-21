import { z } from 'zod';

const capacitySchema = z.object({
  role: z.string().min(2),
  hoursAvailable: z.number().nonnegative(),
  utilization: z.number().min(0).max(1).optional()
});

const planItemSchema = z
  .object({
    engagementId: z.string().uuid().optional(),
    auditableEntityId: z.string().uuid().optional(),
    priority: z.number().int().min(1),
    plannedStart: z.string().datetime().optional(),
    plannedEnd: z.string().datetime().optional()
  })
  .refine((value) => value.engagementId || value.auditableEntityId, {
    message: 'Provide an engagement or auditable entity reference'
  });

export const createAuditPlanSchema = z.object({
  period: z.string().min(2),
  status: z.enum(['DRAFT', 'APPROVED', 'IN_PROGRESS', 'COMPLETED']).optional(),
  items: z.array(planItemSchema).optional(),
  capacities: z.array(capacitySchema).optional()
});

export type CreateAuditPlanDto = z.infer<typeof createAuditPlanSchema>;
