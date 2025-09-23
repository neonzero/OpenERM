import { z } from 'zod';

const auditStatusEnum = z.enum(['Planned', 'InProgress', 'Completed', 'Cancelled']);

export const updateEngagementStatusSchema = z.object({
  status: auditStatusEnum,
  endDate: z.coerce.date().optional()
});

export type AuditStatus = z.infer<typeof auditStatusEnum>;
export type UpdateEngagementStatusDto = z.infer<typeof updateEngagementStatusSchema>;
