import { Module, forwardRef } from '@nestjs/common';
import { RiskController } from './risk.controller';
import { RiskService } from './risk.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { EventsModule } from '../events/events.module';
import { RiskEventHandler } from './risk.event-handler';
import { TaxonomyEventHandler } from './taxonomy.event-handler';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, EventsModule, forwardRef(() => AuditModule)],
  controllers: [RiskController],
  providers: [RiskService, RiskEventHandler, TaxonomyEventHandler],
  exports: [RiskService],
})
export class RiskModule {}
