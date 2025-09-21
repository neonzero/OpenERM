import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { EventsService } from '../events/events.service';
import {
  AuditTrailScope,
  AssessmentStatus

  RiskStatus
} from '@prisma/client';
import { CreateRiskDto } from './dto/create-risk.dto';
import { CreateRiskAssessmentDto } from './dto/create-risk-assessment.dto';
import { UpdateRiskStatusDto } from './dto/update-risk-status.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

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
}
