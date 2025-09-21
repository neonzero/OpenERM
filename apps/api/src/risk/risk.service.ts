import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import Papa from 'papaparse';
import {
  AssessmentStatus,
  AuditTrailScope,
  IndicatorDirection,
  IndicatorStatus,
  MitigationStatus,
  QuestionType,
  QuestionnaireResponseStatus,
  QuestionnaireStatus,
  RemediationStatus,
  RiskStatus
} from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { CreateRiskDto } from './dto/create-risk.dto';
import { CreateRiskAssessmentDto } from './dto/create-risk-assessment.dto';
import { UpdateRiskStatusDto } from './dto/update-risk-status.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CreateRiskQuestionnaireDto } from './dto/create-risk-questionnaire.dto';
import { SubmitQuestionnaireResponseDto } from './dto/submit-questionnaire-response.dto';
import { CreateRiskIndicatorDto } from './dto/create-risk-indicator.dto';
import { RecordRiskIndicatorDto } from './dto/record-risk-indicator.dto';
import { CreateMitigationDto } from './dto/create-mitigation.dto';
import { UpdateMitigationStatusDto } from './dto/update-mitigation-status.dto';
import { ImportRisksDto } from './dto/import-risks.dto';

const STATUS_STRING_TO_ENUM: Record<string, RiskStatus> = {
  DRAFT: RiskStatus.DRAFT,
  ASSESSMENT: RiskStatus.ASSESSMENT,
  MITIGATION: RiskStatus.MITIGATION,
  MONITORING: RiskStatus.MONITORING,
  CLOSED: RiskStatus.CLOSED
};

const QUESTION_TYPE_MAP: Record<string, QuestionType> = {
  TEXT: QuestionType.TEXT,
  MULTI_SELECT: QuestionType.MULTI_SELECT,
  SCALE: QuestionType.SCALE
};

@Injectable()
export class RiskService {
  constructor(private readonly prisma: PrismaService, private readonly events: EventsService) {}

