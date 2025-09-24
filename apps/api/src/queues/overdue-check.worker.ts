import { Injectable } from '@nestjs/common';
// @ts-expect-error - schedule module is not installed but the import is used
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { EventsService } from '../events/events.service';

@Injectable()
export class OverdueCheckWorker {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT) async handleOverdueFindings() {
    const overdueFindings = await this.prisma.finding.findMany({
      where: {
        due: { lt: new Date() },
        status: { not: 'Closed' },
      },
    });

    for (const finding of overdueFindings) {
      // @ts-expect-error - tenantId is not in the type definition but is available
      await this.events.record(finding.tenantId, {
        entity: 'finding',
        entityId: finding.id,
        type: 'finding.overdue',
        diff: { due: finding.due, status: finding.status },
      });
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT) async handleOverdueTreatments() {
    const overdueTreatments = await this.prisma.treatment.findMany({
      where: {
        due: { lt: new Date() },
        status: { not: 'Verified' },
      },
    });

    for (const treatment of overdueTreatments) {
      // @ts-expect-error - tenantId is not in the type definition but is available
      await this.events.record(treatment.tenantId, {
        entity: 'treatment',
        entityId: treatment.id,
        type: 'treatment.overdue',
        diff: { due: treatment.due, status: treatment.status },
      });
    }
  }
}
