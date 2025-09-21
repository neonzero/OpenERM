import { describe, expect, it, jest } from '@jest/globals';
import { RiskService } from '../src/risk/risk.service';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { EventsService } from '../src/events/events.service';

const createService = () => {
  const prisma = {
    risk: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn()
    },
    assessment: {

      create: jest.fn()
    }
  } as unknown as PrismaService;

  const events = {
    record: jest.fn()
  } as unknown as EventsService;

  const service = new RiskService(prisma, events);

  return { prisma, events, service };
};

describe('RiskService', () => {
  it('builds a 5x5 heatmap and classifies appetite breaches', async () => {
    const { prisma, service } = createService();

    (prisma.risk.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'risk-1',
        title: 'Availability',
        status: 'Monitoring',
        residualL: 2,
        residualI: 4,
        inherentL: 4,
        inherentI: 5,
        appetiteBreached: true
      },
      {
        id: 'risk-2',
        title: 'Compliance',
        status: 'Open',
        residualL: null,
        residualI: null,
        inherentL: 3,
        inherentI: 2,
        appetiteBreached: false
      }
    ]);

    const result = await service.heatmap('tenant-1');

    expect(result.matrix['L2_I4'].count).toBe(1);
    expect(result.matrix['L3_I2'].count).toBe(1);
    expect(result.matrix['L2_I4'].risks[0]).toMatchObject({ id: 'risk-1', appetiteBreached: true });
    expect(result.totals.totalRisks).toBe(2);
    expect(result.totals.appetiteBreaches).toBe(1);
  });

  it('creates assessments and updates residual scoring', async () => {
    const { prisma, events, service } = createService();

    (prisma.risk.findFirst as jest.Mock).mockResolvedValue({
      id: 'risk-1',
      tenantId: 'tenant-1',
      residualL: null,
      residualI: null
    });

    (prisma.assessment.create as jest.Mock).mockResolvedValue({ id: 'assessment-1' });

    const dto = {
      riskId: 'risk-1',
      method: 'qual',
      scores: {
        likelihood: 4,
        impact: 5,
        residualLikelihood: 2,
        residualImpact: 3,
        appetiteThreshold: 5
      }
    } as const;

    await service.createAssessment('tenant-1', dto, 'actor-1');

    expect(prisma.assessment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ matrixBucket: 'L4_I5' })
      })
    );
    expect(prisma.risk.update).toHaveBeenCalledWith({
      where: { id: 'risk-1' },
      data: expect.objectContaining({ residualL: 2, residualI: 3, appetiteBreached: true })
    });
    expect(events.record).toHaveBeenCalledWith('tenant-1', expect.any(Object));

  });
});
