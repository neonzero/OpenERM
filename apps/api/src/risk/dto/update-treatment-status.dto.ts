import { z } from 'zod';

const workflowStatuses = ['Open', 'In Progress', 'Implemented', 'Verified'] as const;

const updateTaskSchema = z.object({
  id: z.string().cuid(),
  status: z.string().optional(),
  due: z.coerce.date().optional()
});

export const updateTreatmentStatusSchema = z.object({
  status: z.enum(workflowStatuses),
  residualLikelihood: z.number().int().min(1).max(5).optional(),
  residualImpact: z.number().int().min(1).max(5).optional(),
  tasks: z.array(updateTaskSchema).optional()
});

export type UpdateTreatmentStatusDto = z.infer<typeof updateTreatmentStatusSchema>;
export type UpdateTreatmentTaskDto = z.infer<typeof updateTaskSchema>;
