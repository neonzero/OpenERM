import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { RiskService } from './risk.service';
import { riskQuerySchema } from './dto/risk-query.dto';
import { createRiskSchema } from './dto/create-risk.dto';
import { createRiskAssessmentSchema } from './dto/create-risk-assessment.dto';
import { createRiskQuestionnaireSchema } from './dto/create-risk-questionnaire.dto';
import { createTreatmentSchema } from './dto/create-treatment.dto';

@Controller()
export class RiskController {
  constructor(private readonly riskService: RiskService) {}

  @Get('tenants/:tenantId/risks')
  list(@Param('tenantId') tenantId: string, @Query() query: unknown) {
    const filters = riskQuerySchema.parse(query);
    return this.riskService.list(tenantId, filters);
  }

  @Post('tenants/:tenantId/risks')
  create(
    @Param('tenantId') tenantId: string,
    @Body() body: unknown,
    @Headers('x-user-id') actorId?: string
  ) {
    const dto = createRiskSchema.parse(body);
    return this.riskService.create(tenantId, dto, actorId ?? null);
  }

  @Post('tenants/:tenantId/assessments')
  createAssessment(
    @Param('tenantId') tenantId: string,
    @Body() body: unknown,
    @Headers('x-user-id') actorId?: string
  ) {
    const dto = createRiskAssessmentSchema.parse(body);
    return this.riskService.createAssessment(tenantId, dto, actorId ?? null);
  }

  @Post('tenants/:tenantId/treatments')
  createTreatment(
    @Param('tenantId') tenantId: string,
    @Body() body: unknown,
    @Headers('x-user-id') actorId?: string
  ) {
    const dto = createTreatmentSchema.parse(body);
    return this.riskService.createTreatment(tenantId, dto, actorId ?? null);
  }

  @Post('tenants/:tenantId/questionnaires')
  createQuestionnaire(
    @Param('tenantId') tenantId: string,
    @Body() body: unknown,
    @Headers('x-user-id') actorId?: string
  ) {
    const dto = createRiskQuestionnaireSchema.parse(body);
    return this.riskService.createQuestionnaire(tenantId, dto, actorId ?? null);
  }

  @Get('tenants/:tenantId/risk-heatmap')
  heatmap(@Param('tenantId') tenantId: string) {
    return this.riskService.heatmap(tenantId);
  }
}
