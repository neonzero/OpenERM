import { z } from 'zod';

export const indicatorTrendQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(90)
});

export type IndicatorTrendQueryDto = z.infer<typeof indicatorTrendQuerySchema>;
