import { z } from 'zod';

export const reportTemplateKeys = ['engagement-report', 'issues-log'] as const;

export const generateReportSchema = z.object({
  tenantId: z.string().cuid(),
  templateKey: z.enum(reportTemplateKeys),
  engagementId: z.string().cuid().optional(),
  auditPlanId: z.string().cuid().optional(),
  options: z
    .object({
      includeFindings: z.boolean().default(true),
      summaryOverride: z.string().optional()
    })
    .default({ includeFindings: true }),
  outputName: z.string().min(3).optional()
});

export type GenerateReportDto = z.infer<typeof generateReportSchema>;
