import { z } from 'zod';

const recommendationStatusEnum = z.enum(['Open', 'Implemented', 'Rejected']);

export const createRecommendationSchema = z.object({
  description: z.string().min(5),
  ownerId: z.string().uuid().optional(),
  status: recommendationStatusEnum.default('Open'),
  dueDate: z.coerce.date().optional()
});

export type RecommendationStatus = z.infer<typeof recommendationStatusEnum>;
export type CreateRecommendationDto = z.infer<typeof createRecommendationSchema>;
