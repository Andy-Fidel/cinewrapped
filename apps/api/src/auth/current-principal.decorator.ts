import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import type { AuthPrincipal } from './auth.types.js';

type AuthenticatedRequest = FastifyRequest & { principal: AuthPrincipal };

export const CurrentPrincipal = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthPrincipal =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().principal,
);
