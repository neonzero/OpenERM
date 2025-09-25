import { z } from 'zod';

export const upsertReportTemplateSchema = z.object({
  id: z.string().cuid().optional(),
  name: z.string().min(3),
  sections: z.array(z.object({ title: z.string(), body: z.string() })).min(1),
  placeholders: z.array(z.string()).default([])
});

export type UpsertReportTemplateDto = z.infer<typeof upsertReportTemplateSchema>;
