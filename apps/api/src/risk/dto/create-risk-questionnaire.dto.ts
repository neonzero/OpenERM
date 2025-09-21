import { z } from 'zod';

const questionSchema = z.object({
  prompt: z.string().min(3),
  responseType: z.enum(['TEXT', 'MULTI_SELECT', 'SCALE']),
  options: z.array(z.string()).optional(),
  sortOrder: z.number().int().nonnegative().optional()
});

export const createRiskQuestionnaireSchema = z.object({
  title: z.string().min(3),
  period: z.string().min(2),
  scope: z.string().min(2).optional(),
  audience: z.array(z.string().min(2)).min(1),
  status: z.enum(['DRAFT', 'SENT', 'CLOSED']).optional(),
  dueDate: z.string().datetime().optional(),
  questions: z.array(questionSchema).min(1)
});

export type CreateRiskQuestionnaireDto = z.infer<typeof createRiskQuestionnaireSchema>;
