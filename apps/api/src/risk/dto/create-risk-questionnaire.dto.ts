import { z } from 'zod';

const questionSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().min(3),
  type: z.enum(['text', 'scale', 'multi']),
  options: z.array(z.string()).optional()
});

export const createRiskQuestionnaireSchema = z.object({
  period: z.string().min(2),
  scope: z.string().optional(),
  audience: z.array(z.string()).min(1),
  questions: z.array(questionSchema).min(1),
  dueDate: z.coerce.date().optional(),
  status: z.enum(['Draft', 'Sent', 'Closed']).default('Draft')
});

export type CreateRiskQuestionnaireDto = z.infer<typeof createRiskQuestionnaireSchema>;
