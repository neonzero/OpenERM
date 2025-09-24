import { z } from 'zod';
import { paginationSchema } from '../../common/dto/pagination.dto';

const sortOptions = ['updatedAt', 'residualScoreAsc', 'residualScoreDesc'] as const;

export const riskQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  status: z.string().optional(),
  ownerId: z.string().uuid().optional(),
  taxonomy: z.union([z.string(), z.array(z.string())]).optional(),
  keyRisk: z.coerce.boolean().optional(),
  appetiteBreached: z.coerce.boolean().optional(),
  sort: z.enum(sortOptions).default('updatedAt'),
  likelihood: z.coerce.number().optional(),
  impact: z.coerce.number().optional(),
});

export type RiskQueryDto = z.infer<typeof riskQuerySchema>;
