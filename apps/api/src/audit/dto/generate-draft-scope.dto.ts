import { z } from 'zod';
import { libraryItemTypes } from './upsert-library-item.dto';

export const generateDraftScopeSchema = z.object({
  libraryTypes: z.array(z.enum(libraryItemTypes)).optional(),
  riskIds: z.array(z.string().cuid()).optional(),
  includeControls: z.boolean().default(true)
});

export type GenerateDraftScopeDto = z.infer<typeof generateDraftScopeSchema>;
