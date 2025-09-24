import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { EventsModule } from '../events/events.module';
import { TaxonomyService } from './taxonomy.service';
import { TaxonomyController } from './taxonomy.controller';

@Module({
  imports: [PrismaModule, EventsModule],
  providers: [TaxonomyService],
  controllers: [TaxonomyController],
})
export class TaxonomyModule {}
