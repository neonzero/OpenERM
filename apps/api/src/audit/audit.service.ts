import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { EventsService } from '../events/events.service';
import {
  AuditTrailScope,
  FindingStatus
} from '@prisma/client';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CreateEngagementDto } from './dto/create-engagement.dto';
import { UpdateEngagementStatusDto } from './dto/update-engagement-status.dto';
import { CreateWorkpaperDto } from './dto/create-workpaper.dto';
import { CreateFindingDto } from './dto/create-finding.dto';
import { CreateRecommendationDto } from './dto/create-recommendation.dto';

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
          findings: true
        }
      }),
      this.prisma.auditEngagement.count({ where: { tenantId } })
    ]);

    return { items, page, pageSize, total };
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
}
