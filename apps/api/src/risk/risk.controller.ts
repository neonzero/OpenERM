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
import { createRiskQuestionnaireSchema } from './dto/create-risk-questionnaire.dto';
import { submitQuestionnaireResponseSchema } from './dto/submit-questionnaire-response.dto';
import { createRiskIndicatorSchema } from './dto/create-risk-indicator.dto';
import { recordRiskIndicatorSchema } from './dto/record-risk-indicator.dto';
import { createMitigationSchema } from './dto/create-mitigation.dto';
import { updateMitigationStatusSchema } from './dto/update-mitigation-status.dto';
import { importRisksSchema } from './dto/import-risks.dto';

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

  @Get('dashboard')
  @Roles('risk.viewer', 'risk.manager')
  dashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.riskService.dashboard(user.tenantId);
  }

  @Post()
  @Roles('risk.manager')
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    const dto = createRiskSchema.parse(body);
    return this.riskService.create(user.tenantId, dto, user.sub);
  }

  @Post('import')
  @Roles('risk.manager')
  import(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    const dto = importRisksSchema.parse(body);
    return this.riskService.importRisks(user.tenantId, dto, user.sub);
  }

  @Get('export')
  @Roles('risk.manager', 'risk.viewer')
  export(@CurrentUser() user: AuthenticatedUser) {
    return this.riskService.exportRisks(user.tenantId);
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

  @Post(':riskId/mitigations')
  @Roles('risk.manager')
  createMitigation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('riskId') riskId: string,
    @Body() body: unknown
  ) {
    const dto = createMitigationSchema.parse(body);
    return this.riskService.createMitigation(user.tenantId, riskId, dto, user.sub);
  }

  @Patch('mitigations/:mitigationId/status')
  @Roles('risk.manager')
  updateMitigation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('mitigationId') mitigationId: string,
    @Body() body: unknown
  ) {
    const dto = updateMitigationStatusSchema.parse(body);
    return this.riskService.updateMitigationStatus(user.tenantId, mitigationId, dto, user.sub);
  }

  @Post(':riskId/indicators')
  @Roles('risk.manager')
  createIndicator(
    @CurrentUser() user: AuthenticatedUser,
    @Param('riskId') riskId: string,
    @Body() body: unknown
  ) {
    const dto = createRiskIndicatorSchema.parse(body);
    return this.riskService.createIndicator(user.tenantId, riskId, dto, user.sub);
  }

  @Post('indicators/:indicatorId/record')
  @Roles('risk.manager', 'risk.viewer')
  recordIndicator(
    @CurrentUser() user: AuthenticatedUser,
    @Param('indicatorId') indicatorId: string,
    @Body() body: unknown
  ) {
    const dto = recordRiskIndicatorSchema.parse(body);
    return this.riskService.recordIndicatorUpdate(user.tenantId, indicatorId, dto, user.sub);
  }

  @Post('questionnaires')
  @Roles('risk.manager')
  createQuestionnaire(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    const dto = createRiskQuestionnaireSchema.parse(body);
    return this.riskService.createQuestionnaire(user.tenantId, dto, user.sub);
  }

  @Post('questionnaires/:questionnaireId/respond')
  @Roles('risk.owner', 'risk.viewer', 'risk.manager')
  respond(
    @CurrentUser() user: AuthenticatedUser,
    @Param('questionnaireId') questionnaireId: string,
    @Body() body: unknown
  ) {
    const dto = submitQuestionnaireResponseSchema.parse(body);
    return this.riskService.submitQuestionnaireResponse(user.tenantId, questionnaireId, dto, user.sub);
  }
}
