import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { RiskModule } from './risk/risk.module';
import { CommonModule } from './common/common.module';
import { QueuesModule } from './queues/queues.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [() => ({})], // Removed undefined 'configuration' reference
    }),
    CommonModule,
    AuthModule,
    RiskModule,
    AuditModule,
    QueuesModule,
    DashboardModule,
  ],
})
export class AppModule {}
