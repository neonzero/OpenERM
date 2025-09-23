import { Body, Controller, Headers, Param, Post, Get } from '@nestjs/common';
import { AuditService } from './audit.service';
import { upsertAuditUniverseSchema } from './dto/upsert-audit-universe.dto';
import { createAuditPlanSchema } from './dto/create-audit-plan.dto';
import { createEngagementSchema } from './dto/create-engagement.dto';
import { upsertRacmSchema } from './dto/upsert-racm.dto';
import { createWorkpaperSchema } from './dto/create-workpaper.dto';
import { createFindingSchema } from './dto/create-finding.dto';
import { createFollowUpSchema } from './dto/create-follow-up.dto';
import { generateReportSchema } from './dto/generate-report.dto';

@Controller()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('tenants/:tenantId/engagements')
  listEngagements(@Param('tenantId') tenantId: string) {
    return this.auditService.listEngagements(tenantId);
  }

  @Get('tenants/:tenantId/audit-dashboard')
  dashboard(@Param('tenantId') tenantId: string) {
    return this.auditService.dashboard(tenantId);
  }

  @Post('tenants/:tenantId/audit-universe')
  upsertUniverse(
    @Param('tenantId') tenantId: string,
    @Body() body: unknown,
    @Headers('x-user-id') actorId?: string
  ) {
    const dto = upsertAuditUniverseSchema.parse(body);
    return this.auditService.upsertAuditUniverse(tenantId, dto, actorId ?? null);
  }

  @Post('tenants/:tenantId/audit-plans')
  createPlan(
    @Param('tenantId') tenantId: string,
    @Body() body: unknown,
    @Headers('x-user-id') actorId?: string
  ) {
    const dto = createAuditPlanSchema.parse(body);
    return this.auditService.createPlan(tenantId, dto, actorId ?? null);
  }

  @Post('tenants/:tenantId/engagements')
  createEngagement(
    @Param('tenantId') tenantId: string,
    @Body() body: unknown,
    @Headers('x-user-id') actorId?: string
  ) {
    const dto = createEngagementSchema.parse(body);
    return this.auditService.createEngagement(tenantId, dto, actorId ?? null);
  }

  @Post('engagements/:engagementId/racm')
  upsertRacm(
    @Param('engagementId') engagementId: string,
    @Body() body: unknown,
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') actorId?: string
  ) {
    const dto = upsertRacmSchema.parse(body);
    return this.auditService.upsertRacm(tenantId, engagementId, dto, actorId ?? null);
  }

  @Post('engagements/:engagementId/working-papers')
  addWorkpaper(
    @Param('engagementId') engagementId: string,
    @Body() body: unknown,
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') actorId?: string
  ) {
    const dto = createWorkpaperSchema.parse(body);
    return this.auditService.addWorkpaper(tenantId, engagementId, dto, actorId ?? null);
  }

  @Post('engagements/:engagementId/findings')
  createFinding(
    @Param('engagementId') engagementId: string,
    @Body() body: unknown,
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') actorId?: string
  ) {
    const dto = createFindingSchema.parse(body);
    return this.auditService.createFinding(tenantId, engagementId, dto, actorId ?? null);
  }

  @Post('findings/:findingId/follow-up')
  recordFollowUp(
    @Param('findingId') findingId: string,
    @Body() body: unknown,
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') actorId?: string
  ) {
    const dto = createFollowUpSchema.parse(body);
    return this.auditService.recordFollowUp(tenantId, findingId, dto, actorId ?? null);
  }

  @Post('reports/generate')
  generateReport(@Body() body: unknown, @Headers('x-user-id') actorId?: string) {
    const dto = generateReportSchema.parse(body);
    return this.auditService.generateReport(dto, actorId ?? null);
  }
}
