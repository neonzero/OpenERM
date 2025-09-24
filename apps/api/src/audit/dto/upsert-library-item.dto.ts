import { z } from 'zod';

export const libraryItemTypes = ['control', 'process', 'policy'] as const;

export const upsertLibraryItemSchema = z.object({
  id: z.string().cuid().optional(),
  type: z.enum(libraryItemTypes),
  title: z.string().min(3),
  description: z.string().optional(),
  content: z
    .union([z.string(), z.record(z.any())])
    .transform((value) => (typeof value === 'string' ? { body: value } : value)),
  tags: z.array(z.string()).default([])
});

export type UpsertLibraryItemDto = z.infer<typeof upsertLibraryItemSchema>;

export const listLibraryItemsSchema = z.object({
  type: z.enum(libraryItemTypes).optional(),
  search: z.string().optional(),
  tag: z.string().optional()
});

export type ListLibraryItemsDto = z.infer<typeof listLibraryItemsSchema>;
