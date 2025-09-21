import { describe, expect, it, jest } from '@jest/globals';
import { RiskService } from '../src/risk/risk.service';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { EventsService } from '../src/events/events.service';
import { IndicatorStatus, MitigationStatus, RiskStatus } from '@prisma/client';

const createService = () => {
  const prisma = {
    risk: {
      upsert: jest.fn(),
      findMany: jest.fn()
    },
    riskCategory: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation(async ({ data }) => ({ id: `cat-${data.name}`, ...data }))
    },
    user: {
      findFirst: jest.fn().mockResolvedValue({ id: 'user-1' })
    },
    auditTrailEvent: {
      create: jest.fn()
    },
    mitigationPlan: {
      findMany: jest.fn()
    },
    riskIndicator: {
      findMany: jest.fn()
    },
    tenantRiskPreference: {
      findUnique: jest.fn()
    },
    $transaction: jest.fn()
  } as unknown as PrismaService;

  const events = {
    emit: jest.fn()
  } as unknown as EventsService;

  const service = new RiskService(prisma, events);

  return { service, prisma, events };
};

describe('RiskService', () => {
  it('imports CSV risks and upserts rows', async () => {
    const { service, prisma, events } = createService();

    const csv = 'referenceId,title,category,inherentScore,residualScore,status\nR-1,Ransomware,Technology,12,6,MITIGATION';

    (prisma.risk.upsert as jest.Mock).mockResolvedValue({ id: 'risk-1' });

    const result = await service.importRisks('tenant-1', { csv }, 'actor-1');

    expect(result.imported).toBe(1);
    expect(prisma.risk.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId_referenceId: { tenantId: 'tenant-1', referenceId: 'R-1' } },
        update: expect.objectContaining({
          title: 'Ransomware',
          status: RiskStatus.MITIGATION
        }),
        create: expect.objectContaining({
          title: 'Ransomware',
          status: RiskStatus.MITIGATION
        })
      })
    );

    expect(events.emit).toHaveBeenCalledWith('risk.imported', { tenantId: 'tenant-1', processed: 1 });
  });

  it('aggregates dashboard metrics', async () => {
    const { service, prisma } = createService();

    (prisma.$transaction as jest.Mock).mockResolvedValue([
      [
        {
          id: 'risk-1',
          title: 'Resiliency',
          inherentScore: 15,
          residualScore: 10,
          owner: { displayName: 'Owner 1' }
        }
      ],
      { residualAppetite: 5 },
      [
        { status: MitigationStatus.IN_PROGRESS },
        { status: MitigationStatus.PLANNED }
      ],
      [
        { status: IndicatorStatus.ON_TRACK },
        { status: IndicatorStatus.BREACHED }
      ]
    ]);

    const dashboard = await service.dashboard('tenant-1');

    expect(dashboard.totalRisks).toBe(1);
    expect(dashboard.topRisks[0]).toEqual(
      expect.objectContaining({
        title: 'Resiliency',
        residualScore: 10
      })
    );
    expect(dashboard.appetiteBreaches).toHaveLength(1);
    expect(dashboard.mitigationSummary[MitigationStatus.IN_PROGRESS]).toBe(1);
    expect(dashboard.indicatorSummary[IndicatorStatus.BREACHED]).toBe(1);
  });
});
