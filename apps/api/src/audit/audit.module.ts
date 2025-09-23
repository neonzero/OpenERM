import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { EventsModule } from '../events/events.module';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { DeterministicPlanningProvider } from './planning/planning.provider';

@Module({
  imports: [PrismaModule, EventsModule],
  providers: [AuditService, DeterministicPlanningProvider],
  controllers: [AuditController]
})
export class AuditModule {}
