import { Prisma } from '@cinewrapped/database';
import {
  Catch,
  HttpException,
  HttpStatus,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

import { AppException } from './app.exception.js';

interface ErrorDescriptor {
  status: number;
  code: string;
  message: string;
  details: Record<string, unknown> | null;
}

function describeException(exception: unknown): ErrorDescriptor {
  if (exception instanceof AppException) {
    return {
      status: exception.getStatus(),
      code: exception.code,
      message: exception.message,
      details: exception.details,
    };
  }
  if (exception instanceof ZodError) {
    return {
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      code: 'VALIDATION_FAILED',
      message: 'The request contains invalid values.',
      details: { issues: exception.issues },
    };
  }
  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    if (exception.code === 'P2002') {
      return {
        status: HttpStatus.CONFLICT,
        code: 'RESOURCE_CONFLICT',
        message: 'A unique value is already in use.',
        details: null,
      };
    }
    if (exception.code === 'P2025') {
      return {
        status: HttpStatus.NOT_FOUND,
        code: 'RESOURCE_NOT_FOUND',
        message: 'The requested resource was not found.',
        details: null,
      };
    }
  }
  if (exception instanceof HttpException) {
    return {
      status: exception.getStatus(),
      code: 'HTTP_ERROR',
      message: exception.message,
      details: null,
    };
  }
  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred.',
    details: null,
  };
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  public catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<FastifyRequest>();
    const reply = context.getResponse<FastifyReply>();
    const descriptor = describeException(exception);
    const requestId = request.id;

    void reply.status(descriptor.status).send({
      success: false,
      error: {
        code: descriptor.code,
        message: descriptor.message,
        details: descriptor.details,
        requestId,
      },
    });
  }
}
