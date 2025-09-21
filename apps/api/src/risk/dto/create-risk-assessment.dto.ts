import { z } from 'zod';
import { AssessmentStatus } from '@prisma/client';

export const createRiskAssessmentSchema = z.object({
  riskId: z.string().uuid(),
  assessorId: z.string().uuid(),
  methodology: z.string().min(3),
  inherentScore: z.number().min(0).max(25),
  residualScore: z.number().min(0).max(25).optional(),
  status: z.nativeEnum(AssessmentStatus).default(AssessmentStatus.DRAFT),
  notes: z.string().optional()
});

export type CreateRiskAssessmentDto = z.infer<typeof createRiskAssessmentSchema>;
