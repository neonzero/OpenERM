import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { EventsService } from '../events/events.service';

@Injectable()
export class TaxonomyService {
  constructor(private readonly prisma: PrismaService, private readonly events: EventsService) {}

  async updateTaxonomy(tenantId: string, taxonomyId: string, data: any, actorId?: string | null) {
    const taxonomy = await this.prisma.taxonomy.findFirst({
      where: { id: taxonomyId, tenantId },
    });

    if (!taxonomy) {
      throw new NotFoundException('Taxonomy not found');
    }

    const updatedTaxonomy = await this.prisma.taxonomy.update({
      where: { id: taxonomyId },
      data,
    });

    await this.events.record(tenantId, {
      actorId: actorId ?? null,
      entity: 'taxonomy',
      entityId: taxonomyId,
      type: 'taxonomy.updated',
      diff: data,
    });

    return updatedTaxonomy;
  }
}
