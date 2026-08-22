import { createHash } from 'node:crypto';

import { Prisma } from '@cinewrapped/database';
import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { catchError, from, type Observable, of, switchMap, throwError } from 'rxjs';

import type { AuthPrincipal } from '../auth/auth.types.js';
import { AppException } from './app.exception.js';
import { PrismaService } from '../database/prisma.service.js';

type AuthenticatedRequest = FastifyRequest & { principal?: AuthPrincipal; body?: unknown };

function requestHash(request: AuthenticatedRequest): string {
  return createHash('sha256')
    .update(
      JSON.stringify({ method: request.method, path: request.url, body: request.body ?? null }),
    )
    .digest('hex');
}

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  public constructor(private readonly prisma: PrismaService) {}

  public intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<AuthenticatedRequest>();
    const reply = http.getResponse<FastifyReply>();
    const keyHeader = request.headers['idempotency-key'];
    const key = Array.isArray(keyHeader) ? keyHeader[0] : keyHeader;
    const method = request.method.toUpperCase();

    if (
      key === undefined ||
      ['GET', 'HEAD', 'OPTIONS'].includes(method) ||
      request.principal === undefined ||
      request.url.includes('/auth/bootstrap') ||
      (method === 'DELETE' && /\/users\/me(?:\?|$)/u.test(request.url))
    ) {
      return next.handle();
    }
    if (key.length < 16 || key.length > 128 || !/^[\x21-\x7e]+$/u.test(key)) {
      throw new AppException(422, 'IDEMPOTENCY_KEY_INVALID', 'The idempotency key is invalid.');
    }

    return from(this.prepare(request.principal, key, request)).pipe(
      switchMap((prepared) => {
        if (prepared.replay !== undefined) {
          reply.status(prepared.status ?? 200);
          return of(prepared.replay);
        }
        if (prepared.recordId === null) return next.handle();
        return next.handle().pipe(
          switchMap((response) =>
            from(
              this.prisma.idempotencyRecord
                .update({
                  where: { id: prepared.recordId as string },
                  data: {
                    status: 'COMPLETED',
                    responseStatus: reply.statusCode,
                    responseJson:
                      response === undefined
                        ? Prisma.JsonNull
                        : (response as Prisma.InputJsonValue),
                  },
                })
                .catch(() => undefined),
            ).pipe(switchMap(() => of(response))),
          ),
          catchError((error: unknown) => {
            return from(
              this.prisma.idempotencyRecord
                .update({
                  where: { id: prepared.recordId as string },
                  data: {
                    status: 'FAILED',
                    errorCode: error instanceof AppException ? error.code : 'REQUEST_FAILED',
                  },
                })
                .catch(() => undefined),
            ).pipe(switchMap(() => throwError(() => error)));
          }),
        );
      }),
    );
  }

  private async prepare(
    principal: AuthPrincipal,
    key: string,
    request: AuthenticatedRequest,
  ): Promise<{ recordId: string | null; replay?: unknown; status?: number }> {
    const user = await this.prisma.user.findFirst({
      where: { authSubject: principal.subject, deletedAt: null },
      select: { id: true },
    });
    if (user === null) return { recordId: null };

    const hash = requestHash(request);
    const existing = await this.prisma.idempotencyRecord.findUnique({
      where: { userId_idempotencyKey: { userId: user.id, idempotencyKey: key } },
    });
    if (existing !== null) {
      if (
        existing.requestMethod !== request.method ||
        existing.requestPath !== request.url ||
        existing.requestHash !== hash
      ) {
        throw new AppException(
          409,
          'IDEMPOTENCY_KEY_REUSED',
          'This idempotency key was already used for a different request.',
        );
      }
      if (existing.status === 'COMPLETED') {
        return {
          recordId: existing.id,
          replay: existing.responseJson ?? null,
          status: existing.responseStatus ?? 200,
        };
      }
      if (existing.status === 'IN_PROGRESS') {
        throw new AppException(
          409,
          'IDEMPOTENCY_REQUEST_IN_PROGRESS',
          'The original request is still being processed. Retry shortly.',
        );
      }
      await this.prisma.idempotencyRecord.delete({ where: { id: existing.id } });
    }

    try {
      const created = await this.prisma.idempotencyRecord.create({
        data: {
          userId: user.id,
          idempotencyKey: key,
          requestMethod: request.method,
          requestPath: request.url,
          requestHash: hash,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
        select: { id: true },
      });
      return { recordId: created.id };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return this.prepare(principal, key, request);
      }
      throw error;
    }
  }
}
