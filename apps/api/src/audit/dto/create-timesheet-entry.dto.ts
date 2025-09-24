import { z } from 'zod';

export const createTimesheetEntrySchema = z.object({
  id: z.string().cuid().optional(),
  engagementId: z.string().cuid(),
  date: z.coerce.date(),
  hours: z.number().min(0).max(24),
  activity: z.string().optional(),
  role: z.string().optional()
});

export type CreateTimesheetEntryDto = z.infer<typeof createTimesheetEntrySchema>;

export const listTimesheetsSchema = z.object({
  start: z.coerce.date().optional(),
  end: z.coerce.date().optional(),
  engagementId: z.string().cuid().optional(),
  userId: z.string().cuid().optional()
});

export type ListTimesheetsDto = z.infer<typeof listTimesheetsSchema>;
