import { z } from 'zod';

export const approveTimesheetSchema = z.object({
  approvedAt: z.coerce.date().optional()
});

export type ApproveTimesheetDto = z.infer<typeof approveTimesheetSchema>;
