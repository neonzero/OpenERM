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
import { RiskService } from './risk.service';
import { paginationSchema } from '../common/dto/pagination.dto';
import { createRiskSchema } from './dto/create-risk.dto';
import { updateRiskStatusSchema } from './dto/update-risk-status.dto';
import { createRiskAssessmentSchema } from './dto/create-risk-assessment.dto';
import { AuditTrailInterceptor } from '../common/interceptors/audit-trail.interceptor';

@Controller('risks')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditTrailInterceptor)
export class RiskController {
  constructor(private readonly riskService: RiskService) {}

  @Get()
  @Roles('risk.viewer', 'risk.manager')
  async list(@CurrentUser() user: AuthenticatedUser, @Query() query: unknown) {
    const pagination = paginationSchema.parse(query);
    const result = await this.riskService.list(user.tenantId, pagination);
    return {
      ...result,
      items: result.items.map((item) => ({
        id: item.id,
        referenceId: item.referenceId,
        title: item.title,
        category: item.category.name,
        inherentScore: item.inherentScore,
        residualScore: item.residualScore,
        status: item.status,
        owner: item.owner?.displayName ?? null
      }))
    };
  }

  @Post()
  @Roles('risk.manager')
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    const dto = createRiskSchema.parse(body);
    return this.riskService.create(user.tenantId, dto, user.sub);
  }

  @Patch(':riskId/status')
  @Roles('risk.manager')
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('riskId') riskId: string,
    @Body() body: unknown
  ) {
    const dto = updateRiskStatusSchema.parse(body);
    return this.riskService.updateStatus(user.tenantId, riskId, dto, user.sub);
  }

  @Post(':riskId/assessments')
  @Roles('risk.assessor', 'risk.manager')
  createAssessment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('riskId') riskId: string,
    @Body() body: unknown
  ) {
    const dto = createRiskAssessmentSchema.parse({ ...body, riskId });
    return this.riskService.createAssessment(user.tenantId, dto, user.sub);
  }
}
