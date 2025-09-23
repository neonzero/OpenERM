import { z } from 'zod';

export const riskImportRowSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  taxonomy: z.array(z.string()).default([]),
  ownerEmail: z.string().email().optional(),
  cause: z.string().optional(),
  consequence: z.string().optional(),
  inherentLikelihood: z.number().int().min(1).max(5),
  inherentImpact: z.number().int().min(1).max(5),
  residualLikelihood: z.number().int().min(1).max(5).optional(),
  residualImpact: z.number().int().min(1).max(5).optional(),
  status: z.string().optional(),
  tags: z.array(z.string()).default([]),
  keyRisk: z.boolean().optional()
});

export const importRisksSchema = z.object({
  csv: z.string().min(1)
});

export type ImportRisksDto = z.infer<typeof importRisksSchema>;
export type RiskImportRow = z.infer<typeof riskImportRowSchema>;
