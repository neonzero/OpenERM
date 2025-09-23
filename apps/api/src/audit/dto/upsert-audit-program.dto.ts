import { z } from 'zod';

export const upsertAuditProgramSchema = z.object({
  programId: z.string().cuid().optional(),
  name: z.string().min(3).default('Engagement Program'),
  status: z.string().default('Draft'),
  metadata: z.record(z.any()).optional(),
  steps: z
    .array(
      z.object({
        order: z.number().int().min(1).optional(),
        title: z.string().min(3),
        description: z.string().optional(),
        testProcedure: z.string().min(3),
        evidence: z.string().optional(),
        controlRef: z.string().optional(),
        assertion: z.string().optional(),
        riskRef: z.string().optional()
      })
    )
    .min(1)
});

export type UpsertAuditProgramDto = z.infer<typeof upsertAuditProgramSchema>;
