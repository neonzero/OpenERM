import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { differenceInDays, startOfMonth, endOfMonth } from 'date-fns';
import { PrismaService } from '../common/prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { RiskQueryDto } from './dto/risk-query.dto';
import { CreateRiskDto } from './dto/create-risk.dto';
import { CreateRiskAssessmentDto } from './dto/create-risk-assessment.dto';
import { CreateRiskQuestionnaireDto } from './dto/create-risk-questionnaire.dto';
import { CreateTreatmentDto } from './dto/create-treatment.dto';
import { ImportRisksDto } from './dto/import-risks.dto';
import { UpdateTreatmentStatusDto } from './dto/update-treatment-status.dto';
import { MarkKeyRiskDto } from './dto/mark-key-risk.dto';
import { CreateIndicatorDto } from './dto/create-indicator.dto';
import { RecordIndicatorReadingDto } from './dto/record-indicator-reading.dto';
import { SubmitQuestionnaireResponseDto } from './dto/submit-questionnaire-response.dto';
import { IndicatorTrendQueryDto } from './dto/indicator-trend-query.dto';

@Injectable()
export class RiskService {
  constructor(private readonly prisma: PrismaService, private readonly events: EventsService) {}

  async updateRiskFromFinding(tenantId: string, riskId: string) {
    // TODO: Implement logic to update risk from finding
    console.log(`Updating risk ${riskId} in tenant ${tenantId} from finding`);
  }

  async recalibrateRiskAppetite(tenantId: string, engagementId: string) {
    // TODO: Implement logic to recalibrate risk appetite
    console.log(`Recalibrating risk appetite for engagement ${engagementId} in tenant ${tenantId}`);
  }

  async updateRiskAssessmentFramework(tenantId: string, taxonomyId: string) {
    // TODO: Implement logic to update risk assessment framework
    console.log(`Updating risk assessment framework for taxonomy ${taxonomyId} in tenant ${tenantId}`);
  }

  async updateRiskScoresFromFinding(tenantId: string, riskId: string, severity: string) {
    // TODO: Implement logic to update risk scores from finding
    console.log(`Updating risk scores for risk ${riskId} in tenant ${tenantId} from finding with severity ${severity}`);
  }

  async updateControlEffectivenessFromFinding(tenantId: string, riskId: string) {
    // TODO: Implement logic to update control effectiveness from finding
    console.log(`Updating control effectiveness for risk ${riskId} in tenant ${tenantId}`);
  }

  async calibrateRiskModels(tenantId: string) {
    // TODO: Implement logic to calibrate risk models
    console.log(`Calibrating risk models for tenant ${tenantId}`);
  }


