import { z } from 'zod';

export const tenantContextSchema = z.object({
  tenantId: z.string().uuid()
});

export type TenantContextDto = z.infer<typeof tenantContextSchema>;
