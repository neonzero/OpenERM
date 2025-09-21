import { describe, expect, it, jest } from '@jest/globals';
import { RiskService } from '../src/risk/risk.service';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { EventsService } from '../src/events/events.service';
import { RiskStatus } from '@prisma/client';

describe('RiskService', () => {
  const prisma = {
    risk: {
      create: jest.fn().mockResolvedValue({ id: 'risk-1', status: RiskStatus.DRAFT })
    },
    auditTrailEvent: {
      create: jest.fn()
    }
  } as unknown as PrismaService;

  const events = {
    emit: jest.fn()
  } as unknown as EventsService;

  it('creates risk and emits domain event', async () => {
    const service = new RiskService(prisma, events);

    const result = await service.create('tenant-1', {
      referenceId: 'R-1',
      title: 'Test Risk',
      categoryId: 'cat-1',
      inherentScore: 5,
      tags: []
    }, 'user-1');

    expect(result.id).toBe('risk-1');
    expect(events.emit).toHaveBeenCalledWith('risk.created', expect.any(Object));
  });
});
