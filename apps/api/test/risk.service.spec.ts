import { describe, expect, it, jest } from '@jest/globals';
import { RiskService } from '../src/risk/risk.service';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { EventsService } from '../src/events/events.service';

const createService = () => {
  const prisma = {
    tenant: { findUnique: jest.fn() },
    risk: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn()
    },
    assessment: {
      create: jest.fn()
    },
    treatment: {
      findFirst: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn()
    },
    treatmentTask: {
      update: jest.fn()
    },
    user: {
      findFirst: jest.fn()
    },
    riskIndicator: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    },
    indicatorReading: {
      create: jest.fn()
    },
    questionnaire: {
      findFirst: jest.fn()
    },
    questionnaireResponse: {
      create: jest.fn()
    },
    $transaction: jest.fn(async (operations: Promise<unknown>[]) => Promise.all(operations))
  } as unknown as PrismaService;

  const events = {
    record: jest.fn()
  } as unknown as EventsService;

  const service = new RiskService(prisma, events);

  return { prisma, events, service };
};

describe('RiskService', () => {
  it('builds a coloured heatmap with appetite thresholds', async () => {
    const { prisma, service } = createService();

    (prisma.tenant.findUnique as jest.Mock).mockResolvedValue({
      settings: { heatmap: { greenMax: 4, amberMax: 10, redMax: 25 } }
    });

    (prisma.risk.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'risk-1',
        title: 'Availability',
        status: 'Monitoring',
        residualL: 2,
        residualI: 4,
        inherentL: 4,
        inherentI: 5,
        residualScore: 8,
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
        residualScore: null,
        appetiteBreached: false
      }
    ]);

    const result = await service.heatmap('tenant-1');

    expect(result.matrix['2-4'].count).toBe(1);
    expect(result.matrix['2-4'].color).toBe('amber');
    expect(result.matrix['3-2'].count).toBe(1);
    expect(result.totals.appetiteBreaches).toBe(1);
    expect(result.thresholds).toMatchObject({ greenMax: 4, amberMax: 10, redMax: 25 });
  });

  it('creates assessments and updates residual scoring with appetite thresholds', async () => {
    const { prisma, events, service } = createService();

    (prisma.tenant.findUnique as jest.Mock).mockResolvedValue({ settings: { riskAppetite: 9 } });
    (prisma.risk.findFirst as jest.Mock).mockResolvedValue({
      id: 'risk-1',
      residualL: null,
      residualI: null,
      appetiteThreshold: null,
      appetiteBreached: false
    });
    (prisma.assessment.create as jest.Mock).mockResolvedValue({ id: 'assessment-1' });

    const dto = {
      riskId: 'risk-1',
      method: 'qual',
      scores: {
        likelihood: 4,
        impact: 5,
        residualLikelihood: 2,
        residualImpact: 3
      }
    } as const;

    await service.createAssessment('tenant-1', dto, 'actor-1');

    expect(prisma.assessment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ matrixBucket: '4-5', residualScore: 6 })
      })
    );
    expect(prisma.risk.update).toHaveBeenCalledWith({
      where: { id: 'risk-1' },
      data: expect.objectContaining({
        residualL: 2,
        residualI: 3,
        residualScore: 6,
        appetiteThreshold: 9,
        appetiteBreached: false
      })
    });
    expect(events.record).toHaveBeenCalledWith('tenant-1', expect.any(Object));
  });

  it('promotes a treatment to verified and refreshes residual scoring', async () => {
    const { prisma, events, service } = createService();

    (prisma.treatment.findFirst as jest.Mock).mockResolvedValue({
      id: 'treatment-1',
      tenantId: 'tenant-1',
      status: 'Implemented',
      riskId: 'risk-1',
      risk: {
        id: 'risk-1',
        appetiteThreshold: null,
        appetiteBreached: false
      },
      tasks: []
    });
    (prisma.treatment.update as jest.Mock).mockResolvedValue({
      id: 'treatment-1',
      status: 'Verified',
      tasks: []
    });
    (prisma.tenant.findUnique as jest.Mock).mockResolvedValue({ settings: { riskAppetite: 10 } });

    await service.updateTreatmentStatus(
      'tenant-1',
      'treatment-1',
      { status: 'Verified', residualLikelihood: 2, residualImpact: 4 },
      'actor-1'
    );

    expect(prisma.risk.update).toHaveBeenCalledWith({
      where: { id: 'risk-1' },
      data: expect.objectContaining({
        residualL: 2,
        residualI: 4,
        residualScore: 8,
        appetiteThreshold: 10,
        appetiteBreached: false
      })
    });
    expect(events.record).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({ type: 'risk.treatment.status-changed' })
    );
  });

  it('records KRI readings and raises threshold breaches', async () => {
    const { prisma, events, service } = createService();
    const recordedAt = new Date('2024-01-01T00:00:00.000Z');

    (prisma.riskIndicator.findFirst as jest.Mock).mockResolvedValue({
      id: 'indicator-1',
      tenantId: 'tenant-1',
      direction: 'above',
      threshold: 10,
      breached: false
    });
    (prisma.indicatorReading.create as jest.Mock).mockResolvedValue({
      id: 'reading-1',
      indicatorId: 'indicator-1',
      value: 12,
      recordedAt
    });

    await service.recordIndicatorReading(
      'tenant-1',
      'indicator-1',
      { value: 12, recordedAt },
      'actor-1'
    );

    expect(prisma.riskIndicator.update).toHaveBeenCalledWith({
      where: { id: 'indicator-1' },
      data: expect.objectContaining({ latestValue: 12, breached: true })
    });
    expect(events.record).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({ type: 'risk.indicator.threshold-breached' })
    );
  });

  it('imports risks from CSV and flags validation errors', async () => {
    const { prisma, events, service } = createService();

    (prisma.tenant.findUnique as jest.Mock).mockResolvedValue({ settings: { riskAppetite: 12 } });
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: 'user-1' });
    (prisma.risk.create as jest.Mock).mockResolvedValue({ id: 'risk-imported' });

    const csv = [
      'title,description,taxonomy,ownerEmail,inherentLikelihood,inherentImpact,residualLikelihood,residualImpact,status,tags,keyRisk',
      'Cloud outage,RPO breach,"Operational; IT",risk.owner@example.com,4,5,2,3,Monitoring,"availability;infra",true',
      'Invalid,,Operational,,0,5,,,,,'
    ].join('\n');

    const result = await service.importRisks('tenant-1', { csv }, 'actor-1');

    expect(prisma.risk.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Cloud outage',
          taxonomy: ['Operational; IT'],
          keyRisk: true
        })
      })
    );
    expect(result.imported).toBe(1);
    expect(result.errors.length).toBe(1);
    expect(events.record).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({ type: 'risk.imported' })
    );
  });
});
