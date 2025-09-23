import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TerminusModule } from '@nestjs/terminus';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { RiskModule } from './risk/risk.module';
import { CommonModule } from './common/common.module';
import configuration from './config/configuration';

import { QueuesModule } from './queues/queues.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    EventEmitterModule.forRoot(),
    TerminusModule,
    CommonModule,
    AuthModule,
    RiskModule,
    AuditModule,
    QueuesModule
  ]
})
export class AppModule {}
