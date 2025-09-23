import { z } from 'zod';

const riskStatusEnum = z.enum(['Open', 'Closed', 'Accepted']);

export const updateRiskStatusSchema = z.object({
  status: riskStatusEnum,
  reviewDate: z.coerce.date().optional()
});

export type RiskStatus = z.infer<typeof riskStatusEnum>;
export type UpdateRiskStatusDto = z.infer<typeof updateRiskStatusSchema>;
