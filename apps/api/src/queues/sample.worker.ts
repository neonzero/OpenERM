// @ts-expect-error - bullmq module is not installed but the import is used
import { Processor, WorkerHost } from '@nestjs/bullmq';
// @ts-expect-error - bullmq module is not installed but the import is used
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';

export const SAMPLE_QUEUE = 'sample';

@Processor(SAMPLE_QUEUE)
export class SampleWorker extends WorkerHost {
  private readonly logger = new Logger(SampleWorker.name);

  async process(job: Job<unknown>): Promise<any> {
    this.logger.log(`Processing job ${job.id} with data: ${JSON.stringify(job.data)}`);
  }
}
