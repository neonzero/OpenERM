import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import {
  AuditPlanItemStatus,
  AuditPlanStatus,
  AuditTrailScope,
  FindingRating,
  FindingStatus,
  FollowUpStatus,
  IndicatorStatus,
  ReportTemplateType,
  TimesheetStatus
} from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CreateEngagementDto } from './dto/create-engagement.dto';
import { UpdateEngagementStatusDto } from './dto/update-engagement-status.dto';
import { CreateWorkpaperDto } from './dto/create-workpaper.dto';
import { CreateFindingDto } from './dto/create-finding.dto';
import { CreateRecommendationDto } from './dto/create-recommendation.dto';
import { CreateAuditPlanDto } from './dto/create-audit-plan.dto';
import { AddPlanItemDto } from './dto/add-plan-item.dto';
import { RecordTimesheetDto } from './dto/record-timesheet.dto';
import { UpdateTimesheetStatusDto } from './dto/update-timesheet-status.dto';
import { CreateRacmEntryDto } from './dto/create-racm-entry.dto';
import { CreateProgramDto } from './dto/create-program.dto';
import { CreateFollowUpDto } from './dto/create-follow-up.dto';
import { GenerateReportDto } from './dto/generate-report.dto';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService, private readonly events: EventsService) {}

  async listEngagements(tenantId: string, pagination: PaginationDto) {
    const { page, pageSize } = pagination;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditEngagement.findMany({
        where: { tenantId },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          owner: true,
          risk: true,
          findings: true,
          workpapers: true
        },
        orderBy: { updatedAt: 'desc' }
      }),
      this.prisma.auditEngagement.count({ where: { tenantId } })
    ]);

    return { items, page, pageSize, total };
  }

  async dashboard(tenantId: string) {
    const [plans, engagements, findings, timesheets, capacities, indicators] = await this.prisma.$transaction([
      this.prisma.auditPlan.findMany({ where: { tenantId }, include: { items: true } }),
      this.prisma.auditEngagement.findMany({
        where: { tenantId },
        include: { findings: true },
        orderBy: { startDate: 'desc' },
        take: 10
      }),
      this.prisma.auditFinding.findMany({ where: { tenantId } }),
      this.prisma.timesheetEntry.findMany({ where: { tenantId } }),
      this.prisma.resourceCapacity.findMany({ where: { tenantId } }),
      this.prisma.riskIndicator.findMany({ where: { tenantId } })
    ]);

    const planProgress = plans.map((plan) => {
      const completed = plan.items.filter((item) => item.status === AuditPlanItemStatus.COMPLETE).length;
      return {
        planId: plan.id,
        period: plan.period,
        status: plan.status,
        completed,
        total: plan.items.length
      };
    });

    const findingsBySeverity = findings.reduce(
      (acc, finding) => {
        acc[finding.rating] = (acc[finding.rating] ?? 0) + 1;
        return acc;
      },
      {} as Record<FindingRating, number>
    );

    const now = Date.now();
    const findingsAging = findings.reduce(
      (acc, finding) => {
        const ageDays = Math.floor((now - finding.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        if (ageDays <= 30) {
          acc['0-30'] += 1;
        } else if (ageDays <= 60) {
          acc['31-60'] += 1;
        } else {
          acc['60+'] += 1;
        }
        return acc;
      },
      { '0-30': 0, '31-60': 0, '60+': 0 }
    );

    const totalCapacity = capacities.reduce((sum, capacity) => sum + capacity.hoursAvailable, 0);
    const bookedHours = timesheets.reduce((sum, entry) => sum + entry.hours, 0);

    const utilization = {
      totalCapacity,
      bookedHours,
      utilizationRate: totalCapacity === 0 ? 0 : Math.min(1, bookedHours / totalCapacity)
    };

    const engagementSummaries = engagements.map((engagement) => ({
      id: engagement.id,
      name: engagement.name,
      status: engagement.status,
      findingsOpen: engagement.findings.filter((finding) => finding.status !== FindingStatus.CLOSED).length,
      startDate: engagement.startDate
    }));

    const indicatorSummary = indicators.reduce(
      (acc, indicator) => {
        acc[indicator.status] = (acc[indicator.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<IndicatorStatus, number>
    );

    return {
      planProgress,
      findingsBySeverity,
      findingsAging,
      utilization,
      engagements: engagementSummaries,
      indicatorSummary
    };
  }

  async createEngagement(tenantId: string, dto: CreateEngagementDto, actorId: string) {
    const engagement = await this.prisma.auditEngagement.create({
      data: {
        tenantId,
        ...dto
      }
    });

    await this.prisma.auditTrailEvent.create({
      data: {
        tenantId,
        actorId,
        scope: AuditTrailScope.ENGAGEMENT,
        entityId: engagement.id,
        entityType: 'engagement',
        action: 'audit.engagementCreated',
        metadata: { dto }
      }
    });

    this.events.emit('audit.engagementCreated', { tenantId, engagementId: engagement.id });

    return engagement;
  }

  async updateEngagementStatus(
    tenantId: string,
    engagementId: string,
    dto: UpdateEngagementStatusDto,
    actorId: string
  ) {
    const engagement = await this.prisma.auditEngagement.findFirst({
      where: { id: engagementId, tenantId }
    });

    if (!engagement) {
      throw new NotFoundException('Engagement not found');
    }

    const updated = await this.prisma.auditEngagement.update({
      where: { id: engagementId },
      data: {
        status: dto.status,
        endDate: dto.endDate ?? engagement.endDate
      }
    });

    await this.prisma.auditTrailEvent.create({
      data: {
        tenantId,
        actorId,
        scope: AuditTrailScope.ENGAGEMENT,
        entityId: engagementId,
        entityType: 'engagement',
        action: 'audit.statusChanged',
        metadata: { from: engagement.status, to: dto.status }
      }
    });

    this.events.emit('audit.statusChanged', {
      tenantId,
      engagementId: updated.id,
      status: updated.status
    });

    return updated;
  }

  async createWorkpaper(
    tenantId: string,
    engagementId: string,
    dto: CreateWorkpaperDto,
    actorId: string
  ) {
    const engagement = await this.prisma.auditEngagement.findFirst({
      where: { id: engagementId, tenantId }
    });

    if (!engagement) {
      throw new NotFoundException('Engagement not found');
    }

    const workpaper = await this.prisma.auditWorkpaper.create({
      data: {
        tenantId,
        engagementId,
        ...dto
      }
    });

    await this.prisma.auditTrailEvent.create({
      data: {
        tenantId,
        actorId,
        scope: AuditTrailScope.WORKPAPER,
        entityId: workpaper.id,
        entityType: 'workpaper',
        action: 'audit.workpaperCreated',
        metadata: { dto }
      }
    });

    this.events.emit('audit.workpaperCreated', {
      tenantId,
      engagementId,
      workpaperId: workpaper.id
    });

    return workpaper;
  }

  async createFinding(
    tenantId: string,
    engagementId: string,
    dto: CreateFindingDto,
    actorId: string
  ) {
    const engagement = await this.prisma.auditEngagement.findFirst({
      where: { id: engagementId, tenantId }
    });

    if (!engagement) {
      throw new NotFoundException('Engagement not found');
    }

    const finding = await this.prisma.auditFinding.create({
      data: {
        tenantId,
        engagementId,
        ...dto,
        status: FindingStatus.OPEN
      }
    });

    await this.prisma.auditTrailEvent.create({
      data: {
        tenantId,
        actorId,
        scope: AuditTrailScope.FINDING,
        entityId: finding.id,
        entityType: 'finding',
        action: 'audit.findingCreated',
        metadata: { dto }
      }
    });

    this.events.emit('audit.findingCreated', {
      tenantId,
      engagementId,
      findingId: finding.id
    });

    return finding;
  }

  async createRecommendation(
    tenantId: string,
    findingId: string,
    dto: CreateRecommendationDto,
    actorId: string
  ) {
    const finding = await this.prisma.auditFinding.findFirst({
      where: { id: findingId, tenantId }
    });

    if (!finding) {
      throw new NotFoundException('Finding not found');
    }

    const recommendation = await this.prisma.recommendation.create({
      data: {
        findingId,
        ...dto
      }
    });

    await this.prisma.auditTrailEvent.create({
      data: {
        tenantId,
        actorId,
        scope: AuditTrailScope.ACTION_PLAN,
        entityId: recommendation.id,
        entityType: 'recommendation',
        action: 'audit.recommendationCreated',
        metadata: { dto }
      }
    });

    this.events.emit('audit.recommendationCreated', {
      tenantId,
      findingId,
      recommendationId: recommendation.id
    });

    return recommendation;
  }

  async createAuditPlan(tenantId: string, dto: CreateAuditPlanDto, actorId: string) {
    const plan = await this.prisma.auditPlan.create({
      data: {
        tenantId,
        period: dto.period,
        status: dto.status ?? AuditPlanStatus.DRAFT,
        items: dto.items
          ? {
              create: dto.items.map((item) => ({
                engagementId: item.engagementId,
                auditableEntityId: item.auditableEntityId,
                priority: item.priority,
                status: AuditPlanItemStatus.PLANNED,
                plannedStart: item.plannedStart ? new Date(item.plannedStart) : undefined,
                plannedEnd: item.plannedEnd ? new Date(item.plannedEnd) : undefined
              }))
            }
          : undefined,
        capacities: dto.capacities
          ? {
              create: dto.capacities.map((capacity) => ({
                tenantId,
                role: capacity.role,
                hoursAvailable: capacity.hoursAvailable,
                utilization: capacity.utilization
              }))
            }
          : undefined
      },
      include: { items: true, capacities: true }
    });

    await this.prisma.auditTrailEvent.create({
      data: {
        tenantId,
        actorId,
        scope: AuditTrailScope.ENGAGEMENT,
        entityId: plan.id,
        entityType: 'auditPlan',
        action: 'audit.planCreated',
        metadata: { period: dto.period }
      }
    });

    this.events.emit('audit.planCreated', { tenantId, planId: plan.id });

    return plan;
  }

  async addPlanItem(tenantId: string, planId: string, dto: AddPlanItemDto, actorId: string) {
    const plan = await this.prisma.auditPlan.findFirst({ where: { id: planId, tenantId } });
    if (!plan) {
      throw new NotFoundException('Audit plan not found');
    }

    const item = await this.prisma.auditPlanItem.create({
      data: {
        planId,
        engagementId: dto.engagementId,
        auditableEntityId: dto.auditableEntityId,
        priority: dto.priority,
        status: dto.status ?? AuditPlanItemStatus.PLANNED,
        plannedStart: dto.plannedStart ? new Date(dto.plannedStart) : undefined,
        plannedEnd: dto.plannedEnd ? new Date(dto.plannedEnd) : undefined
      }
    });

    await this.prisma.auditTrailEvent.create({
      data: {
        tenantId,
        actorId,
        scope: AuditTrailScope.ENGAGEMENT,
        entityId: planId,
        entityType: 'auditPlan',
        action: 'audit.planItemAdded',
        metadata: { planItemId: item.id }
      }
    });

    this.events.emit('audit.planItemAdded', { tenantId, planId, planItemId: item.id });

    return item;
  }

  async recordTimesheet(tenantId: string, userId: string, dto: RecordTimesheetDto, actorId: string) {
    const engagement = await this.prisma.auditEngagement.findFirst({
      where: { id: dto.engagementId, tenantId }
    });

    if (!engagement) {
      throw new NotFoundException('Engagement not found');
    }

    const entry = await this.prisma.timesheetEntry.create({
      data: {
        tenantId,
        userId,
        engagementId: dto.engagementId,
        entryDate: new Date(dto.entryDate),
        hours: dto.hours,
        activity: dto.activity,
        status: TimesheetStatus.SUBMITTED
      }
    });

    await this.prisma.auditTrailEvent.create({
      data: {
        tenantId,
        actorId,
        scope: AuditTrailScope.ENGAGEMENT,
        entityId: dto.engagementId,
        entityType: 'timesheet',
        action: 'audit.timesheetRecorded',
        metadata: { timesheetId: entry.id }
      }
    });

    this.events.emit('audit.timesheetRecorded', {
      tenantId,
      engagementId: dto.engagementId,
      timesheetId: entry.id
    });

    return entry;
  }

  async updateTimesheetStatus(
    tenantId: string,
    timesheetId: string,
    dto: UpdateTimesheetStatusDto,
    actorId: string
  ) {
    const entry = await this.prisma.timesheetEntry.findFirst({ where: { id: timesheetId, tenantId } });
    if (!entry) {
      throw new NotFoundException('Timesheet not found');
    }

    if (dto.status === TimesheetStatus.APPROVED && entry.status !== TimesheetStatus.SUBMITTED) {
      throw new BadRequestException('Only submitted entries can be approved');
    }

    const updated = await this.prisma.timesheetEntry.update({
      where: { id: timesheetId },
      data: {
        status: dto.status,
        approvedAt: dto.status === TimesheetStatus.APPROVED ? new Date() : null,
        approverId: actorId
      }
    });

    await this.prisma.auditTrailEvent.create({
      data: {
        tenantId,
        actorId,
        scope: AuditTrailScope.ENGAGEMENT,
        entityId: timesheetId,
        entityType: 'timesheet',
        action: 'audit.timesheetStatusChanged',
        metadata: { from: entry.status, to: dto.status }
      }
    });

    this.events.emit('audit.timesheetStatusChanged', {
      tenantId,
      engagementId: entry.engagementId,
      timesheetId,
      status: dto.status
    });

    return updated;
  }

  async createRacmEntry(
    tenantId: string,
    engagementId: string,
    dto: CreateRacmEntryDto,
    actorId: string
  ) {
    const engagement = await this.prisma.auditEngagement.findFirst({ where: { id: engagementId, tenantId } });
    if (!engagement) {
      throw new NotFoundException('Engagement not found');
    }

    const entry = await this.prisma.racmEntry.create({
      data: {
        tenantId,
        engagementId,
        process: dto.process,
        riskId: dto.riskId,
        controlId: dto.controlId,
        assertion: dto.assertion,
        testStepId: dto.testStepId
      }
    });

    await this.prisma.auditTrailEvent.create({
      data: {
        tenantId,
        actorId,
        scope: AuditTrailScope.ENGAGEMENT,
        entityId: engagementId,
        entityType: 'racm',
        action: 'audit.racmEntryCreated',
        metadata: { racmEntryId: entry.id }
      }
    });

    this.events.emit('audit.racmEntryCreated', {
      tenantId,
      engagementId,
      racmEntryId: entry.id
    });

    return entry;
  }

  async createProgram(
    tenantId: string,
    engagementId: string,
    dto: CreateProgramDto,
    actorId: string
  ) {
    const engagement = await this.prisma.auditEngagement.findFirst({ where: { id: engagementId, tenantId } });
    if (!engagement) {
      throw new NotFoundException('Engagement not found');
    }

    const program = await this.prisma.auditProgram.create({
      data: {
        tenantId,
        engagementId,
        name: dto.name,
        steps: {
          create: dto.steps.map((step, index) => ({
            title: step.title,
            description: step.description,
            procedure: step.procedure,
            evidence: step.evidence,
            sortOrder: step.sortOrder ?? index + 1
          }))
        }
      },
      include: { steps: true }
    });

    await this.prisma.auditTrailEvent.create({
      data: {
        tenantId,
        actorId,
        scope: AuditTrailScope.ENGAGEMENT,
        entityId: engagementId,
        entityType: 'auditProgram',
        action: 'audit.programCreated',
        metadata: { programId: program.id }
      }
    });

    this.events.emit('audit.programCreated', {
      tenantId,
      engagementId,
      programId: program.id
    });

    return program;
  }

  async createFollowUp(tenantId: string, dto: CreateFollowUpDto, actorId: string) {
    const finding = await this.prisma.auditFinding.findFirst({ where: { id: dto.findingId, tenantId } });
    if (!finding) {
      throw new NotFoundException('Finding not found');
    }

    const followUp = await this.prisma.findingFollowUp.create({
      data: {
        tenantId,
        findingId: dto.findingId,
        evidenceRefs: dto.evidenceRefs ?? [],
        status: dto.status ?? FollowUpStatus.OPEN
      }
    });

    await this.prisma.auditTrailEvent.create({
      data: {
        tenantId,
        actorId,
        scope: AuditTrailScope.FINDING,
        entityId: dto.findingId,
        entityType: 'followUp',
        action: 'audit.followUpCreated',
        metadata: { followUpId: followUp.id }
      }
    });

    this.events.emit('audit.followUpCreated', {
      tenantId,
      findingId: dto.findingId,
      followUpId: followUp.id
    });

    return followUp;
  }

  private async renderPdf(content: {
    title: string;
    sections: Array<{ heading: string; body: string[] }>;
  }): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk as Buffer));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (error) => reject(error));

      doc.fontSize(20).text(content.title, { align: 'center' }).moveDown();

      content.sections.forEach((section) => {
        doc.fontSize(14).text(section.heading, { underline: true }).moveDown(0.5);
        section.body.forEach((paragraph) => {
          doc.fontSize(11).text(paragraph).moveDown(0.5);
        });
        doc.moveDown(1);
      });

      doc.end();
    });
  }

  async generateReport(tenantId: string, dto: GenerateReportDto, actorId: string) {
    const template = await this.prisma.reportTemplate.findFirst({
      where: { id: dto.templateId, tenantId }
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    let title = template.name;
    const sections: Array<{ heading: string; body: string[] }> = [];

    if (template.type === ReportTemplateType.RISK_REGISTER) {
      const risks = await this.prisma.risk.findMany({
        where: { tenantId },
        include: { category: true, owner: true }
      });
      sections.push({
        heading: 'Risk Register Overview',
        body: [
          `Total risks: ${risks.length}`,
          ...risks.slice(0, 10).map(
            (risk) =>
              `${risk.referenceId} - ${risk.title} (${risk.category.name}) residual: ${risk.residualScore ?? risk.inherentScore}`
          )
        ]
      });
    } else if (template.type === ReportTemplateType.AUDIT_ENGAGEMENT) {
      if (!dto.context.entityId) {
        throw new BadRequestException('Engagement identifier required for audit report');
      }
      const engagement = await this.prisma.auditEngagement.findFirst({
        where: { id: dto.context.entityId, tenantId },
        include: { findings: true, workpapers: true }
      });
      if (!engagement) {
        throw new NotFoundException('Engagement not found');
      }
      title = `${template.name} – ${engagement.name}`;
      sections.push({
        heading: 'Engagement Summary',
        body: [
          `Status: ${engagement.status}`,
          `Fieldwork window: ${engagement.startDate?.toISOString() ?? 'TBD'} - ${
            engagement.endDate?.toISOString() ?? 'TBD'
          }`,
          `Workpapers: ${engagement.workpapers.length}`,
          `Open findings: ${engagement.findings.filter((finding) => finding.status !== FindingStatus.CLOSED).length}`
        ]
      });
    }

    const buffer = await this.renderPdf({
      title,
      sections
    });

    const report = await this.prisma.generatedReport.create({
      data: {
        tenantId,
        templateId: dto.templateId,
        context: dto.context,
        fileRef: null
      }
    });

    await this.prisma.auditTrailEvent.create({
      data: {
        tenantId,
        actorId,
        scope: AuditTrailScope.ENGAGEMENT,
        entityId: report.id,
        entityType: 'report',
        action: 'audit.reportGenerated',
        metadata: { templateId: dto.templateId }
      }
    });

    this.events.emit('audit.reportGenerated', {
      tenantId,
      reportId: report.id,
      templateId: dto.templateId
    });

    return {
      reportId: report.id,
      contentType: 'application/pdf',
      data: buffer.toString('base64')
    };
  }
}
