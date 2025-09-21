import { CallHandler, ExecutionContext } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { AuditTrailScope } from '@prisma/client';
import { of, lastValueFrom } from 'rxjs';
import { AuditTrailInterceptor } from '../src/common/interceptors/audit-trail.interceptor';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('AuditTrailInterceptor', () => {
  const createExecutionContext = (request: unknown, response: unknown): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response
      })
    } as unknown as ExecutionContext;
  };

  it('records an audit trail entry with normalized scope metadata', async () => {
    const create = jest.fn();
    const prisma = { auditTrailEvent: { create } } as unknown as PrismaService;
    const interceptor = new AuditTrailInterceptor(prisma);

    const request = {
      headers: {
        'x-audit-scope': 'risk',
        'x-entity-id': 'risk-123',
        'x-entity-type': 'risk'
      },
      user: {
        tenantId: 'tenant-1',
        sub: 'user-1'
      },
      method: 'POST',
      originalUrl: '/risks',
      route: { path: '/risks' }
    };

    const response = { statusCode: 201 };

    const next: CallHandler = {
      handle: () => of({ ok: true })
    };

    const result$ = interceptor.intercept(createExecutionContext(request, response), next);

    await lastValueFrom(result$);
    await new Promise((resolve) => setImmediate(resolve));

    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant-1',
        actorId: 'user-1',
        scope: AuditTrailScope.RISK,
        entityId: 'risk-123',
        entityType: 'risk',
        action: 'POST /risks',
        metadata: expect.objectContaining({
          statusCode: 201,
          response: { ok: true }
        })
      })
    });
  });

  it('skips persistence when no tenant scope is available', async () => {
    const create = jest.fn();
    const prisma = { auditTrailEvent: { create } } as unknown as PrismaService;
    const interceptor = new AuditTrailInterceptor(prisma);

    const request = {
      headers: {},
      user: {},
      method: 'GET',
      originalUrl: '/healthz'
    };

    const response = { statusCode: 200 };

    const next: CallHandler = {
      handle: () => of({ healthy: true })
    };

    const result$ = interceptor.intercept(createExecutionContext(request, response), next);

    await lastValueFrom(result$);
    await new Promise((resolve) => setImmediate(resolve));

    expect(create).not.toHaveBeenCalled();
  });
});
