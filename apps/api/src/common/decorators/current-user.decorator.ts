import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export interface AuthenticatedUser {
  sub: string;
  tenantId: string;
  roles: string[];
  email?: string;
  displayName?: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user as AuthenticatedUser | undefined;
  }
);
