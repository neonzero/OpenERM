import { z } from 'zod';

export const createFollowUpSchema = z.object({
  evidenceRefs: z.array(z.string()).default([]),
  status: z.string().default('Open'),
  actionPlan: z.string().optional(),
  due: z.coerce.date().optional(),
  verify: z
    .object({
      verifiedBy: z.string().uuid(),
      verifiedAt: z.coerce.date(),
      notes: z.string().optional()
    })
    .optional()
});

export type CreateFollowUpDto = z.infer<typeof createFollowUpSchema>;
