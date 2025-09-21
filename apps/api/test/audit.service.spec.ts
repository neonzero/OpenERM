import { describe, expect, it, jest } from '@jest/globals';
import { AuditService } from '../src/audit/audit.service';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { EventsService } from '../src/events/events.service';

const createService = () => {
  const prisma = {
    auditUniverse: {
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn()
    },
    auditPlan: {
      create: jest.fn()
    },
    engagement: {
      findFirst: jest.fn(),
      create: jest.fn()
    },
    rACMLine: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn()
    },
    workingPaper: {
      create: jest.fn()
    },
    finding: {
      findFirst: jest.fn(),
      create: jest.fn()
    },
    followUp: {
      update: jest.fn(),
      create: jest.fn()
    },
    report: {
      create: jest.fn()
    }
  } as unknown as PrismaService;

  const events = {
    record: jest.fn()
  } as unknown as EventsService;

  const service = new AuditService(prisma, events);

  return { prisma, events, service };
};

describe('AuditService', () => {
  it('upserts audit universe entries and records events', async () => {
    const { prisma, events, service } = createService();

    (prisma.auditUniverse.findFirst as jest.Mock).mockResolvedValue({
      id: 'entity-1',
      tenantId: 'tenant-1'
    });

    (prisma.auditUniverse.update as jest.Mock).mockResolvedValue({ id: 'entity-1' });
    (prisma.auditUniverse.create as jest.Mock).mockResolvedValue({ id: 'entity-2' });

    const dto = {
      entities: [
        {
          id: 'entity-1',
          name: 'Updated Entity',
          description: 'desc',
          criticality: 3,
          linkedRiskIds: []
        },
        {
          name: 'New Entity',
          description: 'new',
          criticality: 4,
          linkedRiskIds: []
        }
      ]
    } as const;

    const result = await service.upsertAuditUniverse('tenant-1', dto, 'actor-1');

    expect(result).toHaveLength(2);
    expect(prisma.auditUniverse.update).toHaveBeenCalled();
    expect(prisma.auditUniverse.create).toHaveBeenCalled();
    expect(events.record).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({ type: 'audit.universe.upserted', diff: { count: 2 } })
    );
  });

  it('records follow-up progress by updating existing records', async () => {
    const { prisma, events, service } = createService();

    (prisma.finding.findFirst as jest.Mock).mockResolvedValue({
      id: 'finding-1',
      followUps: [
        {
          id: 'follow-1',
          status: 'Open',
          evidenceRefs: [],
          verifiedBy: null,
          verifiedAt: null
        }
      ]
    });

    (prisma.followUp.update as jest.Mock).mockResolvedValue({ id: 'follow-1', status: 'Closed' });

    const dto = {
      evidenceRefs: ['evidence://doc.pdf'],
      status: 'Closed',
      verify: {
        verifiedBy: 'user-1',
        verifiedAt: new Date()
      }
    } as const;

    const followUp = await service.recordFollowUp('tenant-1', 'finding-1', dto, 'actor-1');

    expect(prisma.followUp.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'Closed' }) })
    );
    expect(events.record).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({ type: 'audit.followup.recorded', entityId: 'follow-1' })
    );
    expect(followUp.status).toBe('Closed');
  });
});
