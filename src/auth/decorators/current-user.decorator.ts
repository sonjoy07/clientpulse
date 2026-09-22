import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { Role } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  organizationId: string;
  clientId?: string | null;
}

export const CurrentUser = createParamDecorator(
  (
    data: keyof AuthenticatedUser | undefined,
    ctx: ExecutionContext,
  ): unknown => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user) {
      return null;
    }
    return data ? user[data] : user;
  },
);
