import { z } from 'zod';

export const createRacmEntrySchema = z.object({
  process: z.string().min(3),
  riskId: z.string().uuid().optional(),
  controlId: z.string().uuid().optional(),
  assertion: z.string().optional(),
  testStepId: z.string().uuid().optional()
});

export type CreateRacmEntryDto = z.infer<typeof createRacmEntrySchema>;
