import { z } from 'zod';

export const createFollowUpSchema = z.object({
  evidenceRefs: z.array(z.string()).default([]),
  status: z.string().default('Open'),
  verify: z
    .object({
      verifiedBy: z.string().uuid(),
      verifiedAt: z.coerce.date()
    })
    .optional()
});

export type CreateFollowUpDto = z.infer<typeof createFollowUpSchema>;
