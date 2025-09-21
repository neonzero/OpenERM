import { describe, expect, it, jest } from '@jest/globals';
import { AuditService } from '../src/audit/audit.service';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { EventsService } from '../src/events/events.service';
import { AuditPlanItemStatus, FindingRating, IndicatorStatus, ReportTemplateType, TimesheetStatus } from '@prisma/client';

const createService = () => {
  const prisma = {
    auditPlan: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn()
    },
    auditPlanItem: {
      create: jest.fn()
    },
    auditEngagement: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn()
    },
    auditFinding: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn()
    },
    auditTrailEvent: {
      create: jest.fn()
    },
    timesheetEntry: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn()
    },
    resourceCapacity: {
      findMany: jest.fn()
    },
    riskIndicator: {
      findMany: jest.fn()
    },
    recommendation: {
      create: jest.fn()
    },
    racmEntry: {
      create: jest.fn()
    },
    auditProgram: {
      create: jest.fn()
    },
    findingFollowUp: {
      create: jest.fn()
    },
    reportTemplate: {
      findFirst: jest.fn()
    },
    generatedReport: {
      create: jest.fn()
    },
    risk: {
      findMany: jest.fn()
    },
    $transaction: jest.fn()
  } as unknown as PrismaService;

  const events = {
    emit: jest.fn()
  } as unknown as EventsService;

  const service = new AuditService(prisma, events);

  return { service, prisma, events };
};

describe('AuditService', () => {
  it('summarizes dashboard metrics', async () => {
    const { service, prisma } = createService();

    (prisma.$transaction as jest.Mock).mockResolvedValue([
      [
        {
          id: 'plan-1',
          period: 'FY24',
          status: 'IN_PROGRESS',
          items: [
            { status: AuditPlanItemStatus.COMPLETE },
            { status: AuditPlanItemStatus.IN_PROGRESS }
          ]
        }
      ],
      [
        {
          id: 'eng-1',
          name: 'ITGC',
          status: 'FIELDWORK',
          startDate: new Date(),
          findings: [{ status: 'OPEN' }]
        }
      ],
      [
        { rating: FindingRating.HIGH, createdAt: new Date(Date.now() - 10 * 86400000) }
      ],
      [
        { hours: 32 }
      ],
      [
        { hoursAvailable: 160 }
      ],
      [
        { status: IndicatorStatus.ON_TRACK },
        { status: IndicatorStatus.WARNING }
      ]
    ]);

    const result = await service.dashboard('tenant-1');

    expect(result.planProgress[0]).toEqual(
      expect.objectContaining({
        completed: 1,
        total: 2
      })
    );
    expect(result.utilization.bookedHours).toBe(32);
    expect(result.indicatorSummary[IndicatorStatus.WARNING]).toBe(1);
  });

  it('records timesheets in submitted status', async () => {
    const { service, prisma, events } = createService();

    (prisma.auditEngagement.findFirst as jest.Mock).mockResolvedValue({ id: 'eng-1' });
    (prisma.timesheetEntry.create as jest.Mock).mockResolvedValue({
      id: 'ts-1',
      status: TimesheetStatus.SUBMITTED,
      engagementId: 'eng-1'
    });

    const entry = await service.recordTimesheet(
      'tenant-1',
      'user-1',
      { engagementId: 'eng-1', entryDate: new Date().toISOString(), hours: 4 },
      'actor-1'
    );

    expect(entry.status).toBe(TimesheetStatus.SUBMITTED);
    expect(events.emit).toHaveBeenCalledWith(
      'audit.timesheetRecorded',
      expect.objectContaining({ timesheetId: 'ts-1' })
    );
  });

  it('generates PDF report from template', async () => {
    const { service, prisma } = createService();

    (prisma.reportTemplate.findFirst as jest.Mock).mockResolvedValue({
      id: 'tmpl-1',
      tenantId: 'tenant-1',
      name: 'Risk Register Summary',
      type: ReportTemplateType.RISK_REGISTER
    });
    (prisma.risk.findMany as jest.Mock).mockResolvedValue([
      {
        referenceId: 'R-1',
        title: 'Risk One',
        category: { name: 'Operational' },
        residualScore: 8,
        inherentScore: 12,
        owner: { displayName: 'Owner' }
      }
    ]);
    (prisma.generatedReport.create as jest.Mock).mockResolvedValue({ id: 'report-1' });

    const report = await service.generateReport(
      'tenant-1',
      { templateId: 'tmpl-1', context: { type: 'RISK_REGISTER' } },
      'actor-1'
    );

    expect(report.reportId).toBe('report-1');
    expect(report.contentType).toBe('application/pdf');
    expect(report.data).toEqual(expect.any(String));
  });
});
