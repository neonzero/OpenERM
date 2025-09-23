import { z } from 'zod';

export const markKeyRiskSchema = z.object({
  keyRisk: z.boolean()
});

export type MarkKeyRiskDto = z.infer<typeof markKeyRiskSchema>;
