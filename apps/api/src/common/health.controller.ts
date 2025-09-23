import { Controller, Get, Post } from '@nestjs/common';
import { HealthCheckService, HttpHealthIndicator } from '@nestjs/terminus';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SAMPLE_QUEUE } from '../../queues/sample.worker';

@Controller('healthz')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly http: HttpHealthIndicator,
    @InjectQueue(SAMPLE_QUEUE) private readonly sampleQueue: Queue,
  ) {}

  @Get()
  check() {
    return this.health.check([
      () => this.http.pingCheck('self', 'http://localhost:3000/api/healthz/ping')
    ]);
  }

  @Get('ping')
  ping() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Post('enqueue')
  async enqueue() {
    await this.sampleQueue.add('sample-job', { foo: 'bar' });
    return { status: 'ok', message: 'Job enqueued' };
  }
}