  async list(tenantId: string, pagination: PaginationDto) {
    const { page, pageSize } = pagination;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.risk.findMany({
        where: { tenantId },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          category: true,
          owner: true
        },
        orderBy: {
          updatedAt: 'desc'
        }
      }),
      this.prisma.risk.count({ where: { tenantId } })
    ]);

    return {
      items,
      page,
      pageSize,
      total
    };
  }

  async create(tenantId: string, dto: CreateRiskDto, actorId: string) {
    const risk = await this.prisma.risk.create({
      data: {
        tenantId,
        ...dto,
        tags: dto.tags ?? [],
        status: RiskStatus.DRAFT
      }
    });

    await this.prisma.auditTrailEvent.create({
      data: {
        tenantId,
        actorId,
        scope: AuditTrailScope.RISK,
        entityId: risk.id,
        entityType: 'risk',
        action: 'risk.created',
        metadata: { dto }
      }
    });

    this.events.emit('risk.created', { tenantId, riskId: risk.id });

    return risk;
  }

  async updateStatus(tenantId: string, riskId: string, dto: UpdateRiskStatusDto, actorId: string) {
    const risk = await this.prisma.risk.findFirst({ where: { id: riskId, tenantId } });
    if (!risk) {
      throw new NotFoundException('Risk not found');
    }

    const updated = await this.prisma.risk.update({
      where: { id: riskId },
      data: {
        status: dto.status,
        reviewDate: dto.reviewDate ?? risk.reviewDate
      }
    });

    await this.prisma.auditTrailEvent.create({
      data: {
        tenantId,
        actorId,
        scope: AuditTrailScope.RISK,
        entityId: riskId,
        entityType: 'risk',
        action: 'risk.statusChanged',
        metadata: { from: risk.status, to: dto.status }
      }
    });

    this.events.emit('risk.statusChanged', { tenantId, riskId: updated.id, status: updated.status });

    return updated;
  }

  async createAssessment(tenantId: string, dto: CreateRiskAssessmentDto, actorId: string) {
    const risk = await this.prisma.risk.findFirst({ where: { id: dto.riskId, tenantId } });
    if (!risk) {
      throw new NotFoundException('Risk not found');
    }

    const assessment = await this.prisma.riskAssessment.create({
      data: {
        tenantId,
        riskId: dto.riskId,
        assessorId: dto.assessorId,
        methodology: dto.methodology,
        inherentScore: dto.inherentScore,
        residualScore: dto.residualScore,
        status: dto.status ?? AssessmentStatus.DRAFT,
        notes: dto.notes
      },
      include: {
        assessor: true
      }
    });

    await this.prisma.auditTrailEvent.create({
      data: {
        tenantId,
        actorId,
        scope: AuditTrailScope.ASSESSMENT,
        entityId: assessment.id,
        entityType: 'riskAssessment',
        action: 'risk.assessmentCreated',
        metadata: { dto }
      }
    });

    this.events.emit('risk.assessmentCreated', {
      tenantId,
      assessmentId: assessment.id,
      riskId: dto.riskId
    });

    return assessment;
  }

  async createQuestionnaire(tenantId: string, dto: CreateRiskQuestionnaireDto, actorId: string) {
    const questionnaire = await this.prisma.riskQuestionnaire.create({
      data: {
        tenantId,
        title: dto.title,
        period: dto.period,
        scope: dto.scope,
        audience: dto.audience,
        status: dto.status ?? QuestionnaireStatus.DRAFT,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        questions: {
          create: dto.questions.map((question, index) => ({
            prompt: question.prompt,
            responseType: QUESTION_TYPE_MAP[question.responseType],
            options: question.options ?? [],
            sortOrder: question.sortOrder ?? index + 1
          }))
        }
      }
    });

    await this.prisma.auditTrailEvent.create({
      data: {
        tenantId,
        actorId,
        scope: AuditTrailScope.RISK,
        entityId: questionnaire.id,
        entityType: 'riskQuestionnaire',
        action: 'risk.questionnaireCreated',
        metadata: { title: dto.title, period: dto.period }
      }
    });

    this.events.emit('risk.questionnaireCreated', { tenantId, questionnaireId: questionnaire.id });

    return questionnaire;
  }

  async submitQuestionnaireResponse(
    tenantId: string,
    questionnaireId: string,
    dto: SubmitQuestionnaireResponseDto,
    actorId: string
  ) {
    const questionnaire = await this.prisma.riskQuestionnaire.findFirst({
      where: { id: questionnaireId, tenantId },
      include: { questions: true }
    });

    if (!questionnaire) {
      throw new NotFoundException('Questionnaire not found');
    }

    if (questionnaire.status === QuestionnaireStatus.CLOSED) {
      throw new BadRequestException('Questionnaire closed');
    }

    const questionIds = new Set(questionnaire.questions.map((q) => q.id));
    const unanswered = Object.keys(dto.answers).filter((key) => !questionIds.has(key));
    if (unanswered.length > 0) {
      throw new BadRequestException(`Unknown question identifiers: ${unanswered.join(', ')}`);
    }

    const response = await this.prisma.riskQuestionnaireResponse.create({
      data: {
        questionnaireId,
        respondentId: dto.respondentId ?? actorId,
        answers: dto.answers,
        status: QuestionnaireResponseStatus.SUBMITTED,
        submittedAt: new Date()
      }
    });

    await this.prisma.auditTrailEvent.create({
      data: {
        tenantId,
        actorId,
        scope: AuditTrailScope.RISK,
        entityId: response.id,
        entityType: 'riskQuestionnaireResponse',
        action: 'risk.questionnaireResponded',
        metadata: { questionnaireId }
      }
    });

    this.events.emit('risk.questionnaireResponded', {
      tenantId,
      questionnaireId,
      responseId: response.id
    });

    return response;
  }

  async createMitigation(tenantId: string, riskId: string, dto: CreateMitigationDto, actorId: string) {
    const risk = await this.prisma.risk.findFirst({ where: { id: riskId, tenantId } });
    if (!risk) {
      throw new NotFoundException('Risk not found');
    }

    const mitigation = await this.prisma.mitigationPlan.create({
      data: {
        tenantId,
        riskId,
        ownerId: dto.ownerId,
        title: dto.title,
        strategy: dto.strategy,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        status: MitigationStatus.PLANNED,
        actions: {
          create: dto.actions?.map((action) => ({
            description: action.description,
            ownerId: action.ownerId,
            status: action.status ?? RemediationStatus.OPEN,
            dueDate: action.dueDate ? new Date(action.dueDate) : undefined
          }))
        }
      },
      include: {
        actions: true
      }
    });

    await this.prisma.auditTrailEvent.create({
      data: {
        tenantId,
        actorId,
        scope: AuditTrailScope.MITIGATION,
        entityId: mitigation.id,
        entityType: 'mitigationPlan',
        action: 'risk.mitigationCreated',
        metadata: { riskId }
      }
    });

    this.events.emit('risk.mitigationCreated', {
      tenantId,
      riskId,
      mitigationId: mitigation.id
    });

    return mitigation;
  }

  async updateMitigationStatus(
    tenantId: string,
    mitigationId: string,
    dto: UpdateMitigationStatusDto,
    actorId: string
  ) {
    const mitigation = await this.prisma.mitigationPlan.findFirst({
      where: { id: mitigationId, tenantId },
      include: { risk: true }
    });

    if (!mitigation) {
      throw new NotFoundException('Mitigation plan not found');
    }

    const updated = await this.prisma.mitigationPlan.update({
      where: { id: mitigationId },
      data: {
        status: dto.status,
        updatedAt: new Date()
      }
    });

    await this.prisma.auditTrailEvent.create({
      data: {
        tenantId,
        actorId,
        scope: AuditTrailScope.MITIGATION,
        entityId: mitigationId,
        entityType: 'mitigationPlan',
        action: 'risk.mitigationStatusChanged',
        metadata: { from: mitigation.status, to: dto.status }
      }
    });

    if (dto.status === MitigationStatus.EFFECTIVE || dto.status === MitigationStatus.CLOSED) {
      await this.prisma.risk.update({
        where: { id: mitigation.riskId },
        data: {
          residualScore: mitigation.risk.residualScore ?? mitigation.risk.inherentScore / 2
        }
      });
    }

    this.events.emit('risk.mitigationStatusChanged', {
      tenantId,
      riskId: mitigation.riskId,
      mitigationId,
      status: dto.status
    });

    return updated;
  }

  async createIndicator(tenantId: string, riskId: string, dto: CreateRiskIndicatorDto, actorId: string) {
    const risk = await this.prisma.risk.findFirst({ where: { id: riskId, tenantId } });
    if (!risk) {
      throw new NotFoundException('Risk not found');
    }

    const indicator = await this.prisma.riskIndicator.create({
      data: {
        tenantId,
        riskId,
        name: dto.name,
        description: dto.description,
        cadence: dto.cadence,
        direction: dto.direction ?? IndicatorDirection.DECREASE,
        threshold: dto.threshold,
        target: dto.target,
        status: IndicatorStatus.ON_TRACK
      }
    });

    await this.prisma.auditTrailEvent.create({
      data: {
        tenantId,
        actorId,
        scope: AuditTrailScope.RISK,
        entityId: indicator.id,
        entityType: 'riskIndicator',
        action: 'risk.indicatorCreated',
        metadata: { name: dto.name }
      }
    });

    this.events.emit('risk.indicatorCreated', { tenantId, riskId, indicatorId: indicator.id });

    return indicator;
  }

  private evaluateIndicatorStatus(
    direction: IndicatorDirection,
    value: number,
    threshold?: number | null,
    target?: number | null
  ): IndicatorStatus {
    if (threshold == null) {
      return IndicatorStatus.ON_TRACK;
    }

    if (direction === IndicatorDirection.INCREASE) {
      if (value < threshold) {
        return IndicatorStatus.BREACHED;
      }
      if (target != null && value < target) {
        return IndicatorStatus.WARNING;
      }
      return IndicatorStatus.ON_TRACK;
    }

    if (direction === IndicatorDirection.DECREASE) {
      if (value > threshold) {
        return IndicatorStatus.BREACHED;
      }
      if (target != null && value > target) {
        return IndicatorStatus.WARNING;
      }
      return IndicatorStatus.ON_TRACK;
    }

    // RANGE direction assumes threshold is the maximum acceptable value and target is minimum
    if (target == null) {
      return IndicatorStatus.ON_TRACK;
    }

    if (value < target || value > (threshold ?? target)) {
      return IndicatorStatus.BREACHED;
    }

    const buffer = Math.abs((threshold ?? target) - target) * 0.1;
    if (value < target + buffer || value > (threshold ?? target) - buffer) {
      return IndicatorStatus.WARNING;
    }

    return IndicatorStatus.ON_TRACK;
  }

  async recordIndicatorUpdate(
    tenantId: string,
    indicatorId: string,
    dto: RecordRiskIndicatorDto,
    actorId: string
  ) {
    const indicator = await this.prisma.riskIndicator.findFirst({ where: { id: indicatorId, tenantId } });

    if (!indicator) {
      throw new NotFoundException('Indicator not found');
    }

    const status = this.evaluateIndicatorStatus(indicator.direction, dto.value, indicator.threshold, indicator.target);

    const update = await this.prisma.$transaction(async (tx) => {
      const created = await tx.riskIndicatorUpdate.create({
        data: {
          indicatorId,
          value: dto.value,
          note: dto.note,
          breached: status === IndicatorStatus.BREACHED
        }
      });

      await tx.riskIndicator.update({
        where: { id: indicatorId },
        data: {
          lastValue: dto.value,
          lastEvaluatedAt: new Date(),
          status
        }
      });

      return created;
    });

    await this.prisma.auditTrailEvent.create({
      data: {
        tenantId,
        actorId,
        scope: AuditTrailScope.RISK,
        entityId: indicatorId,
        entityType: 'riskIndicator',
        action: 'risk.indicatorRecorded',
        metadata: { value: dto.value, status }
      }
    });

    this.events.emit('risk.indicatorRecorded', { tenantId, indicatorId, value: dto.value, status });

    return update;
  }

  private buildHeatmap(risks: Array<{ inherentScore: number; residualScore: number | null; id: string; title: string }>) {
    const cells: Record<string, { count: number; risks: string[] }> = {};

    for (const risk of risks) {
      const likelihood = Math.min(5, Math.max(1, Math.ceil((risk.inherentScore || 1) / 5)));
      const impact = Math.min(5, Math.max(1, Math.ceil(((risk.residualScore ?? risk.inherentScore) || 1) / 5)));
      const key = `${likelihood}-${impact}`;
      if (!cells[key]) {
        cells[key] = { count: 0, risks: [] };
      }
      cells[key].count += 1;
      cells[key].risks.push(risk.title);
    }

    return Object.entries(cells).map(([bucket, data]) => ({
      bucket,
      count: data.count,
      risks: data.risks
    }));
  }

  async dashboard(tenantId: string) {
    const [risks, preference, mitigations, indicators] = await this.prisma.$transaction([
      this.prisma.risk.findMany({
        where: { tenantId },
        include: { owner: true }
      }),
      this.prisma.tenantRiskPreference.findUnique({ where: { tenantId } }),
      this.prisma.mitigationPlan.findMany({ where: { tenantId } }),
      this.prisma.riskIndicator.findMany({ where: { tenantId } })
    ]);

    const topRisks = [...risks]
      .sort((a, b) => (b.residualScore ?? 0) - (a.residualScore ?? 0))
      .slice(0, 5)
      .map((risk) => ({
        id: risk.id,
        title: risk.title,
        residualScore: risk.residualScore ?? risk.inherentScore,
        owner: risk.owner?.displayName ?? 'Unassigned'
      }));

    const appetiteBreaches = preference
      ? risks
          .filter((risk) => {
            const residual = risk.residualScore ?? risk.inherentScore;
            const appetite = preference.residualAppetite ?? 0;
            return residual > appetite;
          })
          .map((risk) => ({
            id: risk.id,
            title: risk.title,
            residualScore: risk.residualScore ?? risk.inherentScore
          }))
      : [];

    const mitigationSummary = mitigations.reduce(
      (acc, mitigation) => {
        acc[mitigation.status] = (acc[mitigation.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<MitigationStatus, number>
    );

    const indicatorSummary = indicators.reduce(
      (acc, indicator) => {
        acc[indicator.status] = (acc[indicator.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<IndicatorStatus, number>
    );

    return {
      totalRisks: risks.length,
      heatmap: this.buildHeatmap(
        risks.map((risk) => ({
          id: risk.id,
          title: risk.title,
          inherentScore: risk.inherentScore,
          residualScore: risk.residualScore
        }))
      ),
      topRisks,
      appetiteBreaches,
      mitigationSummary,
      indicatorSummary
    };
  }

  async importRisks(tenantId: string, dto: ImportRisksDto, actorId: string) {
    const result = Papa.parse(dto.csv, { header: true, skipEmptyLines: true });
    if (result.errors.length > 0) {
      throw new BadRequestException(result.errors.map((err) => err.message).join('; '));
    }

    const rows = result.data as Array<Record<string, string>>;
    if (rows.length === 0) {
      return { imported: 0 };
    }

    const categories = await this.prisma.riskCategory.findMany({ where: { tenantId } });
    const categoryMap = new Map(categories.map((category) => [category.name.toLowerCase(), category.id]));

    let processed = 0;

    for (const row of rows) {
      const referenceId = row.referenceId ?? row.ReferenceId ?? row.reference ?? row.id;
      const title = row.title ?? row.Title;
      if (!referenceId || !title) {
        continue;
      }

      const categoryName = (row.category ?? row.Category ?? 'Uncategorized').trim();
      let categoryId = categoryMap.get(categoryName.toLowerCase());
      if (!categoryId) {
        const createdCategory = await this.prisma.riskCategory.create({
          data: {
            tenantId,
            name: categoryName
          }
        });
        categoryMap.set(categoryName.toLowerCase(), createdCategory.id);
        categoryId = createdCategory.id;
      }

      const ownerEmail = row.ownerEmail ?? row.owner ?? row.OwnerEmail;
      const owner = ownerEmail
        ? await this.prisma.user.findFirst({ where: { email: ownerEmail, tenantId } })
        : null;

      const inherentScore = Number.parseFloat(row.inherentScore ?? row.InherentScore ?? '0') || 0;
      const residualScore = row.residualScore ? Number.parseFloat(row.residualScore) : undefined;
      const statusKey = (row.status ?? row.Status ?? 'DRAFT').toUpperCase();
      const status = STATUS_STRING_TO_ENUM[statusKey] ?? RiskStatus.DRAFT;
      const tags = row.tags ? row.tags.split(/[,;]\s*/).filter(Boolean) : [];

      await this.prisma.risk.upsert({
        where: { tenantId_referenceId: { tenantId, referenceId } },
        update: {
          title,
          description: row.description ?? row.Description,
          categoryId,
          inherentScore,
          residualScore,
          status,
          ownerId: owner?.id,
          tags
        },
        create: {
          tenantId,
          categoryId,
          referenceId,
          title,
          description: row.description ?? row.Description,
          inherentScore,
          residualScore,
          status,
          ownerId: owner?.id,
          tags
        }
      });

      processed += 1;
    }

    await this.prisma.auditTrailEvent.create({
      data: {
        tenantId,
        actorId,
        scope: AuditTrailScope.RISK,
        entityId: tenantId,
        entityType: 'risk',
        action: 'risk.imported',
        metadata: { processed }
      }
    });

    this.events.emit('risk.imported', { tenantId, processed });

    return { imported: processed };
  }

  async exportRisks(tenantId: string) {
    const risks = await this.prisma.risk.findMany({
      where: { tenantId },
      include: { category: true, owner: true },
      orderBy: {
        referenceId: 'asc'
      }
    });

    const csv = Papa.unparse(
      risks.map((risk) => ({
        referenceId: risk.referenceId,
        title: risk.title,
        category: risk.category.name,
        inherentScore: risk.inherentScore,
        residualScore: risk.residualScore ?? '',
        status: risk.status,
        ownerEmail: risk.owner?.email ?? '',
        tags: risk.tags.join(',')
      }))
    );

    return { csv };
  }
}
