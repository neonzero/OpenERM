import { z } from 'zod';

const actionSchema = z.object({
  description: z.string().min(3),
  ownerId: z.string().uuid().optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  dueDate: z.string().datetime().optional()
});

export const createMitigationSchema = z.object({
  title: z.string().min(3),
  strategy: z.string().min(3),
  ownerId: z.string().uuid().optional(),
  dueDate: z.string().datetime().optional(),
  actions: z.array(actionSchema).optional()
});

export type CreateMitigationDto = z.infer<typeof createMitigationSchema>;
