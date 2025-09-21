import { z } from 'zod';

export const createFollowUpSchema = z.object({
  findingId: z.string().uuid(),
  evidenceRefs: z.array(z.string()).optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'READY_FOR_VERIFICATION', 'CLOSED']).optional()
});

export type CreateFollowUpDto = z.infer<typeof createFollowUpSchema>;
