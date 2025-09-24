import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { RiskModule } from './risk/risk.module';
import { CommonModule } from './common/common.module';
import { QueuesModule } from './queues/queues.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { TaxonomyModule } from './taxonomy/taxonomy.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [() => ({})], // Removed undefined 'configuration' reference
    }),
    EventEmitterModule.forRoot(),
    CommonModule,
    AuthModule,
    RiskModule,
    AuditModule,
    QueuesModule,
    DashboardModule,
    TaxonomyModule,
  ],
})
export class AppModule {}
