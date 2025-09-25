import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { RiskModule } from '../risk/risk.module';
import { AuditModule } from '../audit/audit.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [RiskModule, AuditModule, EventsModule],
  providers: [DashboardService],
  controllers: [DashboardController],
})
export class DashboardModule {}
