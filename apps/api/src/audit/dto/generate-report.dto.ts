import { z } from 'zod';

export const generateReportSchema = z.object({
  templateId: z.string().uuid(),
  context: z.object({
    type: z.enum(['RISK_REGISTER', 'AUDIT_ENGAGEMENT']),
    entityId: z.string().uuid().optional()
  })
});

export type GenerateReportDto = z.infer<typeof generateReportSchema>;
