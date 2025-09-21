import { z } from 'zod';

export const addPlanItemSchema = z
  .object({
    engagementId: z.string().uuid().optional(),
    auditableEntityId: z.string().uuid().optional(),
    priority: z.number().int().min(1),
    status: z.enum(['PLANNED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETE', 'DROPPED']).optional(),
    plannedStart: z.string().datetime().optional(),
    plannedEnd: z.string().datetime().optional()
  })
  .refine((value) => value.engagementId || value.auditableEntityId, {
    message: 'Provide an engagement or auditable entity reference'
  });

export type AddPlanItemDto = z.infer<typeof addPlanItemSchema>;
