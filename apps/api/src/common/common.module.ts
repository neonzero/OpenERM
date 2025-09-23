import { Global, Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { LoggingModule } from './logging/logging.module';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health.controller';
import { RolesGuard } from './guards/roles.guard';
import { AuditTrailInterceptor } from './interceptors/audit-trail.interceptor';

@Global()
@Module({
  imports: [LoggingModule, PrismaModule, TerminusModule],
  providers: [RolesGuard, AuditTrailInterceptor],
  controllers: [HealthController],
  exports: [LoggingModule, PrismaModule, RolesGuard, AuditTrailInterceptor]
})
export class CommonModule {}
