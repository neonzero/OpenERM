import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { CreateRiskDto } from './dto/create-risk.dto';
import { CreateRiskAssessmentDto } from './dto/create-risk-assessment.dto';
import { CreateRiskQuestionnaireDto } from './dto/create-risk-questionnaire.dto';
import { CreateTreatmentDto } from './dto/create-treatment.dto';
import { RiskQueryDto } from './dto/risk-query.dto';

const matrixKey = (likelihood: number, impact: number) => `L${likelihood}_I${impact}`;

@Injectable()
export class RiskService {
  constructor(private readonly prisma: PrismaService, private readonly events: EventsService) {}

  async list(tenantId: string, query: RiskQueryDto) {
    const { page, pageSize, search, status, ownerId } = query;
    const where: Prisma.RiskWhereInput = {
      tenantId,
      ...(status ? { status } : {}),
      ...(ownerId ? { ownerId } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
              { tags: { has: search } }
            ]
          }
        : {})
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.risk.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
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

    return { items, page, pageSize, total };
  }

  async create(tenantId: string, dto: CreateRiskDto, actorId?: string | null) {
    const residualL = dto.residualLikelihood ?? dto.inherentLikelihood;
    const residualI = dto.residualImpact ?? dto.inherentImpact;

    const risk = await this.prisma.risk.create({
      data: {
        tenantId,
        title: dto.title,
        description: dto.description ?? null,
        taxonomy: dto.taxonomy ?? [],
        cause: dto.cause ?? null,
        consequence: dto.consequence ?? null,
        ownerId: dto.ownerId ?? null,
        inherentL: dto.inherentLikelihood,
        inherentI: dto.inherentImpact,
        residualL,
        residualI,
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
    const risk = await this.prisma.risk.findFirst({ where: { id: dto.riskId, tenantId } });
    if (!risk) {
      throw new NotFoundException('Risk not found');
    }

    const bucket = matrixKey(dto.scores.likelihood, dto.scores.impact);
    const residualScore =
      dto.scores.residualLikelihood && dto.scores.residualImpact
        ? dto.scores.residualLikelihood * dto.scores.residualImpact
        : null;

    const assessment = await this.prisma.assessment.create({
      data: {
        tenantId,
        riskId: dto.riskId,
        method: dto.method,
        criteriaConfig: dto.criteriaConfig ?? null,
        scores: dto.scores,
        residualScore,
        matrixBucket: bucket,
        reviewerId: dto.reviewerId ?? null,
        approvedAt: dto.reviewerId ? new Date() : null
      }
    });

    const riskUpdate: Prisma.RiskUpdateInput = {
      residualL: dto.scores.residualLikelihood ?? risk.residualL ?? dto.scores.likelihood,
      residualI: dto.scores.residualImpact ?? risk.residualI ?? dto.scores.impact
    };

    if (residualScore && dto.scores.appetiteThreshold) {
      riskUpdate.appetiteBreached = residualScore > dto.scores.appetiteThreshold;
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

  async heatmap(tenantId: string) {
    const risks = await this.prisma.risk.findMany({ where: { tenantId } });

    const matrix: Record<
      string,
      {
        likelihood: number;
        impact: number;
        count: number;
        risks: {
          id: string;
          title: string;
          status: string;
          likelihood: number;
          impact: number;
          appetiteBreached: boolean;
        }[];
      }
    > = {};

    for (let likelihood = 1; likelihood <= 5; likelihood += 1) {
      for (let impact = 1; impact <= 5; impact += 1) {
        const key = matrixKey(likelihood, impact);
        matrix[key] = {
          likelihood,
          impact,
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
        appetiteBreached: risk.appetiteBreached
      });
    });

    return {
      matrix,
      totals: {
        totalRisks: risks.length,
        appetiteBreaches: risks.filter((risk) => risk.appetiteBreached).length
      }
    };
  }
}
