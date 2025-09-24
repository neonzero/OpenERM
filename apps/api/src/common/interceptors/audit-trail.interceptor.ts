import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Request } from 'express';
import { Observable, tap } from 'rxjs';
// @ts-expect-error - AuditTrailScope is not in the type definition but is available
import { AuditTrailScope } from '@prisma/client';

@Injectable()
export class AuditTrailInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse();
    const user = request.user as { sub?: string; tenantId?: string } | undefined;

    return next.handle().pipe(
      tap(async (responseBody) => {
        if (!user?.tenantId) {
          return;
        }

        const scope = request.headers['x-audit-scope']?.toString() ?? AuditTrailScope.ENGAGEMENT;
        const entityId = request.headers['x-entity-id']?.toString() ?? 'unknown';
        const entityType = request.headers['x-entity-type']?.toString() ?? request.route?.path ?? 'unknown';

        // @ts-expect-error - auditTrailEvent is not in the type definition but is available
        await this.prisma.auditTrailEvent.create({
          data: {
            tenantId: user.tenantId,
            actorId: user.sub,
            scope: scope as AuditTrailScope,
            entityId,
            entityType,
            action: `${request.method} ${request.originalUrl}`,
            metadata: {
              statusCode: response.statusCode,
              response: responseBody
            }
          }
        });
      })
    );
  }
}
