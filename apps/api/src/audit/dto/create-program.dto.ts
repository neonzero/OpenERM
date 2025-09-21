import { z } from 'zod';

const stepSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  procedure: z.string().optional(),
  evidence: z.string().optional(),
  sortOrder: z.number().int().nonnegative().optional()
});

export const createProgramSchema = z.object({
  name: z.string().min(3),
  steps: z.array(stepSchema).min(1)
});

export type CreateProgramDto = z.infer<typeof createProgramSchema>;
