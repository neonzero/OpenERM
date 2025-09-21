import { z } from 'zod';
import { AuditStatus } from '@prisma/client';

export const createEngagementSchema = z.object({
  code: z.string().min(3),
  name: z.string().min(3),
  description: z.string().optional(),
  ownerId: z.string().uuid().optional(),
  riskId: z.string().uuid().optional(),
  status: z.nativeEnum(AuditStatus).default(AuditStatus.PLANNING),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional()
});

export type CreateEngagementDto = z.infer<typeof createEngagementSchema>;
