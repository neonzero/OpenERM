import { z } from 'zod';
import { RecommendationStatus } from '@prisma/client';

export const createRecommendationSchema = z.object({
  description: z.string().min(5),
  ownerId: z.string().uuid().optional(),
  status: z.nativeEnum(RecommendationStatus).default(RecommendationStatus.PROPOSED),
  dueDate: z.coerce.date().optional()
});

export type CreateRecommendationDto = z.infer<typeof createRecommendationSchema>;
