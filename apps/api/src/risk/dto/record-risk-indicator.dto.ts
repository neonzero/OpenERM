import { z } from 'zod';

export const recordRiskIndicatorSchema = z.object({
  value: z.number(),
  note: z.string().optional()
});

export type RecordRiskIndicatorDto = z.infer<typeof recordRiskIndicatorSchema>;
