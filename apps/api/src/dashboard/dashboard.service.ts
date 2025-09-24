import { Injectable } from '@nestjs/common';
import { RiskService } from '../risk/risk.service';
import { AuditService } from '../audit/audit.service';
import { EventsService } from '../events/events.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly riskService: RiskService,
    private readonly auditService: AuditService,
    private readonly events: EventsService,
  ) {}

  async getDashboardData(tenantId: string) {
    const [riskHeatmap, auditDashboard] = await Promise.all([
      this.riskService.heatmap(tenantId),
      this.auditService.dashboard(tenantId),
    ]);

    return {
      riskHeatmap,
      auditDashboard,
    };
  }

  async adjustRiskAppetite(tenantId: string) {
    // TODO: Implement logic to adjust risk appetite based on dashboard metrics
    console.log(`Adjusting risk appetite for tenant ${tenantId}`);

    await this.events.record(tenantId, {
      entity: 'governance',
      entityId: tenantId,
      type: 'governance.risk_appetite.adjusted',
      diff: { },
    });
  }
}
