import { Controller, Get, Param, Post } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('tenants/:tenantId/dashboard')
  getDashboardData(@Param('tenantId') tenantId: string) {
    return this.dashboardService.getDashboardData(tenantId);
  }

  @Post('tenants/:tenantId/dashboard/adjust-risk-appetite')
  adjustRiskAppetite(@Param('tenantId') tenantId: string) {
    return this.dashboardService.adjustRiskAppetite(tenantId);
  }
}
