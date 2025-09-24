import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { EventsModule } from '../events/events.module';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { RiskModule } from '../risk/risk.module';

@Module({
  imports: [PrismaModule, EventsModule, forwardRef(() => RiskModule)],
  providers: [AuditService],
  controllers: [AuditController],
  exports: [AuditService],
})
export class AuditModule {}
