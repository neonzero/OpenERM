import { z } from 'zod';

export const createWorkpaperSchema = z.object({
  kind: z.string().min(3),
  storageKey: z.string().min(3),
  checksum: z.string().min(3),
  tags: z.array(z.string()).default([]),
  signedBy: z.string().uuid().optional(),
  signedAt: z.coerce.date().optional()
});

export type CreateWorkpaperDto = z.infer<typeof createWorkpaperSchema>;
