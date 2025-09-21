import { z } from 'zod';

export const upsertRacmSchema = z.object({
  lines: z
    .array(
      z.object({
        process: z.string().min(2),
        riskRef: z.string().min(2),
        controlRef: z.string().min(2),
        assertion: z.string().min(2),
        testStep: z.string().min(3),
        version: z.number().int().min(1).optional()
      })
    )
    .min(1)
});

export type UpsertRacmDto = z.infer<typeof upsertRacmSchema>;
