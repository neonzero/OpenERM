import { Injectable } from '@nestjs/common';
import { RiskService } from '../risk/risk.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly riskService: RiskService,
    private readonly auditService: AuditService,
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
}
