import { z } from 'zod';

export const recordTimesheetSchema = z.object({
  engagementId: z.string().uuid(),
  entryDate: z.string().datetime(),
  hours: z.number().positive(),
  activity: z.string().min(3).optional()
});

export type RecordTimesheetDto = z.infer<typeof recordTimesheetSchema>;
