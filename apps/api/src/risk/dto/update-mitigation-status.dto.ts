import { z } from 'zod';

export const updateMitigationStatusSchema = z.object({
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'EFFECTIVE', 'CLOSED'])
});

export type UpdateMitigationStatusDto = z.infer<typeof updateMitigationStatusSchema>;
