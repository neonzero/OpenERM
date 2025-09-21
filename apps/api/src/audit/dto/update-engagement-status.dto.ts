import { z } from 'zod';
import { AuditStatus } from '@prisma/client';

export const updateEngagementStatusSchema = z.object({
  status: z.nativeEnum(AuditStatus),
  endDate: z.coerce.date().optional()
});

export type UpdateEngagementStatusDto = z.infer<typeof updateEngagementStatusSchema>;
