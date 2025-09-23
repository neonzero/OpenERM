import { Prisma } from '@prisma/client';

export type PrismaJsonCompatible = Prisma.InputJsonValue | Prisma.JsonNullValueInput;

export const toPrismaInputJson = (value: unknown): PrismaJsonCompatible => {
  if (value === undefined || value === null) {
    return Prisma.JsonNull as Prisma.JsonNullValueInput;
  }

  try {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  } catch {
    return JSON.parse(JSON.stringify(String(value))) as Prisma.InputJsonValue;
  }
};
