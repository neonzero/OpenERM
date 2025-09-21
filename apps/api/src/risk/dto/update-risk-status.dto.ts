import { z } from 'zod';
import { RiskStatus } from '@prisma/client';

export const updateRiskStatusSchema = z.object({
  status: z.nativeEnum(RiskStatus),
  reviewDate: z.coerce.date().optional()
});

export type UpdateRiskStatusDto = z.infer<typeof updateRiskStatusSchema>;
