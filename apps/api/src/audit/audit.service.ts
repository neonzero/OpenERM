import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { differenceInDays } from 'date-fns';
import { createHash, randomUUID } from 'crypto';
import PDFDocument from 'pdfkit';
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
import { ListLibraryItemsDto, UpsertLibraryItemDto } from './dto/upsert-library-item.dto';
import { GenerateDraftScopeDto } from './dto/generate-draft-scope.dto';
import { ApproveTimesheetDto } from './dto/approve-timesheet.dto';
import { CreateTimesheetEntryDto, ListTimesheetsDto } from './dto/create-timesheet-entry.dto';
import { UpsertAuditProgramDto } from './dto/upsert-audit-program.dto';
import { SignWorkpaperDto } from './dto/sign-workpaper.dto';
import { UpsertReportTemplateDto } from './dto/upsert-report-template.dto';
import { DeterministicPlanningProvider } from './planning/planning.provider';

type ResourceModel = {
  capacity?: Record<string, number>;
  allocations?: Array<{ engagementId: string; role?: string | null; hours: number }>;
};

type ReportSection = { title: string; body: string };

type EngagementPlanInput = {
  title: string;
  entityRef?: string | null;
  criticality?: number | null;
  priority?: number | null;
  riskScore?: number | null;
};

