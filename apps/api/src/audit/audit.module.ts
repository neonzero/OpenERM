import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { EventsModule } from '../events/events.module';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';

@Module({
  imports: [PrismaModule, EventsModule],
  providers: [AuditService],
  controllers: [AuditController]
})
export class AuditModule {}
