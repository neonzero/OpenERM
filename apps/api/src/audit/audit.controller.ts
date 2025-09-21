import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { AuditService } from './audit.service';
import { paginationSchema } from '../common/dto/pagination.dto';
import { createEngagementSchema } from './dto/create-engagement.dto';
import { updateEngagementStatusSchema } from './dto/update-engagement-status.dto';
import { createWorkpaperSchema } from './dto/create-workpaper.dto';
import { createFindingSchema } from './dto/create-finding.dto';
import { createRecommendationSchema } from './dto/create-recommendation.dto';
import { AuditTrailInterceptor } from '../common/interceptors/audit-trail.interceptor';
import { createAuditPlanSchema } from './dto/create-audit-plan.dto';
import { addPlanItemSchema } from './dto/add-plan-item.dto';
import { recordTimesheetSchema } from './dto/record-timesheet.dto';
import { updateTimesheetStatusSchema } from './dto/update-timesheet-status.dto';
import { createRacmEntrySchema } from './dto/create-racm-entry.dto';
import { createProgramSchema } from './dto/create-program.dto';
import { createFollowUpSchema } from './dto/create-follow-up.dto';
import { generateReportSchema } from './dto/generate-report.dto';

@Controller('audits')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditTrailInterceptor)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('dashboard')
  @Roles('audit.viewer', 'audit.manager')
  dashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.auditService.dashboard(user.tenantId);
  }

  @Get('engagements')
  @Roles('audit.viewer', 'audit.manager')
  listEngagements(@CurrentUser() user: AuthenticatedUser, @Query() query: unknown) {
    const dto = paginationSchema.parse(query);
    return this.auditService.listEngagements(user.tenantId, dto);
  }

  @Post('engagements')
  @Roles('audit.manager')
  createEngagement(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    const dto = createEngagementSchema.parse(body);
    return this.auditService.createEngagement(user.tenantId, dto, user.sub);
  }

  @Patch('engagements/:engagementId/status')
  @Roles('audit.manager')
  updateEngagementStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('engagementId') engagementId: string,
    @Body() body: unknown
  ) {
    const dto = updateEngagementStatusSchema.parse(body);
    return this.auditService.updateEngagementStatus(user.tenantId, engagementId, dto, user.sub);
  }

  @Post('engagements/:engagementId/workpapers')
  @Roles('audit.manager', 'auditor')
  createWorkpaper(
    @CurrentUser() user: AuthenticatedUser,
    @Param('engagementId') engagementId: string,
    @Body() body: unknown
  ) {
    const dto = createWorkpaperSchema.parse(body);
    return this.auditService.createWorkpaper(user.tenantId, engagementId, dto, user.sub);
  }

  @Post('engagements/:engagementId/findings')
  @Roles('audit.manager', 'auditor')
  createFinding(
    @CurrentUser() user: AuthenticatedUser,
    @Param('engagementId') engagementId: string,
    @Body() body: unknown
  ) {
    const dto = createFindingSchema.parse(body);
    return this.auditService.createFinding(user.tenantId, engagementId, dto, user.sub);
  }

  @Post('findings/:findingId/recommendations')
  @Roles('audit.manager', 'auditor')
  createRecommendation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('findingId') findingId: string,
    @Body() body: unknown
  ) {
    const dto = createRecommendationSchema.parse(body);
    return this.auditService.createRecommendation(user.tenantId, findingId, dto, user.sub);
  }

  @Post('plans')
  @Roles('audit.manager')
  createPlan(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    const dto = createAuditPlanSchema.parse(body);
    return this.auditService.createAuditPlan(user.tenantId, dto, user.sub);
  }

  @Post('plans/:planId/items')
  @Roles('audit.manager')
  addPlanItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('planId') planId: string,
    @Body() body: unknown
  ) {
    const dto = addPlanItemSchema.parse(body);
    return this.auditService.addPlanItem(user.tenantId, planId, dto, user.sub);
  }

  @Post('timesheets')
  @Roles('audit.manager', 'auditor')
  recordTimesheet(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    const dto = recordTimesheetSchema.parse(body);
    return this.auditService.recordTimesheet(user.tenantId, user.sub, dto, user.sub);
  }

  @Patch('timesheets/:timesheetId/status')
  @Roles('audit.manager')
  updateTimesheetStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('timesheetId') timesheetId: string,
    @Body() body: unknown
  ) {
    const dto = updateTimesheetStatusSchema.parse(body);
    return this.auditService.updateTimesheetStatus(user.tenantId, timesheetId, dto, user.sub);
  }

  @Post('engagements/:engagementId/racm')
  @Roles('audit.manager', 'auditor')
  createRacm(
    @CurrentUser() user: AuthenticatedUser,
    @Param('engagementId') engagementId: string,
    @Body() body: unknown
  ) {
    const dto = createRacmEntrySchema.parse(body);
    return this.auditService.createRacmEntry(user.tenantId, engagementId, dto, user.sub);
  }

  @Post('engagements/:engagementId/program')
  @Roles('audit.manager')
  createProgram(
    @CurrentUser() user: AuthenticatedUser,
    @Param('engagementId') engagementId: string,
    @Body() body: unknown
  ) {
    const dto = createProgramSchema.parse(body);
    return this.auditService.createProgram(user.tenantId, engagementId, dto, user.sub);
  }

  @Post('follow-ups')
  @Roles('audit.manager', 'auditor')
  createFollowUp(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    const dto = createFollowUpSchema.parse(body);
    return this.auditService.createFollowUp(user.tenantId, dto, user.sub);
  }

  @Post('reports/generate')
  @Roles('audit.manager', 'audit.viewer')
  generateReport(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    const dto = generateReportSchema.parse(body);
    return this.auditService.generateReport(user.tenantId, dto, user.sub);
  }
}
