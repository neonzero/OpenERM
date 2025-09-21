import { z } from 'zod';

export const submitQuestionnaireResponseSchema = z.object({
  respondentId: z.string().uuid().optional(),
  answers: z.record(z.string(), z.any())
});

export type SubmitQuestionnaireResponseDto = z.infer<typeof submitQuestionnaireResponseSchema>;
