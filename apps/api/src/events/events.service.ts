import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { toPrismaInputJson } from '../common/utils/prisma-json';


@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(
    tenantId: string,
    params: {
      actorId?: string | null;
      entity: string;
      entityId: string;
      type: string;
      diff: unknown;
    }
  ): Promise<void> {
    await this.prisma.event.create({
      data: {
        tenantId,
        actorId: params.actorId ?? null,
        entity: params.entity,
        entityId: params.entityId,
        type: params.type,
        diff: toPrismaInputJson(params.diff)
      }
    });

    this.logger.debug(`Recorded event ${params.type} for ${params.entity}#${params.entityId}`);

  }
}
