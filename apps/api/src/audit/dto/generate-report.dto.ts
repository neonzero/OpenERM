import { z } from 'zod';

export const generateReportSchema = z.object({
  tenantId: z.string().cuid(),
  templateId: z.string().cuid().optional(),
  engagementId: z.string().cuid().optional(),
  auditPlanId: z.string().cuid().optional(),
  fileRef: z.string().min(3)
});

export type GenerateReportDto = z.infer<typeof generateReportSchema>;
