import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { RiskService } from './risk.service';

@Injectable()
export class RiskEventHandler {
  constructor(private readonly riskService: RiskService) {}

  @OnEvent('audit.finding.created')
  async handleAuditFindingCreated(payload: { severity: string; riskId: string; tenantId: string }) {
    if (payload.severity === 'High' && payload.riskId) {
      await this.riskService.updateRiskFromFinding(payload.tenantId, payload.riskId);
    }
  }

  @OnEvent('audit.finding.closed')
  async handleAuditFindingClosed(payload: { severity: string; riskId: string; tenantId: string }) {
    if (payload.riskId) {
      await this.riskService.updateRiskScoresFromFinding(payload.tenantId, payload.riskId, payload.severity);
      await this.riskService.updateControlEffectivenessFromFinding(payload.tenantId, payload.riskId);
    }
  }

  @OnEvent('governance.risk_appetite.adjusted')
  async handleRiskAppetiteAdjusted(payload: { tenantId: string }) {
    await this.riskService.calibrateRiskModels(payload.tenantId);
  }
}
