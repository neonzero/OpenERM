import { z } from 'zod';

export const importRisksSchema = z.object({
  csv: z.string().min(5)
});

export type ImportRisksDto = z.infer<typeof importRisksSchema>;
