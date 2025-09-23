import { z } from 'zod';

export const submitQuestionnaireResponseSchema = z.object({
  respondentEmail: z.string().email(),
  answers: z.record(z.any()),
  status: z.enum(['Pending', 'Submitted']).default('Submitted'),
  riskId: z.string().cuid().optional(),
  submittedAt: z.coerce.date().optional()
});

export type SubmitQuestionnaireResponseDto = z.infer<typeof submitQuestionnaireResponseSchema>;
