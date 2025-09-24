import { Body, Controller, Headers, Param, Patch } from '@nestjs/common';
import { TaxonomyService } from './taxonomy.service';

@Controller('tenants/:tenantId/taxonomies')
export class TaxonomyController {
  constructor(private readonly taxonomyService: TaxonomyService) {}

  @Patch(':taxonomyId')
  async updateTaxonomy(
    @Param('tenantId') tenantId: string,
    @Param('taxonomyId') taxonomyId: string,
    @Body() body: any,
    @Headers('x-user-id') actorId?: string,
  ) {
    return this.taxonomyService.updateTaxonomy(tenantId, taxonomyId, body, actorId ?? null);
  }
}