@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
    private readonly planningProvider: DeterministicPlanningProvider
  ) {}

  async upsertAuditUniverse(tenantId: string, dto: UpsertAuditUniverseDto, actorId?: string | null) {
    const results: Prisma.AuditUniverse[] = [];

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

  async listLibraryItems(tenantId: string, dto: ListLibraryItemsDto) {
    const where: Prisma.LibraryItemWhereInput = {
      tenantId,
      ...(dto.type ? { type: dto.type } : {})
    };

    if (dto.search) {
      where.OR = [
        { title: { contains: dto.search, mode: 'insensitive' } },
        { description: { contains: dto.search, mode: 'insensitive' } },
        { tags: { has: dto.search } }
      ];
    }

    if (dto.tag) {
      where.tags = { has: dto.tag };
    }

    const items = await this.prisma.libraryItem.findMany({
      where,
      orderBy: { updatedAt: 'desc' }
    });

    return items.map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      description: item.description,
      tags: item.tags,
      content: item.content
    }));
  }

  async upsertLibraryItem(tenantId: string, dto: UpsertLibraryItemDto, actorId?: string | null) {
    const data: Prisma.LibraryItemUncheckedCreateInput = {
      tenantId,
      type: dto.type,
      title: dto.title,
      description: dto.description ?? null,
      content: dto.content as Prisma.JsonValue,
      tags: dto.tags ?? []
    };

    let item;

    if (dto.id) {
      const existing = await this.prisma.libraryItem.findFirst({ where: { id: dto.id, tenantId } });
      if (!existing) {
        throw new NotFoundException('Library item not found');
      }
      item = await this.prisma.libraryItem.update({
        where: { id: dto.id },
        data
      });
    } else {
      item = await this.prisma.libraryItem.create({ data });
    }

    await this.events.record(tenantId, {
      actorId: actorId ?? null,
      entity: 'library-item',
      entityId: item.id,
      type: 'audit.library.upserted',
      diff: { type: dto.type }
    });

    return item;
  }

  async createPlan(tenantId: string, dto: CreateAuditPlanDto, actorId?: string | null) {
    const enrichedEngagements = await this.enrichEngagementMetrics(tenantId, dto.engagements);

    const plan = await this.prisma.auditPlan.create({
      data: {
        tenantId,
        period: dto.period,
        status: dto.status ?? 'Draft',
        resourceModel: dto.resourceModel ?? null,
        engagements: {
          create: enrichedEngagements.map((engagement) => ({
            tenantId,
            title: engagement.title,
            scope: engagement.scope ?? null,
            objectives: engagement.objectives ?? null,
            start: engagement.start ?? null,
            end: engagement.end ?? null,
            entityRef: engagement.entityRef ?? null,
            criticality: engagement.criticality ?? null,
            priority: engagement.priority ?? null,
            riskScore: engagement.riskScore ?? null
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
    const [metrics] = await this.enrichEngagementMetrics(tenantId, [dto]);

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
        priority: metrics.priority ?? null,
        riskScore: metrics.riskScore ?? null,
        team: dto.team ?? null
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

  async generateDraftScope(
    tenantId: string,
    engagementId: string,
    dto: GenerateDraftScopeDto,
    actorId?: string | null
  ) {
    const engagement = await this.prisma.engagement.findFirst({
      where: { id: engagementId, tenantId }
    });

    if (!engagement) {
      throw new NotFoundException('Engagement not found');
    }

    const universe = engagement.entityRef
      ? await this.prisma.auditUniverse.findFirst({ where: { id: engagement.entityRef, tenantId } })
      : null;

    const riskIds = dto.riskIds ?? universe?.linkedRiskIds ?? [];
    const risks = riskIds.length
      ? await this.prisma.risk.findMany({ where: { tenantId, id: { in: riskIds } } })
      : [];

    const libraryTypes = dto.libraryTypes ?? ['control', 'process', 'policy'];
    const libraryItems = await this.prisma.libraryItem.findMany({
      where: { tenantId, type: { in: libraryTypes } },
      orderBy: { updatedAt: 'desc' }
    });

    const draft = this.planningProvider.generateDraftScope({
      engagement: {
        id: engagement.id,
        title: engagement.title,
        scope: engagement.scope ?? null
      },
      risks: risks.map((risk) => ({
        id: risk.id,
        title: risk.title,
        residualScore: risk.residualScore ?? null,
        status: risk.status
      })),
      libraryItems: libraryItems.map((item) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        description: item.description,
        content: (item.content as Record<string, unknown>) ?? {}
      }))
    });

    await this.events.record(tenantId, {
      actorId: actorId ?? null,
      entity: 'engagement',
      entityId: engagement.id,
      type: 'audit.engagement.draft_scope.generated',
      diff: { risks: riskIds.length, libraryItems: libraryItems.length }
    });

    return draft;
  }

  async upsertRacm(tenantId: string, engagementId: string, dto: UpsertRacmDto, actorId?: string | null) {
    const engagement = await this.prisma.engagement.findFirst({ where: { id: engagementId, tenantId } });
    if (!engagement) {
      throw new NotFoundException('Engagement not found');
    }

    const history = await this.prisma.rACMLine.findMany({ where: { engagementId } });
    const versionMap = new Map<string, number>();
    for (const line of history) {
      const key = this.racmKey(line.process, line.riskRef, line.controlRef);
      const current = versionMap.get(key) ?? 0;
      versionMap.set(key, Math.max(current, line.version));
    }

    const createData = dto.lines.map((line) => {
      const key = this.racmKey(line.process, line.riskRef, line.controlRef);
      const nextVersion = (versionMap.get(key) ?? 0) + 1;
      versionMap.set(key, nextVersion);
      return {
        engagementId,
        process: line.process,
        riskRef: line.riskRef,
        controlRef: line.controlRef,
        assertion: line.assertion,
        testStep: line.testStep,
        version: line.version ?? nextVersion,
        isLatest: true
      };
    });

    await this.prisma.$transaction([
      this.prisma.rACMLine.updateMany({ where: { engagementId }, data: { isLatest: false } }),
      this.prisma.rACMLine.createMany({ data: createData })
    ]);

    const lines = await this.prisma.rACMLine.findMany({
      where: { engagementId, isLatest: true },
      orderBy: { createdAt: 'desc' }
    });

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

  async signWorkpaper(tenantId: string, workpaperId: string, dto: SignWorkpaperDto, actorId?: string | null) {
    const workpaper = await this.prisma.workingPaper.findFirst({
      where: { id: workpaperId, engagement: { tenantId } }
    });

    if (!workpaper) {
      throw new NotFoundException('Workpaper not found');
    }

    const signedBy = dto.signature ?? actorId ?? workpaper.signedBy ?? null;
    const signedAt = dto.signedAt ?? new Date();

    const updated = await this.prisma.workingPaper.update({
      where: { id: workpaperId },
      data: {
        signedBy,
        signedAt
      }
    });

    await this.events.record(tenantId, {
      actorId: actorId ?? null,
      entity: 'workpaper',
      entityId: workpaperId,
      type: 'audit.workpaper.signed',
      diff: { signedBy }
    });

    return updated;
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

    const baseData: Prisma.FollowUpUpdateInput = {
      status: dto.status ?? existing?.status ?? 'Open',
      evidenceRefs: dto.evidenceRefs ?? existing?.evidenceRefs ?? [],
      verifiedBy: dto.verify?.verifiedBy ?? existing?.verifiedBy ?? null,
      verifiedAt: dto.verify?.verifiedAt ?? existing?.verifiedAt ?? null,
      actionPlan: dto.actionPlan ?? existing?.actionPlan ?? null,
      due: dto.due ?? existing?.due ?? null,
      verificationNotes: dto.verify?.notes ?? existing?.verificationNotes ?? null
    };

    let followUp;

    if (existing) {
      followUp = await this.prisma.followUp.update({
        where: { id: existing.id },
        data: baseData
      });
    } else {
      followUp = await this.prisma.followUp.create({
        data: {
          findingId,
          status: baseData.status as string,
          evidenceRefs: (baseData.evidenceRefs as string[]) ?? [],
          verifiedBy: (baseData.verifiedBy as string | null) ?? null,
          verifiedAt: (baseData.verifiedAt as Date | null) ?? null,
          actionPlan: (baseData.actionPlan as string | null) ?? null,
          due: (baseData.due as Date | null) ?? null,
          verificationNotes: (baseData.verificationNotes as string | null) ?? null
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

  async createTimesheetEntry(tenantId: string, dto: CreateTimesheetEntryDto, actorId?: string | null) {
    if (!actorId && !dto.id) {
      throw new BadRequestException('User context is required for timesheet entry');
    }

    const engagement = await this.prisma.engagement.findFirst({ where: { id: dto.engagementId, tenantId } });
    if (!engagement) {
      throw new NotFoundException('Engagement not found');
    }

    const targetDate = dto.date;

    let timesheet;

    if (dto.id) {
      const existing = await this.prisma.timesheet.findFirst({ where: { id: dto.id, tenantId } });
      if (!existing) {
        throw new NotFoundException('Timesheet entry not found');
      }
      timesheet = await this.prisma.timesheet.update({
        where: { id: dto.id },
        data: {
          date: targetDate,
          hours: dto.hours,
          activity: dto.activity ?? null,
          role: dto.role ?? existing.role ?? null,
          approvalStatus: 'Pending',
          approvedAt: null,
          approvedBy: null
        }
      });
    } else {
      timesheet = await this.prisma.timesheet.upsert({
        where: {
          tenantId_userId_engagementId_date: {
            tenantId,
            userId: actorId as string,
            engagementId: dto.engagementId,
            date: targetDate
          }
        },
        update: {
          hours: dto.hours,
          activity: dto.activity ?? null,
          role: dto.role ?? null,
          approvalStatus: 'Pending',
          approvedAt: null,
          approvedBy: null
        },
        create: {
          tenantId,
          userId: actorId as string,
          engagementId: dto.engagementId,
          date: targetDate,
          hours: dto.hours,
          activity: dto.activity ?? null,
          role: dto.role ?? null
        }
      });
    }

    await this.events.record(tenantId, {
      actorId: actorId ?? null,
      entity: 'timesheet',
      entityId: timesheet.id,
      type: 'audit.timesheet.logged',
      diff: { hours: timesheet.hours }
    });

    return timesheet;
  }

  async listTimesheets(tenantId: string, dto: ListTimesheetsDto) {
    const where: Prisma.TimesheetWhereInput = { tenantId };

    if (dto.engagementId) {
      where.engagementId = dto.engagementId;
    }

    if (dto.userId) {
      where.userId = dto.userId;
    }

    if (dto.start || dto.end) {
      where.date = {};
      if (dto.start) {
        where.date.gte = dto.start;
      }
      if (dto.end) {
        where.date.lte = dto.end;
      }
    }

    const entries = await this.prisma.timesheet.findMany({
      where,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }]
    });

    const totalHours = entries.reduce((sum, entry) => sum + entry.hours, 0);
    const byEngagement = entries.reduce<Record<string, number>>((acc, entry) => {
      acc[entry.engagementId] = (acc[entry.engagementId] ?? 0) + entry.hours;
      return acc;
    }, {});

    return {
      totalHours,
      entries: entries.map((entry) => ({
        id: entry.id,
        engagementId: entry.engagementId,
        userId: entry.userId,
        date: entry.date.toISOString(),
        hours: entry.hours,
        activity: entry.activity,
        role: entry.role,
        approvalStatus: entry.approvalStatus,
        approvedBy: entry.approvedBy,
        approvedAt: entry.approvedAt ? entry.approvedAt.toISOString() : null
      })),
      byEngagement
    };
  }

  async approveTimesheet(
    tenantId: string,
    timesheetId: string,
    dto: ApproveTimesheetDto,
    actorId?: string | null
  ) {
    if (!actorId) {
      throw new BadRequestException('Actor is required to approve timesheets');
    }

    const timesheet = await this.prisma.timesheet.findFirst({ where: { id: timesheetId, tenantId } });
    if (!timesheet) {
      throw new NotFoundException('Timesheet entry not found');
    }

    const approved = await this.prisma.timesheet.update({
      where: { id: timesheetId },
      data: {
        approvalStatus: 'Approved',
        approvedBy: actorId,
        approvedAt: dto.approvedAt ?? new Date()
      }
    });

    await this.events.record(tenantId, {
      actorId,
      entity: 'timesheet',
      entityId: timesheetId,
      type: 'audit.timesheet.approved',
      diff: { approvedBy: actorId }
    });

    return approved;
  }

  async planUtilization(tenantId: string, planId: string) {
    const plan = await this.prisma.auditPlan.findFirst({
      where: { id: planId, tenantId },
      include: { engagements: true }
    });

    if (!plan) {
      throw new NotFoundException('Audit plan not found');
    }

    const resourceModel = this.parseResourceModel(plan.resourceModel);
    const engagementIds = plan.engagements.map((engagement) => engagement.id);

    const timesheets = await this.prisma.timesheet.findMany({
      where: { tenantId, engagementId: { in: engagementIds } }
    });

    const roleSet = new Set<string>([
      ...Object.keys(resourceModel.capacity ?? {}),
      ...(resourceModel.allocations ?? []).map((allocation) => allocation.role ?? 'Unspecified'),
      ...timesheets.map((entry) => entry.role ?? 'Unspecified')
    ]);

    const roleSummaries = Array.from(roleSet).map((role) => {
      const planned = (resourceModel.allocations ?? [])
        .filter((allocation) => (allocation.role ?? 'Unspecified') === role)
        .reduce((sum, allocation) => sum + allocation.hours, 0);
      const capacity = (resourceModel.capacity ?? {})[role] ?? planned;
      const actual = timesheets
        .filter((entry) => (entry.role ?? 'Unspecified') === role)
        .reduce((sum, entry) => sum + entry.hours, 0);
      const utilization = capacity > 0 ? actual / capacity : actual > 0 ? 1 : 0;
      return {
        role,
        capacityHours: capacity,
        plannedHours: planned,
        actualHours: actual,
        variance: actual - planned,
        utilization
      };
    });

    const engagementSummaries = plan.engagements.map((engagement) => {
      const planned = (resourceModel.allocations ?? [])
        .filter((allocation) => allocation.engagementId === engagement.id)
        .reduce((sum, allocation) => sum + allocation.hours, 0);
      const actual = timesheets
        .filter((entry) => entry.engagementId === engagement.id)
        .reduce((sum, entry) => sum + entry.hours, 0);
      return {
        engagementId: engagement.id,
        title: engagement.title,
        plannedHours: planned,
        actualHours: actual,
        variance: actual - planned,
        priority: engagement.priority ?? null,
        status: engagement.status
      };
    });

    return {
      planId: plan.id,
      period: plan.period,
      roles: roleSummaries,
      engagements: engagementSummaries
    };
  }

  async upsertAuditProgram(
    tenantId: string,
    engagementId: string,
    dto: UpsertAuditProgramDto,
    actorId?: string | null
  ) {
    const engagement = await this.prisma.engagement.findFirst({ where: { id: engagementId, tenantId } });
    if (!engagement) {
      throw new NotFoundException('Engagement not found');
    }

    const latest = await this.prisma.auditProgram.findFirst({
      where: { engagementId },
      orderBy: { version: 'desc' }
    });

    const program = await this.prisma.$transaction(async (tx) => {
      if (latest) {
        await tx.auditProgram.update({
          where: { id: latest.id },
          data: { status: 'Superseded' }
        });
      }

      const created = await tx.auditProgram.create({
        data: {
          tenantId,
          engagementId,
          name: dto.name ?? latest?.name ?? 'Engagement Program',
          status: dto.status ?? 'Draft',
          metadata: dto.metadata ?? null,
          version: (latest?.version ?? 0) + 1,
          publishedAt: dto.status && dto.status !== 'Draft' ? new Date() : null,
          steps: {
            create: dto.steps.map((step, index) => ({
              order: step.order ?? index + 1,
              title: step.title,
              description: step.description ?? null,
              testProcedure: step.testProcedure,
              evidence: step.evidence ?? null,
              controlRef: step.controlRef ?? null,
              assertion: step.assertion ?? null,
              riskRef: step.riskRef ?? null
            }))
          }
        },
        include: { steps: { orderBy: { order: 'asc' } } }
      });

      return created;
    });

    await this.events.record(tenantId, {
      actorId: actorId ?? null,
      entity: 'audit-program',
      entityId: program.id,
      type: 'audit.program.upserted',
      diff: { version: program.version, steps: program.steps.length }
    });

    return program;
  }

  async getLatestProgram(tenantId: string, engagementId: string) {
    const program = await this.prisma.auditProgram.findFirst({
      where: { engagementId, tenantId },
      orderBy: { version: 'desc' },
      include: { steps: { orderBy: { order: 'asc' } } }
    });

    if (!program) {
      throw new NotFoundException('Program not found');
    }

    return program;
  }

  async upsertReportTemplate(tenantId: string, dto: UpsertReportTemplateDto, actorId?: string | null) {
    const data: Prisma.ReportTemplateUncheckedCreateInput = {
      tenantId,
      name: dto.name,
      sections: dto.sections as unknown as Prisma.JsonValue,
      placeholders: dto.placeholders
    };

    let template;
    if (dto.id) {
      const existing = await this.prisma.reportTemplate.findFirst({ where: { id: dto.id, tenantId } });
      if (!existing) {
        throw new NotFoundException('Report template not found');
      }
      template = await this.prisma.reportTemplate.update({ where: { id: dto.id }, data });
    } else {
      template = await this.prisma.reportTemplate.create({ data });
    }

    await this.events.record(tenantId, {
      actorId: actorId ?? null,
      entity: 'report-template',
      entityId: template.id,
      type: 'audit.report_template.upserted',
      diff: { name: template.name }
    });

    return template;
  }

  async listReportTemplates(tenantId: string) {
    return this.prisma.reportTemplate.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async generateReport(dto: GenerateReportDto, actorId?: string | null) {
    const template = await this.ensureReportTemplate(dto.tenantId, dto.templateKey);

    const engagement = dto.engagementId
      ? await this.prisma.engagement.findFirst({
          where: { id: dto.engagementId, tenantId: dto.tenantId },
          include: {
            findings: true,
            racmLines: { where: { isLatest: true } }
          }
        })
      : null;

    if (dto.engagementId && !engagement) {
      throw new NotFoundException('Engagement not found for report generation');
    }

    const risks = await this.prisma.risk.findMany({ where: { tenantId: dto.tenantId } });
    const plan = dto.auditPlanId
      ? await this.prisma.auditPlan.findFirst({ where: { id: dto.auditPlanId, tenantId: dto.tenantId } })
      : null;

    const options = dto.options ?? { includeFindings: true };
    const placeholders = this.buildReportPlaceholders({ engagement, plan, risks, options });
    const renderedSections = template.sections.map((section) => ({
      title: section.title,
      body: this.resolvePlaceholders(section.body, placeholders)
    }));

    const pdfBuffer = await this.renderPdf({
      title: template.name,
      sections: renderedSections
    });

    const checksum = createHash('sha256').update(pdfBuffer).digest('hex');
    const storageKey = dto.outputName ? `reports/${dto.outputName.replace(/\s+/g, '-').toLowerCase()}.pdf` : `reports/${randomUUID()}.pdf`;

    const report = await this.prisma.report.create({
      data: {
        tenantId: dto.tenantId,
        templateId: template.id,
        engagementId: dto.engagementId ?? null,
        auditPlanId: dto.auditPlanId ?? null,
        fileRef: storageKey
      }
    });

    await this.events.record(dto.tenantId, {
      actorId: actorId ?? null,
      entity: 'report',
      entityId: report.id,
      type: 'report.generated',
      diff: { template: template.name, checksum }
    });

    return {
      report,
      storageKey,
      checksum,
      pdf: pdfBuffer.toString('base64')
    };
  }

  async listEngagements(tenantId: string) {
    const engagements = await this.prisma.engagement.findMany({
      where: { tenantId },
      orderBy: { start: 'desc' },
      include: {
        findings: {
          where: { status: { not: 'Closed' } },
          select: { id: true }
        }
      }
    });

    return engagements.map((engagement) => ({
      id: engagement.id,
      title: engagement.title,
      status: engagement.status,
      startDate: engagement.start ? engagement.start.toISOString() : null,
      findingsOpen: engagement.findings.length,
      priority: engagement.priority ?? null,
      riskScore: engagement.riskScore ?? null,
      owner:
        engagement.team && typeof engagement.team === 'object' && !Array.isArray(engagement.team)
          ? ((engagement.team as Record<string, unknown>).lead as string | undefined) ?? null
          : null
    }));
  }

  async dashboard(tenantId: string) {
    const [plans, engagements, findings, timesheets, followUps, userCount, risks] = await this.prisma.$transaction([
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
      this.prisma.followUp.findMany({ where: { finding: { engagement: { tenantId } } } }),
      this.prisma.user.count({ where: { tenantId } }),
      this.prisma.risk.findMany({ where: { tenantId } })
    ]);

    const planProgress = plans.map((plan) => {
      const total = plan.engagements.length;
      const completed = plan.engagements.filter((engagement) => engagement.status === 'Closed').length;
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
    const plannedHours = plans.reduce((total, plan) => {
      const model = this.parseResourceModel(plan.resourceModel);
      return total + (model.allocations ?? []).reduce((sum, allocation) => sum + allocation.hours, 0);
    }, 0);
    const totalCapacity = Math.max(userCount * 160, bookedHours, plannedHours);
    const utilizationRate = totalCapacity > 0 ? bookedHours / totalCapacity : 0;

    const indicatorSummary = followUps.reduce<Record<string, number>>((acc, followUp) => {
      const key = followUp.status ?? 'Open';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    const followUpAging = followUps.reduce(
      (acc, followUp) => {
        if (followUp.due && followUp.status !== 'Closed') {
          const overdue = differenceInDays(now, followUp.due);
          if (overdue > 0) {
            acc.overdue += 1;
          }
        }
        acc.total += 1;
        return acc;
      },
      { overdue: 0, total: 0 }
    );

    const riskHeatmap = this.buildHeatmap(risks);
    const topRisks = [...risks]
      .sort((a, b) => (b.residualScore ?? 0) - (a.residualScore ?? 0))
      .slice(0, 5)
      .map((risk) => ({
        id: risk.id,
        title: risk.title,
        residualScore: risk.residualScore ?? null,
        appetiteBreached: risk.appetiteBreached
      }));

    const appetiteBreaches = risks.filter((risk) => risk.appetiteBreached).length;

    return {
      planProgress,
      findingsBySeverity,
      findingsAging,
      utilization: {
        totalCapacity,
        bookedHours,
        plannedHours,
        utilizationRate
      },
      indicatorSummary,
      followUpAging,
      riskHeatmap,
      topRisks,
      appetiteBreaches,
      engagements: engagements.map((engagement) => ({
        id: engagement.id,
        title: engagement.title,
        status: engagement.status,
        startDate: engagement.start ? engagement.start.toISOString() : null,
        findingsOpen: engagement.findings.filter((finding) => finding.status !== 'Closed').length,
        priority: engagement.priority ?? null
      }))
    };
  }

  private racmKey(process: string, riskRef: string, controlRef: string) {
    return `${process}::${riskRef}::${controlRef}`;
  }

  private async enrichEngagementMetrics(
    tenantId: string,
    engagements: Array<CreateEngagementDto & EngagementPlanInput>
  ) {
    const entityIds = engagements
      .map((engagement) => engagement.entityRef)
      .filter((entityId): entityId is string => Boolean(entityId));

    const [entities, risks] = await Promise.all([
      entityIds.length
        ? this.prisma.auditUniverse.findMany({ where: { tenantId, id: { in: entityIds } } })
        : Promise.resolve([]),
      this.prisma.risk.findMany({ where: { tenantId } })
    ]);

    const entityMap = new Map(entities.map((entity) => [entity.id, entity]));
    const riskMap = new Map(risks.map((risk) => [risk.id, risk]));

    return engagements.map((engagement) => {
      const entity = engagement.entityRef ? entityMap.get(engagement.entityRef) : undefined;
      const linkedRisks = entity?.linkedRiskIds ?? [];
      const riskValues = linkedRisks
        .map((riskId) => riskMap.get(riskId))
        .filter((risk): risk is typeof risks[number] => Boolean(risk))
        .map((risk) => risk.residualScore ?? risk.inherentL * risk.inherentI);

      const avgRisk =
        riskValues.length > 0
          ? riskValues.reduce((sum, score) => sum + score, 0) / riskValues.length
          : engagement.riskScore ?? (entity?.criticality ?? engagement.criticality ?? 1) * 5;

      const lastAudit = entity?.lastAudit ?? null;
      const recencyBoost = lastAudit ? Math.min(Math.max(differenceInDays(new Date(), lastAudit), 0) / 30, 12) : 6;
      const priority = engagement.priority ?? Math.max(1, Math.round(avgRisk + recencyBoost));

      return {
        ...engagement,
        priority,
        riskScore: avgRisk
      };
    });
  }

  private parseResourceModel(model: unknown): ResourceModel {
    if (!model || typeof model !== 'object') {
      return { capacity: {}, allocations: [] };
    }

    const resourceModel = model as ResourceModel;
    return {
      capacity: resourceModel.capacity ?? {},
      allocations: resourceModel.allocations ?? []
    };
  }

  private async ensureReportTemplate(tenantId: string, key: string) {
    let template = await this.prisma.reportTemplate.findFirst({ where: { tenantId, name: key } });

    if (!template) {
      const defaults: Record<string, ReportSection[]> = {
        'engagement-report': [
          {
            title: 'Engagement Overview',
            body: 'Engagement: ${engagement.title}\nScope: ${engagement.scope}\nObjectives: ${engagement.objectives}'
          },
          {
            title: 'Findings Summary',
            body: '${findings.table}'
          },
          {
            title: 'Risk Heat Map',
            body: '${summary.heatmap}'
          }
        ],
        'issues-log': [
          {
            title: 'Open Issues',
            body: '${findings.table}'
          },
          {
            title: 'Follow-up Status',
            body: 'Open follow-ups: ${followUps.total}\nOverdue: ${followUps.overdue}'
          }
        ]
      };

      const sections = defaults[key] ?? [
        {
          title: 'Summary',
          body: 'Engagement ${engagement.title} generated report.'
        }
      ];

      template = await this.prisma.reportTemplate.create({
        data: {
          tenantId,
          name: key,
          sections: sections as unknown as Prisma.JsonValue,
          placeholders: ['engagement.title', 'findings.table', 'summary.heatmap', 'followUps.total', 'followUps.overdue']
        }
      });
    }

    return template;
  }

  private buildReportPlaceholders({
    engagement,
    plan,
    risks,
    options
  }: {
    engagement: (Prisma.EngagementGetPayload<{ include: { findings: true; racmLines: true } }> | null) | null;
    plan: Prisma.AuditPlan | null;
    risks: Prisma.Risk[];
    options: GenerateReportDto['options'];
  }) {
    const findingsTable = engagement && options.includeFindings !== false
      ? this.buildFindingsTable(engagement.findings)
      : 'No findings included in this report.';

    const heatmap = this.buildHeatmap(risks);

    return {
      'engagement.title': engagement?.title ?? 'N/A',
      'engagement.scope': engagement?.scope ?? 'N/A',
      'engagement.objectives': engagement?.objectives ?? 'N/A',
      'plan.period': plan?.period ?? 'N/A',
      'findings.table': findingsTable,
      'summary.heatmap': heatmap,
      'summary.override': options.summaryOverride ?? null,
      'followUps.total': engagement?.findings.length ?? 0,
      'followUps.overdue': engagement
        ? engagement.findings.filter((finding) => finding.due && finding.due < new Date() && finding.status !== 'Closed').length
        : 0
    };
  }

  private resolvePlaceholders(template: string, placeholders: Record<string, unknown>) {
    return template.replace(/\$\{([^}]+)\}/g, (_, key: string) => {
      const value = placeholders[key];
      if (value === null || value === undefined) {
        return 'N/A';
      }
      if (typeof value === 'object') {
        return JSON.stringify(value, null, 2);
      }
      return String(value);
    });
  }

  private async renderPdf({ title, sections }: { title: string; sections: ReportSection[] }) {
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('error', (error) => reject(error));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      doc.fontSize(18).text(title, { underline: true });
      doc.moveDown();

      sections.forEach((section) => {
        doc.fontSize(14).text(section.title, { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11).text(section.body);
        doc.moveDown();
      });

      doc.end();
    });
  }

  private buildFindingsTable(findings: Prisma.Finding[]) {
    if (findings.length === 0) {
      return 'No open findings.';
    }

    const header = 'Severity | Condition | Owner | Due | Status';
    const separator = '---|---|---|---|---';
    const rows = findings.map((finding) => {
      const due = finding.due ? finding.due.toISOString().split('T')[0] : 'N/A';
      return `${finding.severity} | ${finding.condition} | ${finding.ownerId ?? 'N/A'} | ${due} | ${finding.status}`;
    });

    return [header, separator, ...rows].join('\n');
  }

  private buildHeatmap(risks: Prisma.Risk[]) {
    const grid = Array.from({ length: 5 }, () => Array(5).fill(0));

    risks.forEach((risk) => {
      const likelihood = Math.min(Math.max(risk.residualL ?? risk.inherentL ?? 1, 1), 5);
      const impact = Math.min(Math.max(risk.residualI ?? risk.inherentI ?? 1, 1), 5);
      grid[5 - impact][likelihood - 1] += 1;
    });

    const header = ['Impact\\Likelihood', '1', '2', '3', '4', '5'];
    const rows = grid.map((row, index) => {
      return `${5 - index} | ${row.join(' | ')}`;
    });

    return [header.join(' | '), '---|---|---|---|---|---', ...rows].join('\n');
  }
}
