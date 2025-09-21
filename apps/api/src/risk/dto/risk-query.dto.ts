import { z } from 'zod';
import { paginationSchema } from '../../common/dto/pagination.dto';

export const riskQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  status: z.string().optional(),
  ownerId: z.string().uuid().optional()
});

export type RiskQueryDto = z.infer<typeof riskQuerySchema>;
