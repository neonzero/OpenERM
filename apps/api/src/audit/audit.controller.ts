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
import { paginationSchema } from '../common/dto/pagination.dto';
import { createEngagementSchema } from './dto/create-engagement.dto';
import { updateEngagementStatusSchema } from './dto/update-engagement-status.dto';
import { createWorkpaperSchema } from './dto/create-workpaper.dto';
import { createFindingSchema } from './dto/create-finding.dto';
import { createRecommendationSchema } from './dto/create-recommendation.dto';
import { AuditService } from './audit.service';
import { AuditTrailInterceptor } from '../common/interceptors/audit-trail.interceptor';

@Controller('audits')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditTrailInterceptor)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('engagements')
  @Roles('audit.viewer', 'audit.manager')
  async listEngagements(@CurrentUser() user: AuthenticatedUser, @Query() query: unknown) {
    const pagination = paginationSchema.parse(query);
    const result = await this.auditService.listEngagements(user.tenantId, pagination);
    return {
      ...result,
      items: result.items.map((item) => ({
        id: item.id,
        name: item.name,
        status: item.status,
        startDate: item.startDate,
        owner: item.owner ? { id: item.owner.id, displayName: item.owner.displayName } : null
      }))
    };
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
  @Roles('audit.manager', 'audit.staff')
  createWorkpaper(
    @CurrentUser() user: AuthenticatedUser,
    @Param('engagementId') engagementId: string,
    @Body() body: unknown
  ) {
    const dto = createWorkpaperSchema.parse(body);
    return this.auditService.createWorkpaper(user.tenantId, engagementId, dto, user.sub);
  }

  @Post('engagements/:engagementId/findings')
  @Roles('audit.manager')
  createFinding(
    @CurrentUser() user: AuthenticatedUser,
    @Param('engagementId') engagementId: string,
    @Body() body: unknown
  ) {
    const dto = createFindingSchema.parse(body);
    return this.auditService.createFinding(user.tenantId, engagementId, dto, user.sub);
  }

  @Post('findings/:findingId/recommendations')
  @Roles('audit.manager', 'audit.staff')
  createRecommendation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('findingId') findingId: string,
    @Body() body: unknown
  ) {
    const dto = createRecommendationSchema.parse(body);
    return this.auditService.createRecommendation(user.tenantId, findingId, dto, user.sub);
  }
}
