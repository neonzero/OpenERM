import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { RiskService } from './risk.service';

@Injectable()
export class TaxonomyEventHandler {
  constructor(private readonly riskService: RiskService) {}

  @OnEvent('taxonomy.updated')
  async handleTaxonomyUpdated(payload: { tenantId: string; taxonomyId: string }) {
    await this.riskService.updateRiskAssessmentFramework(payload.tenantId, payload.taxonomyId);
  }
}