  private async getRiskSettings(tenantId: string): Promise<RiskSettings> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true }
    });

    const settings = (tenant?.settings ?? {}) as Record<string, any>;
    const appetite = typeof settings?.riskAppetite === 'number' ? settings.riskAppetite : undefined;
    const heatmapConfig = (settings?.heatmap ?? settings?.heatmapThresholds ?? {}) as Record<string, any>;

    const heatmap = {
      greenMax: typeof heatmapConfig?.greenMax === 'number' ? heatmapConfig.greenMax : 5,
      amberMax: typeof heatmapConfig?.amberMax === 'number' ? heatmapConfig.amberMax : 12,
      redMax: typeof heatmapConfig?.redMax === 'number' ? heatmapConfig.redMax : 25
    };

    return {
      appetite,
      heatmap
    };
  }

  private computeResidualScore(likelihood: number, impact: number): number {
    return likelihood * impact;
  }

  private determineHeatmapColor(score: number, thresholds: RiskSettings['heatmap']): 'green' | 'amber' | 'red' {
    if (score <= thresholds.greenMax) {
      return 'green';
    }
    if (score <= thresholds.amberMax) {
      return 'amber';
    }
    return 'red';
  }

  private buildRiskWhere(tenantId: string, query: RiskQueryDto): Prisma.RiskWhereInput {
    const { search, status, ownerId, taxonomy, keyRisk, appetiteBreached } = query;
    const where: Prisma.RiskWhereInput = {
      tenantId,
      ...(status ? { status } : {}),
      ...(ownerId ? { ownerId } : {})
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } }
      ];
    }

    const taxonomyFilter = Array.isArray(taxonomy)
      ? taxonomy
      : typeof taxonomy === 'string'
        ? [taxonomy]
        : [];

    if (taxonomyFilter.length > 0) {
      // @ts-expect-error - hasSome is not in the type definition but is available
      where.taxonomy = { hasSome: taxonomyFilter };
    }

    if (typeof keyRisk === 'boolean') {
      where.keyRisk = keyRisk;
    }

    if (typeof appetiteBreached === 'boolean') {
      where.appetiteBreached = appetiteBreached;
    }

    return where;
  }

  private buildRiskOrder(sort: RiskQueryDto['sort']): Prisma.RiskOrderByWithRelationInput[] {
    switch (sort) {
      case 'residualScoreAsc':
        return [{ residualScore: 'asc' }, { updatedAt: 'desc' }];
      case 'residualScoreDesc':
        return [{ residualScore: 'desc' }, { updatedAt: 'desc' }];
      default:
        return [{ updatedAt: 'desc' }];
    }
  }

  private parseList(value?: string): string[] {
    if (!value) {
      return [];
    }

    return value
      .split(LIST_SEPARATOR)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  private parseBoolean(value?: string): boolean | undefined {
    if (!value) {
      return undefined;
    }

    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'n'].includes(normalized)) {
      return false;
    }
    return undefined;
  }

  private splitCsvLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];

      if (char === '"') {
        const nextChar = line[i + 1];
        if (inQuotes && nextChar === '"') {
          current += '"';
          i += 1;
          continue;
        }
        inQuotes = !inQuotes;
        continue;
      }

      if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
        continue;
      }

      current += char;
    }

    values.push(current.trim());
    return values;
  }

  private parseImportCsv(csv: string): { rows: ParsedImportRow[]; errors: ImportError[] } {
    const lines = csv
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      return { rows: [], errors: [] };
    }

    const header = this.splitCsvLine(lines[0]);
    const rows: ParsedImportRow[] = [];
    const errors: ImportError[] = [];

    for (let index = 1; index < lines.length; index += 1) {
      const rawValues = this.splitCsvLine(lines[index]);
      const raw: Record<string, string> = {};

      header.forEach((column, columnIndex) => {
        raw[column] = rawValues[columnIndex] ?? '';
      });

      const parsed = riskImportRowSchema.safeParse({
        title: raw.title,
        description: raw.description || undefined,
        taxonomy: this.parseList(raw.taxonomy),
        ownerEmail: raw.ownerEmail ? raw.ownerEmail : undefined,
        cause: raw.cause || undefined,
        consequence: raw.consequence || undefined,
        inherentLikelihood: Number(raw.inherentLikelihood),
        inherentImpact: Number(raw.inherentImpact),
        residualLikelihood: raw.residualLikelihood ? Number(raw.residualLikelihood) : undefined,
        residualImpact: raw.residualImpact ? Number(raw.residualImpact) : undefined,
        status: raw.status || undefined,
        tags: this.parseList(raw.tags),
        keyRisk: this.parseBoolean(raw.keyRisk)
      });

      if (parsed.success) {
        rows.push({ line: index + 1, row: parsed.data });
      } else {
        const message = parsed.error.issues.map((issue) => issue.message).join(', ');
        errors.push({ line: index + 1, message });
      }
    }

    return { rows, errors };
  }

  private formatCsvValue(value: string | number | boolean | null | undefined): string {
    if (value === undefined || value === null) {
      return '';
    }

    const stringValue = String(value);
    if (/[",\n]/.test(stringValue)) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  }

  async list(tenantId: string, query: RiskQueryDto) {
    const where = this.buildRiskWhere(tenantId, query);
    const orderBy = this.buildRiskOrder(query.sort);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.risk.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          owner: {
            select: {
              name: true,
              email: true
            }
          }
        }
      }),
      this.prisma.risk.count({ where })
    ]);

    return {
      items,
      page: query.page,
      pageSize: query.pageSize,
      total
    };
  }

  async create(tenantId: string, dto: CreateRiskDto, actorId?: string | null) {
    const settings = await this.getRiskSettings(tenantId);
    const residualL = dto.residualLikelihood ?? dto.inherentLikelihood;
    const residualI = dto.residualImpact ?? dto.inherentImpact;
    const residualScore = this.computeResidualScore(residualL, residualI);
    const appetiteBreached =
      typeof settings.appetite === 'number' ? residualScore > settings.appetite : false;

    const risk = await this.prisma.risk.create({
      data: {
        tenantId,
        title: dto.title,
        description: dto.description ?? null,
        // @ts-expect-error - taxonomy type mismatch but handled correctly
        taxonomy: dto.taxonomy ?? [],
        cause: dto.cause ?? null,
        consequence: dto.consequence ?? null,
        ownerId: dto.ownerId ?? null,
        inherentL: dto.inherentLikelihood,
        inherentI: dto.inherentImpact,
        residualL,
        residualI,
        residualScore,
        appetiteThreshold: settings.appetite ?? null,
        appetiteBreached,
        status: 'Open',
        tags: dto.tags ?? []
      }
    });

    await this.events.record(tenantId, {
      actorId: actorId ?? null,
      entity: 'risk',
      entityId: risk.id,
      type: 'risk.created',
      diff: { title: risk.title }
    });

    return risk;
  }

  async createAssessment(tenantId: string, dto: CreateRiskAssessmentDto, actorId?: string | null) {
    const settings = await this.getRiskSettings(tenantId);
    const risk = await this.prisma.risk.findFirst({
      where: { id: dto.riskId, tenantId },
      select: {
        id: true,
        residualL: true,
        residualI: true,
        appetiteThreshold: true,
        appetiteBreached: true
      }
    });

    if (!risk) {
      throw new NotFoundException('Risk not found');
    }

    const bucket = matrixKey(dto.scores.likelihood, dto.scores.impact);
    const residualLikelihood =
      dto.scores.residualLikelihood ?? risk.residualL ?? dto.scores.likelihood;
    const residualImpact = dto.scores.residualImpact ?? risk.residualI ?? dto.scores.impact;
    const residualScore = this.computeResidualScore(residualLikelihood, residualImpact);

    const assessment = await this.prisma.assessment.create({
      data: {
        tenantId,
        riskId: dto.riskId,
        method: dto.method,
        // @ts-expect-error - criteriaConfig type mismatch but handled correctly
        criteriaConfig: dto.criteriaConfig ?? null,
        scores: dto.scores,
        residualScore,
        matrixBucket: bucket,
        reviewerId: dto.reviewerId ?? null,
        approvedAt: dto.reviewerId ? new Date() : null
      }
    });

    const appetiteThreshold =
      risk.appetiteThreshold ?? (typeof settings.appetite === 'number' ? settings.appetite : undefined);
    const appetiteBreached =
      typeof appetiteThreshold === 'number' ? residualScore > appetiteThreshold : risk.appetiteBreached;

    const riskUpdate: Prisma.RiskUpdateInput = {
      residualL: residualLikelihood,
      residualI: residualImpact,
      residualScore,
      appetiteBreached
    };

    if (typeof appetiteThreshold === 'number') {
      riskUpdate.appetiteThreshold = appetiteThreshold;
    }

    await this.prisma.risk.update({ where: { id: risk.id }, data: riskUpdate });

    await this.events.record(tenantId, {
      actorId: actorId ?? null,
      entity: 'risk-assessment',
      entityId: assessment.id,
      type: 'risk.assessed',
      diff: { matrixBucket: bucket, residualScore }
    });

    return assessment;
  }

  async createQuestionnaire(
    tenantId: string,
    dto: CreateRiskQuestionnaireDto,
    actorId?: string | null
  ) {
    const questionnaire = await this.prisma.questionnaire.create({
      data: {
        tenantId,
        period: dto.period,
        scope: dto.scope ?? null,
        audience: dto.audience,
        questions: dto.questions,
        status: dto.status ?? 'Draft',
        dueDate: dto.dueDate ?? null
      }
    });

    await this.events.record(tenantId, {
      actorId: actorId ?? null,
      entity: 'questionnaire',
      entityId: questionnaire.id,
      type: 'risk.questionnaire.created',
      diff: { period: dto.period, audience: dto.audience }
    });

    return questionnaire;
  }

  async submitQuestionnaireResponse(
    tenantId: string,
    questionnaireId: string,
    dto: SubmitQuestionnaireResponseDto,
    actorId?: string | null
  ) {
    const questionnaire = await this.prisma.questionnaire.findFirst({
      where: { id: questionnaireId, tenantId }
    });

    if (!questionnaire) {
      throw new NotFoundException('Questionnaire not found');
    }

    let riskId: string | null = null;
    if (dto.riskId) {
      const risk = await this.prisma.risk.findFirst({ where: { id: dto.riskId, tenantId } });
      if (!risk) {
        throw new NotFoundException('Linked risk not found');
      }
      riskId = risk.id;
    }

    const submittedAt = dto.status === 'Submitted' ? dto.submittedAt ?? new Date() : dto.submittedAt ?? null;

    const response = await this.prisma.questionnaireResponse.create({
      data: {
        tenantId,
        questionnaireId,
        respondentEmail: dto.respondentEmail,
        status: dto.status,
        answers: dto.answers,
        submittedAt,
        riskId
      }
    });

    await this.events.record(tenantId, {
      actorId: actorId ?? null,
      entity: 'questionnaire-response',
      entityId: response.id,
      type: 'risk.questionnaire.response-submitted',
      diff: { questionnaireId, riskId }
    });

    return response;
  }

  async createTreatment(tenantId: string, dto: CreateTreatmentDto, actorId?: string | null) {
    const risk = await this.prisma.risk.findFirst({ where: { id: dto.riskId, tenantId } });
    if (!risk) {
      throw new NotFoundException('Risk not found');
    }

    const treatment = await this.prisma.treatment.create({
      data: {
        tenantId,
        riskId: dto.riskId,
        title: dto.title,
        ownerId: dto.ownerId ?? null,
        due: dto.due ?? null,
        status: dto.status ?? 'Open',
        tasks: {
          create: (dto.tasks ?? []).map((task) => ({
            title: task.title,
            status: task.status ?? 'Pending',
            due: task.due ?? null
          }))
        }
      },
      include: { tasks: true }
    });

    await this.events.record(tenantId, {
      actorId: actorId ?? null,
      entity: 'treatment',
      entityId: treatment.id,
      type: 'risk.treatment.created',
      diff: { title: dto.title, riskId: dto.riskId }
    });

    return treatment;
  }

  async updateTreatmentStatus(
    tenantId: string,
    treatmentId: string,
    dto: UpdateTreatmentStatusDto,
    actorId?: string | null
  ) {
    const treatment = await this.prisma.treatment.findFirst({
      where: { id: treatmentId, tenantId },
      include: {
        risk: true,
        tasks: true
      }
    });

    if (!treatment) {
      throw new NotFoundException('Treatment not found');
    }

    if (dto.status !== treatment.status && !WORKFLOW_TRANSITIONS[treatment.status]?.includes(dto.status)) {
      throw new BadRequestException('Invalid status transition');
    }

    const updatedTreatment = await this.prisma.treatment.update({
      where: { id: treatment.id },
      data: {
        status: dto.status
      },
      include: { tasks: true }
    });

    if (dto.tasks) {
      await Promise.all(
        dto.tasks.map(async (task: UpdateTreatmentTaskDto) => {
          const data: Prisma.TreatmentTaskUpdateInput = {};
          if (task.status) {
            data.status = task.status;
          }
          if (task.due) {
            data.due = task.due;
          }

          if (Object.keys(data).length > 0) {
            await this.prisma.treatmentTask.update({ where: { id: task.id }, data });
          }
        })
      );
    }

    if (dto.status === 'Verified' && dto.residualLikelihood && dto.residualImpact) {
      const settings = await this.getRiskSettings(tenantId);
      const residualScore = this.computeResidualScore(dto.residualLikelihood, dto.residualImpact);
      const appetiteThreshold =
        treatment.risk.appetiteThreshold ?? (typeof settings.appetite === 'number' ? settings.appetite : undefined);
      const appetiteBreached =
        typeof appetiteThreshold === 'number' ? residualScore > appetiteThreshold : treatment.risk.appetiteBreached;

      const riskUpdate: Prisma.RiskUpdateInput = {
        residualL: dto.residualLikelihood,
        residualI: dto.residualImpact,
        residualScore,
        appetiteBreached
      };

      if (typeof appetiteThreshold === 'number') {
        riskUpdate.appetiteThreshold = appetiteThreshold;
      }

      await this.prisma.risk.update({ where: { id: treatment.riskId }, data: riskUpdate });
    }

    await this.events.record(tenantId, {
      actorId: actorId ?? null,
      entity: 'treatment',
      entityId: treatment.id,
      type: 'risk.treatment.status-changed',
      diff: { from: treatment.status, to: dto.status }
    });

    return updatedTreatment;
  }

  async importRisks(tenantId: string, dto: ImportRisksDto, actorId?: string | null) {
    const parsed = this.parseImportCsv(dto.csv);
    const settings = await this.getRiskSettings(tenantId);
    const errors: ImportError[] = [...parsed.errors];
    let imported = 0;

    for (const item of parsed.rows) {
      try {
        const owner = item.row.ownerEmail
          ? await this.prisma.user.findFirst({ where: { tenantId, email: item.row.ownerEmail } })
          : null;

        const residualL = item.row.residualLikelihood ?? item.row.inherentLikelihood;
        const residualI = item.row.residualImpact ?? item.row.inherentImpact;
        const residualScore = this.computeResidualScore(residualL, residualI);
        const appetiteBreached =
          typeof settings.appetite === 'number' ? residualScore > settings.appetite : false;

        const risk = await this.prisma.risk.create({
          data: {
            tenantId,
            title: item.row.title,
            description: item.row.description ?? null,
            // @ts-expect-error - taxonomy type mismatch but handled correctly
          taxonomy: item.row.taxonomy,
            cause: item.row.cause ?? null,
            consequence: item.row.consequence ?? null,
            ownerId: owner?.id ?? null,
            inherentL: item.row.inherentLikelihood,
            inherentI: item.row.inherentImpact,
            residualL,
            residualI,
            residualScore,
            appetiteThreshold: settings.appetite ?? null,
            appetiteBreached,
            status: item.row.status ?? 'Open',
            tags: item.row.tags,
            keyRisk: item.row.keyRisk ?? false
          }
        });

        imported += 1;

        await this.events.record(tenantId, {
          actorId: actorId ?? null,
          entity: 'risk',
          entityId: risk.id,
          type: 'risk.imported',
          diff: { sourceLine: item.line }
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to import risk';
        errors.push({ line: item.line, message });
      }
    }

    return { imported, errors };
  }

  async exportRisks(tenantId: string, query: RiskQueryDto) {
    const where = this.buildRiskWhere(tenantId, query);
    const orderBy = this.buildRiskOrder(query.sort);

    const risks = await this.prisma.risk.findMany({
      where,
      orderBy,
      include: {
        owner: {
          select: { name: true, email: true }
        }
      }
    });

    const header = [
      'Title',
      'Description',
      'Taxonomy',
      'Owner',
      'Owner Email',
      'Inherent Likelihood',
      'Inherent Impact',
      'Residual Likelihood',
      'Residual Impact',
      'Residual Score',
      'Appetite Threshold',
      'Appetite Breached',
      'Status',
      'Tags',
      'Key Risk'
    ];

    const rows = risks.map((risk) => [
      this.formatCsvValue(risk.title),
      this.formatCsvValue(risk.description ?? ''),
      // @ts-expect-error - taxonomy is not in the type definition but is available
      this.formatCsvValue(risk.taxonomy.join('; ')),
      this.formatCsvValue(risk.owner?.name ?? ''),
      this.formatCsvValue(risk.owner?.email ?? ''),
      this.formatCsvValue(risk.inherentL),
      this.formatCsvValue(risk.inherentI),
      this.formatCsvValue(risk.residualL ?? ''),
      this.formatCsvValue(risk.residualI ?? ''),
      this.formatCsvValue(risk.residualScore ?? ''),
      this.formatCsvValue(risk.appetiteThreshold ?? ''),
      this.formatCsvValue(risk.appetiteBreached),
      this.formatCsvValue(risk.status),
      this.formatCsvValue(risk.tags.join('; ')),
      this.formatCsvValue(risk.keyRisk)
    ].join(','));

    return {
      csv: [header.join(','), ...rows].join('\n')
    };
  }

  async prioritized(tenantId: string) {
    const settings = await this.getRiskSettings(tenantId);
    const risks = await this.prisma.risk.findMany({
      where: { tenantId },
      orderBy: [{ residualScore: 'desc' }, { updatedAt: 'desc' }]
    });

    return {
      generatedAt: new Date(),
      appetiteThreshold: settings.appetite ?? null,
      items: risks.map((risk, index) => ({
        rank: index + 1,
        id: risk.id,
        title: risk.title,
        residualScore: risk.residualScore,
        appetiteBreached: risk.appetiteBreached,
        keyRisk: risk.keyRisk,
        status: risk.status,
        taxonomy: risk.taxonomy
      }))
    };
  }

  async setKeyRisk(
    tenantId: string,
    riskId: string,
    dto: MarkKeyRiskDto,
    actorId?: string | null
  ) {
    const risk = await this.prisma.risk.findFirst({ where: { id: riskId, tenantId } });
    if (!risk) {
      throw new NotFoundException('Risk not found');
    }

    const updated = await this.prisma.risk.update({
      where: { id: risk.id },
      data: { keyRisk: dto.keyRisk }
    });

    await this.events.record(tenantId, {
      actorId: actorId ?? null,
      entity: 'risk',
      entityId: risk.id,
      type: 'risk.key-risk.updated',
      diff: { keyRisk: dto.keyRisk }
    });

    return updated;
  }

  async createIndicator(
    tenantId: string,
    dto: CreateIndicatorDto,
    actorId?: string | null
  ) {
    const risk = await this.prisma.risk.findFirst({ where: { id: dto.riskId, tenantId } });
    if (!risk) {
      throw new NotFoundException('Risk not found');
    }

    const indicator = await this.prisma.riskIndicator.create({
      data: {
        tenantId,
        riskId: dto.riskId,
        name: dto.name,
        direction: dto.direction,
        threshold: dto.threshold ?? null,
        unit: dto.unit ?? null,
        cadence: dto.cadence ?? null
      }
    });

    await this.events.record(tenantId, {
      actorId: actorId ?? null,
      entity: 'risk-indicator',
      entityId: indicator.id,
      type: 'risk.indicator.created',
      diff: { name: dto.name, riskId: dto.riskId }
    });

    return indicator;
  }

  async recordIndicatorReading(
    tenantId: string,
    indicatorId: string,
    dto: RecordIndicatorReadingDto,
    actorId?: string | null
  ) {
    const indicator = await this.prisma.riskIndicator.findFirst({
      where: { id: indicatorId, tenantId }
    });

    if (!indicator) {
      throw new NotFoundException('Indicator not found');
    }

    const recordedAt = dto.recordedAt ?? new Date();
    const reading = await this.prisma.indicatorReading.create({
      data: {
        indicatorId,
        value: dto.value,
        recordedAt
      }
    });

    let breached = indicator.breached;
    if (indicator.threshold !== null && indicator.threshold !== undefined) {
      if (indicator.direction === 'above') {
        breached = dto.value > indicator.threshold;
      } else if (indicator.direction === 'below') {
        breached = dto.value < indicator.threshold;
      }
    }

    await this.prisma.riskIndicator.update({
      where: { id: indicator.id },
      data: {
        latestValue: dto.value,
        latestRecordedAt: recordedAt,
        breached
      }
    });

    await this.events.record(tenantId, {
      actorId: actorId ?? null,
      entity: 'risk-indicator',
      entityId: indicator.id,
      type: breached ? 'risk.indicator.threshold-breached' : 'risk.indicator.reading-recorded',
      diff: { value: dto.value }
    });

    return reading;
  }

  async getRiskRegisterReport(tenantId: string, query: RiskQueryDto) {
    const settings = await this.getRiskSettings(tenantId);
    const where = this.buildRiskWhere(tenantId, query);
    const risks = await this.prisma.risk.findMany({
      where,
      orderBy: [{ residualScore: 'desc' }, { updatedAt: 'desc' }],
      include: {
        owner: { select: { name: true, email: true } },
        treatments: { select: { id: true, status: true, due: true } },
        indicators: {
          select: {
            id: true,
            name: true,
            latestValue: true,
            breached: true,
            threshold: true,
            direction: true
          }
        }
      }
    });

    return {
      generatedAt: new Date(),
      appetiteThreshold: settings.appetite ?? null,
      items: risks.map((risk) => ({
        id: risk.id,
        title: risk.title,
        owner: risk.owner,
        // @ts-expect-error - taxonomy is not in the type definition but is available
        taxonomy: risk.taxonomy,
        inherentScore: this.computeResidualScore(risk.inherentL, risk.inherentI),
        residualScore: risk.residualScore,
        appetiteBreached: risk.appetiteBreached,
        keyRisk: risk.keyRisk,
        status: risk.status,
        treatments: risk.treatments,
        indicators: risk.indicators
      }))
    };
  }

  async getTreatmentStatusReport(tenantId: string) {
    const treatments = await this.prisma.treatment.findMany({
      where: { tenantId },
      select: { status: true }
    });

    const workflow = ['Open', 'In Progress', 'Implemented', 'Verified'];
    const counts = new Map<string, number>();

    treatments.forEach((treatment) => {
      counts.set(treatment.status, (counts.get(treatment.status) ?? 0) + 1);
    });

    return {
      generatedAt: new Date(),
      totalTreatments: treatments.length,
      byStatus: workflow.map((status) => ({ status, count: counts.get(status) ?? 0 }))
    };
  }

  async getKriTrend(
    tenantId: string,
    indicatorId: string,
    query: IndicatorTrendQueryDto
  ) {
    const from = new Date(Date.now() - query.days * 24 * 60 * 60 * 1000);

    const indicator = await this.prisma.riskIndicator.findFirst({
      where: { id: indicatorId, tenantId },
      include: {
        readings: {
          where: { recordedAt: { gte: from } },
          orderBy: { recordedAt: 'asc' }
        }
      }
    });

    if (!indicator) {
      throw new NotFoundException('Indicator not found');
    }

    return {
      indicator: {
        id: indicator.id,
        name: indicator.name,
        direction: indicator.direction,
        threshold: indicator.threshold,
        unit: indicator.unit,
        breached: indicator.breached
      },
      readings: indicator.readings.map((reading) => ({
        recordedAt: reading.recordedAt,
        value: reading.value
      }))
    };
  }

  async heatmap(tenantId: string) {
    const settings = await this.getRiskSettings(tenantId);
    const risks = await this.prisma.risk.findMany({ where: { tenantId } });

    const matrix: Record<
      string,
      {
        likelihood: number;
        impact: number;
        score: number;
        color: 'green' | 'amber' | 'red';
        count: number;
        risks: {
          id: string;
          title: string;
          status: string;
          likelihood: number;
          impact: number;
          appetiteBreached: boolean;
          residualScore: number | null;
        }[];
      }
    > = {};

    for (let likelihood = 1; likelihood <= 5; likelihood += 1) {
      for (let impact = 1; impact <= 5; impact += 1) {
        const key = matrixKey(likelihood, impact);
        const score = this.computeResidualScore(likelihood, impact);
        matrix[key] = {
          likelihood,
          impact,
          score,
          color: this.determineHeatmapColor(score, settings.heatmap),
          count: 0,
          risks: []
        };
      }
    }

    risks.forEach((risk) => {
      const likelihood = risk.residualL ?? risk.inherentL;
      const impact = risk.residualI ?? risk.inherentI;
      const key = matrixKey(likelihood, impact);
      const bucket = matrix[key];
      bucket.count += 1;
      bucket.risks.push({
        id: risk.id,
        title: risk.title,
        status: risk.status,
        likelihood,
        impact,
        appetiteBreached: risk.appetiteBreached,
        residualScore: risk.residualScore ?? null
      });
    });

    return {
      matrix,
      thresholds: settings.heatmap,
      totals: {
        totalRisks: risks.length,
        appetiteBreaches: risks.filter((risk) => risk.appetiteBreached).length
      }
    };
  }
}
