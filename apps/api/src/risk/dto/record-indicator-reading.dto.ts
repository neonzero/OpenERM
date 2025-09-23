import { z } from 'zod';

export const recordIndicatorReadingSchema = z.object({
  value: z.number(),
  recordedAt: z.coerce.date().optional()
});

export type RecordIndicatorReadingDto = z.infer<typeof recordIndicatorReadingSchema>;
