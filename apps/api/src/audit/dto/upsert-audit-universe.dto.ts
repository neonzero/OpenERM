import { z } from 'zod';

export const upsertAuditUniverseSchema = z.object({
  entities: z
    .array(
      z.object({
        id: z.string().cuid().optional(),
        name: z.string().min(3),
        description: z.string().optional(),
        criticality: z.number().int().min(1).max(5),
        lastAudit: z.coerce.date().optional(),
        nextDue: z.coerce.date().optional(),
        linkedRiskIds: z.array(z.string().cuid()).default([])
      })
    )
    .min(1)
});

export type UpsertAuditUniverseDto = z.infer<typeof upsertAuditUniverseSchema>;
