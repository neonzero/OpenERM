import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(private readonly emitter: EventEmitter2) {}

  emit<T>(event: string, payload: T): void {
    this.logger.debug(`Emitting event ${event}`);
    this.emitter.emit(event, payload);
  }
}
