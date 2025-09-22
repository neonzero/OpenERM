import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ZodValidationPipe } from './common/pipes/zod-validation.pipe';
import { Logger as PinoLogger } from 'nestjs-pino';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true
  });

  const logger = new Logger('Bootstrap');
  const configService = app.get(ConfigService);
  const port = configService.get<number>('http.port', 3000);

  app.useLogger(app.get(PinoLogger));
  app.use(helmet());
  app.enableCors({ origin: configService.get<string>('http.corsOrigin', '*') });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ZodValidationPipe());

  await app.listen(port);
  logger.log(`🚀 API listening on port ${port}`);
}

void bootstrap();
