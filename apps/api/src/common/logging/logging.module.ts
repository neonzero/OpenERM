import { LoggerModule } from 'nestjs-pino';
import { Module } from '@nestjs/common';
import { v4 as uuid } from 'uuid';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        genReqId: (req) => req.headers['x-request-id']?.toString() ?? uuid(),
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: { colorize: true, singleLine: true }
              }
            : undefined,
        autoLogging: true,
        customProps: (_req, res) => ({
          traceId: res.getHeader('x-trace-id')
        })
      }
    })
  ],
  exports: [LoggerModule]
})
export class LoggingModule {}
