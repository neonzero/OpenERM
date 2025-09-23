import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Request } from 'express';
import { Observable, tap } from 'rxjs';
import { AuditTrailScope } from '@prisma/client';
import { toPrismaInputJson } from '../utils/prisma-json';

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

        const scopeHeader = request.headers['x-audit-scope']?.toString();
        const normalizedScope = scopeHeader?.replace(/[-\s]/g, '_').toUpperCase();
        const scope =
          normalizedScope && (Object.values(AuditTrailScope) as string[]).includes(normalizedScope)
            ? (normalizedScope as AuditTrailScope)
            : AuditTrailScope.ENGAGEMENT;
        const entityId = request.headers['x-entity-id']?.toString() ?? 'unknown';
        const entityType = request.headers['x-entity-type']?.toString() ?? request.route?.path ?? 'unknown';

        await this.prisma.auditTrailEvent.create({
          data: {
            tenantId: user.tenantId,
            actorId: user.sub,
            scope,
            entityId,
            entityType,
            action: `${request.method} ${request.originalUrl}`,
            metadata: toPrismaInputJson({
              statusCode: response.statusCode,
              response: responseBody ?? null
            })
          }
        });
      })
    );
  }
}
