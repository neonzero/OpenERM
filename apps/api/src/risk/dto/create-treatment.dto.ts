import { z } from 'zod';

const taskSchema = z.object({
  title: z.string().min(3),
  status: z.string().optional(),
  due: z.coerce.date().optional()
});

export const createTreatmentSchema = z.object({
  riskId: z.string().cuid(),
  title: z.string().min(3),
  ownerId: z.string().uuid().optional(),
  due: z.coerce.date().optional(),
  status: z.string().default('Open'),
  tasks: z.array(taskSchema).default([])
});

export type CreateTreatmentDto = z.infer<typeof createTreatmentSchema>;
