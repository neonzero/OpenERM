import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super({
      log: ['warn', 'error']
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async enableShutdownHooks(app: INestApplication): Promise<void> {
    // @ts-expect-error - beforeExit is not in the type definition but is available
    this.$on('beforeExit', async () => {
      await app.close();
    });
  }
}
