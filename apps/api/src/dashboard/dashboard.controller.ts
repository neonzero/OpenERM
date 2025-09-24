import { Controller, Get, Param } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get(':tenantId')
  getDashboardData(@Param('tenantId') tenantId: string) {
    return this.dashboardService.getDashboardData(tenantId);
  }
}
