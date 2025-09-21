import { z } from 'zod';
import { FindingRating } from '@prisma/client';

export const createFindingSchema = z.object({
  title: z.string().min(5),
  criteria: z.string().min(5),
  condition: z.string().min(5),
  cause: z.string().optional(),
  effect: z.string().optional(),
  rating: z.nativeEnum(FindingRating),
  assigneeId: z.string().uuid().optional(),
  dueDate: z.coerce.date().optional()
});

export type CreateFindingDto = z.infer<typeof createFindingSchema>;
