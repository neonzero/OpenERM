import { z } from 'zod';

export const updateTimesheetStatusSchema = z.object({
  status: z.enum(['SUBMITTED', 'APPROVED', 'REJECTED'])
});

export type UpdateTimesheetStatusDto = z.infer<typeof updateTimesheetStatusSchema>;
