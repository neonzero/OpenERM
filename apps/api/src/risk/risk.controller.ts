import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { RiskService } from './risk.service';
import { riskQuerySchema } from './dto/risk-query.dto';
import { createRiskSchema } from './dto/create-risk.dto';
import { createRiskAssessmentSchema } from './dto/create-risk-assessment.dto';
import { createRiskQuestionnaireSchema } from './dto/create-risk-questionnaire.dto';
import { createTreatmentSchema } from './dto/create-treatment.dto';
import { importRisksSchema } from './dto/import-risks.dto';
import { updateTreatmentStatusSchema } from './dto/update-treatment-status.dto';
import { markKeyRiskSchema } from './dto/mark-key-risk.dto';
import { createIndicatorSchema } from './dto/create-indicator.dto';
import { recordIndicatorReadingSchema } from './dto/record-indicator-reading.dto';
import { submitQuestionnaireResponseSchema } from './dto/submit-questionnaire-response.dto';
import { indicatorTrendQuerySchema } from './dto/indicator-trend-query.dto';

const kriTrendReportSchema = indicatorTrendQuerySchema.extend({
  indicatorId: z.string().cuid()
});

@Controller()
export class RiskController {
  constructor(private readonly riskService: RiskService) {}

  @Get('tenants/:tenantId/risks/:riskId')
  get(@Param('tenantId') tenantId: string, @Param('riskId') riskId: string) {
    return this.riskService.get(tenantId, riskId);
  }

  @Get('tenants/:tenantId/risks')
  list(@Param('tenantId') tenantId: string, @Query() query: unknown) {
    const filters = riskQuerySchema.parse(query);
    return this.riskService.list(tenantId, filters);
  }

  @Get('tenants/:tenantId/risks/export')
  export(@Param('tenantId') tenantId: string, @Query() query: unknown) {
    const filters = riskQuerySchema.parse(query);
    return this.riskService.exportRisks(tenantId, filters);
  }

  @Get('tenants/:tenantId/risks/prioritized')
  prioritized(@Param('tenantId') tenantId: string) {
    return this.riskService.prioritized(tenantId);
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

  @Post('tenants/:tenantId/risks/import')
  importRisks(
    @Param('tenantId') tenantId: string,
    @Body() body: unknown,
    @Headers('x-user-id') actorId?: string
  ) {
    const dto = importRisksSchema.parse(body);
    return this.riskService.importRisks(tenantId, dto, actorId ?? null);
  }

  @Post('tenants/:tenantId/risks/:riskId/key')
  markKeyRisk(
    @Param('tenantId') tenantId: string,
    @Param('riskId') riskId: string,
    @Body() body: unknown,
    @Headers('x-user-id') actorId?: string
  ) {
    const dto = markKeyRiskSchema.parse(body);
    return this.riskService.setKeyRisk(tenantId, riskId, dto, actorId ?? null);
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

  @Post('tenants/:tenantId/treatments/:treatmentId/status')
  updateTreatmentStatus(
    @Param('tenantId') tenantId: string,
    @Param('treatmentId') treatmentId: string,
    @Body() body: unknown,
    @Headers('x-user-id') actorId?: string
  ) {
    const dto = updateTreatmentStatusSchema.parse(body);
    return this.riskService.updateTreatmentStatus(tenantId, treatmentId, dto, actorId ?? null);
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

  @Post('tenants/:tenantId/questionnaires/:questionnaireId/responses')
  submitQuestionnaireResponse(
    @Param('tenantId') tenantId: string,
    @Param('questionnaireId') questionnaireId: string,
    @Body() body: unknown,
    @Headers('x-user-id') actorId?: string
  ) {
    const dto = submitQuestionnaireResponseSchema.parse(body);
    return this.riskService.submitQuestionnaireResponse(tenantId, questionnaireId, dto, actorId ?? null);
  }

  @Post('tenants/:tenantId/indicators')
  createIndicator(
    @Param('tenantId') tenantId: string,
    @Body() body: unknown,
    @Headers('x-user-id') actorId?: string
  ) {
    const dto = createIndicatorSchema.parse(body);
    return this.riskService.createIndicator(tenantId, dto, actorId ?? null);
  }

  @Post('tenants/:tenantId/indicators/:indicatorId/readings')
  recordIndicatorReading(
    @Param('tenantId') tenantId: string,
    @Param('indicatorId') indicatorId: string,
    @Body() body: unknown,
    @Headers('x-user-id') actorId?: string
  ) {
    const dto = recordIndicatorReadingSchema.parse(body);
    return this.riskService.recordIndicatorReading(tenantId, indicatorId, dto, actorId ?? null);
  }

  @Get('tenants/:tenantId/indicators/:indicatorId/trend')
  indicatorTrend(
    @Param('tenantId') tenantId: string,
    @Param('indicatorId') indicatorId: string,
    @Query() query: unknown
  ) {
    const dto = indicatorTrendQuerySchema.parse(query);
    return this.riskService.getKriTrend(tenantId, indicatorId, dto);
  }

  @Get('tenants/:tenantId/reports/risk-register')
  riskRegister(@Param('tenantId') tenantId: string, @Query() query: unknown) {
    const filters = riskQuerySchema.parse(query);
    return this.riskService.getRiskRegisterReport(tenantId, filters);
  }

  @Get('tenants/:tenantId/reports/treatment-status')
  treatmentStatus(@Param('tenantId') tenantId: string) {
    return this.riskService.getTreatmentStatusReport(tenantId);
  }

  @Get('tenants/:tenantId/reports/kri-trend')
  kriTrend(@Param('tenantId') tenantId: string, @Query() query: unknown) {
    const dto = kriTrendReportSchema.parse(query);
    return this.riskService.getKriTrend(tenantId, dto.indicatorId, dto);
  }

  @Get('tenants/:tenantId/risk-heatmap')
  heatmap(@Param('tenantId') tenantId: string) {
    return this.riskService.heatmap(tenantId);
  }
}
