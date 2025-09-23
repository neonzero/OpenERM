import { Injectable, NotFoundException } from '@nestjs/common';
import { differenceInDays } from 'date-fns';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { CreateAuditPlanDto } from './dto/create-audit-plan.dto';
import { CreateEngagementDto } from './dto/create-engagement.dto';
import { UpsertAuditUniverseDto } from './dto/upsert-audit-universe.dto';
import { UpsertRacmDto } from './dto/upsert-racm.dto';
import { CreateWorkpaperDto } from './dto/create-workpaper.dto';
import { CreateFindingDto } from './dto/create-finding.dto';
import { CreateFollowUpDto } from './dto/create-follow-up.dto';
import { GenerateReportDto } from './dto/generate-report.dto';


@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService, private readonly events: EventsService) {}

  async upsertAuditUniverse(tenantId: string, dto: UpsertAuditUniverseDto, actorId?: string | null) {
    const results = [];

    for (const entity of dto.entities) {
      if (entity.id) {
        const existing = await this.prisma.auditUniverse.findFirst({
          where: { id: entity.id, tenantId }
        });
        if (!existing) {
          throw new NotFoundException('Audit universe entity not found');
        }
        const updated = await this.prisma.auditUniverse.update({
          where: { id: entity.id },
          data: {
            name: entity.name,
            description: entity.description ?? null,
            criticality: entity.criticality,
            lastAudit: entity.lastAudit ?? null,
            nextDue: entity.nextDue ?? null,
            linkedRiskIds: entity.linkedRiskIds ?? []
          }
        });
        results.push(updated);
      } else {
        const created = await this.prisma.auditUniverse.create({
          data: {
            tenantId,
            name: entity.name,
            description: entity.description ?? null,
            criticality: entity.criticality,
            lastAudit: entity.lastAudit ?? null,
            nextDue: entity.nextDue ?? null,
            linkedRiskIds: entity.linkedRiskIds ?? []
          }
        });
        results.push(created);
      }
    }

    await this.events.record(tenantId, {
      actorId: actorId ?? null,
      entity: 'audit-universe',
      entityId: results[0]?.id ?? 'batch',
      type: 'audit.universe.upserted',
      diff: { count: results.length }
    });

    return results;
  }

  async createPlan(tenantId: string, dto: CreateAuditPlanDto, actorId?: string | null) {
    const plan = await this.prisma.auditPlan.create({
      data: {
        tenantId,
        period: dto.period,
        status: dto.status ?? 'Draft',
        resourceModel: (dto.resourceModel as Prisma.InputJsonValue) ?? null,
        engagements: {
          create: dto.engagements.map((engagement) => ({
            tenantId,
            title: engagement.title,
            scope: engagement.scope ?? null,
            objectives: engagement.objectives ?? null,
            start: engagement.start ?? null,
            end: engagement.end ?? null,
            entityRef: engagement.entityRef ?? null,
            criticality: engagement.criticality ?? null
          }))
        }
      },
      include: { engagements: true }
    });

    await this.events.record(tenantId, {
      actorId: actorId ?? null,
      entity: 'audit-plan',
      entityId: plan.id,
      type: 'audit.plan.created',
      diff: { period: dto.period, engagements: plan.engagements.length }
    });

    return plan;
  }

  async createEngagement(tenantId: string, dto: CreateEngagementDto, actorId?: string | null) {
    const engagement = await this.prisma.engagement.create({
      data: {
        tenantId,
        auditPlanId: dto.auditPlanId ?? null,
        title: dto.title,
        scope: dto.scope ?? null,
        objectives: dto.objectives ?? null,
        status: dto.status ?? 'Planned',
        start: dto.start ?? null,
        end: dto.end ?? null,
        entityRef: dto.entityRef ?? null,
        criticality: dto.criticality ?? null,
        team: (dto.team as Prisma.InputJsonValue) ?? null
      }
    });

    await this.events.record(tenantId, {
      actorId: actorId ?? null,
      entity: 'engagement',
      entityId: engagement.id,
      type: 'audit.engagement.created',
      diff: { title: dto.title }
    });


    return engagement;
  }

  async upsertRacm(tenantId: string, engagementId: string, dto: UpsertRacmDto, actorId?: string | null) {
    const engagement = await this.prisma.engagement.findFirst({ where: { id: engagementId, tenantId } });

    if (!engagement) {
      throw new NotFoundException('Engagement not found');
    }

    await this.prisma.rACMLine.deleteMany({ where: { engagementId } });
    await this.prisma.rACMLine.createMany({
      data: dto.lines.map((line) => ({
        engagementId,
        process: line.process,
        riskRef: line.riskRef,
        controlRef: line.controlRef,
        assertion: line.assertion,
        testStep: line.testStep,
        version: line.version ?? 1
      }))
    });

    const lines = await this.prisma.rACMLine.findMany({ where: { engagementId } });

    await this.events.record(tenantId, {
      actorId: actorId ?? null,
      entity: 'racm',
      entityId: engagementId,
      type: 'audit.racm.updated',
      diff: { lines: lines.length }
    });

    return lines;
  }

  async addWorkpaper(
    tenantId: string,
    engagementId: string,
    dto: CreateWorkpaperDto,
    actorId?: string | null
  ) {
    const engagement = await this.prisma.engagement.findFirst({ where: { id: engagementId, tenantId } });

    if (!engagement) {
      throw new NotFoundException('Engagement not found');
    }

    const workpaper = await this.prisma.workingPaper.create({
      data: {
        engagementId,
        kind: dto.kind,
        storageKey: dto.storageKey,
        checksum: dto.checksum,
        uploadedBy: actorId ?? null,
        signedBy: dto.signedBy ?? null,
        signedAt: dto.signedAt ?? null,
        tags: dto.tags ?? []
      }
    });

    await this.events.record(tenantId, {
      actorId: actorId ?? null,
      entity: 'workpaper',
      entityId: workpaper.id,
      type: 'audit.workpaper.uploaded',
      diff: { engagementId }

    });

    return workpaper;
  }

  async createFinding(
    tenantId: string,
    engagementId: string,
    dto: CreateFindingDto,
    actorId?: string | null
  ) {
    const engagement = await this.prisma.engagement.findFirst({ where: { id: engagementId, tenantId } });

    if (!engagement) {
      throw new NotFoundException('Engagement not found');
    }

    const finding = await this.prisma.finding.create({
      data: {
        engagementId,
        severity: dto.severity,
        condition: dto.condition,
        cause: dto.cause,
        effect: dto.effect,
        recommendation: dto.recommendation,
        ownerId: dto.ownerId ?? null,
        due: dto.due ?? null,
        status: dto.status ?? 'Open'
      }
    });

    await this.events.record(tenantId, {
      actorId: actorId ?? null,
      entity: 'finding',
      entityId: finding.id,
      type: 'audit.finding.created',
      diff: { severity: dto.severity }

    });

    return finding;
  }

  async recordFollowUp(
    tenantId: string,
    findingId: string,
    dto: CreateFollowUpDto,
    actorId?: string | null
  ) {
    const finding = await this.prisma.finding.findFirst({
      where: { id: findingId, engagement: { tenantId } },
      include: { followUps: true }

    });

    if (!finding) {
      throw new NotFoundException('Finding not found');
    }

    const existing = finding.followUps[0];

    const data: Prisma.FollowUpUpdateInput = {
      status: dto.status ?? existing?.status ?? 'Open',
      evidenceRefs: dto.evidenceRefs ?? existing?.evidenceRefs ?? [],
      verifiedAt: dto.verify?.verifiedAt ?? existing?.verifiedAt ?? null
    };

    let followUp;

    if (existing) {
      followUp = await this.prisma.followUp.update({
        where: { id: existing.id },
        data
      });
    } else {
      followUp = await this.prisma.followUp.create({
        data: {
          findingId,
          status: data.status as string,
          evidenceRefs: (data.evidenceRefs as string[]) ?? [],
          verifiedAt: (data.verifiedAt as Date | null) ?? null
        }
      });
    }

    await this.events.record(tenantId, {
      actorId: actorId ?? null,
      entity: 'follow-up',
      entityId: followUp.id,
      type: 'audit.followup.recorded',
      diff: { status: followUp.status }
    });

    return followUp;
  }

  async generateReport(dto: GenerateReportDto, actorId?: string | null) {
    const report = await this.prisma.report.create({
      data: {
        tenantId: dto.tenantId,
        templateId: dto.templateId ?? null,
        engagementId: dto.engagementId ?? null,
        auditPlanId: dto.auditPlanId ?? null,
        fileRef: dto.fileRef
      }
    });

    await this.events.record(dto.tenantId, {
      actorId: actorId ?? null,
      entity: 'report',
      entityId: report.id,
      type: 'report.generated',
      diff: { fileRef: dto.fileRef }
    });

    return report;
  }

  async listEngagements(tenantId: string) {
    type EngagementWithFindings = Prisma.EngagementGetPayload<{
      include: { findings: { select: { id: true } } };
    }>;

    const engagements = (await this.prisma.engagement.findMany({
      where: { tenantId },
      orderBy: { start: 'desc' },
      include: {
        findings: {
          where: { status: { not: 'Closed' } },
          select: { id: true }
        }
      }
    })) as EngagementWithFindings[];

    return engagements.map((engagement) => ({
      id: engagement.id,
      title: engagement.title,
      status: engagement.status,
      startDate: engagement.start ? engagement.start.toISOString() : null,
      findingsOpen: engagement.findings.length,
      owner:
        engagement.team && typeof engagement.team === 'object' && !Array.isArray(engagement.team)
          ? ((engagement.team as Record<string, unknown>).lead as string | undefined) ?? null
          : null
    }));
  }

  async dashboard(tenantId: string) {
    type PlanWithEngagements = Prisma.AuditPlanGetPayload<{ include: { engagements: true } }>;
    type EngagementWithFindings = Prisma.EngagementGetPayload<{ include: { findings: true } }>;
    type FindingRecord = Prisma.FindingGetPayload<{}>;
    type TimesheetRecord = Prisma.TimesheetGetPayload<{}>;
    type FollowUpRecord = Prisma.FollowUpGetPayload<{}>;

    const transactionResults = await this.prisma.$transaction([
      this.prisma.auditPlan.findMany({
        where: { tenantId },
        include: { engagements: true }
      }),
      this.prisma.engagement.findMany({
        where: { tenantId },
        include: { findings: true }
      }),
      this.prisma.finding.findMany({
        where: { engagement: { tenantId }, status: { not: 'Closed' } }
      }),
      this.prisma.timesheet.findMany({ where: { tenantId } }),
      this.prisma.followUp.findMany({ where: { finding: { engagement: { tenant: { id: tenantId } } } } }),
      this.prisma.user.count({ where: { tenantId } })
    ]);

    const [plans, engagements, findings, timesheets, followUps, userCount] = transactionResults as [
      PlanWithEngagements[],
      EngagementWithFindings[],
      FindingRecord[],
      TimesheetRecord[],
      FollowUpRecord[],
      number
    ];

    const planProgress = plans.map((plan) => {
      const total = plan.engagements.length;
      const completed = plan.engagements.filter(
        (engagement: PlanWithEngagements['engagements'][number]) => engagement.status === 'Closed'
      ).length;
      return {
        planId: plan.id,
        period: plan.period,
        status: plan.status,
        completed,
        total
      };
    });

    const findingsBySeverity = findings.reduce<Record<string, number>>((acc, finding) => {
      acc[finding.severity] = (acc[finding.severity] ?? 0) + 1;
      return acc;
    }, {});

    const now = new Date();
    const findingsAging = findings.reduce(
      (acc, finding) => {
        const age = differenceInDays(now, finding.updatedAt ?? finding.createdAt);
        if (age <= 30) acc['0-30'] += 1;
        else if (age <= 60) acc['31-60'] += 1;
        else acc['60+'] += 1;
        return acc;
      },
      { '0-30': 0, '31-60': 0, '60+': 0 }
    );

    const bookedHours = timesheets.reduce((sum, entry) => sum + entry.hours, 0);
    const totalCapacity = Math.max(userCount * 160, bookedHours);
    const utilizationRate = totalCapacity > 0 ? bookedHours / totalCapacity : 0;

    const indicatorSummary = followUps.reduce<Record<string, number>>((acc, followUp) => {
      const key = followUp.status ?? 'Open';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    return {
      planProgress,
      findingsBySeverity,
      findingsAging,
      utilization: {
        totalCapacity,
        bookedHours,
        utilizationRate
      },
      engagements: engagements.map((engagement) => ({
        id: engagement.id,
        title: engagement.title,
        status: engagement.status,
        startDate: engagement.start ? engagement.start.toISOString() : null,
        findingsOpen: engagement.findings.filter((finding: EngagementWithFindings['findings'][number]) => finding.status !== 'Closed').length
      })),
      indicatorSummary
    };

  }
}
