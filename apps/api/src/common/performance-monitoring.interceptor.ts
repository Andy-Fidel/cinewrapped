import {
  Injectable,
  Logger,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class PerformanceMonitoringInterceptor implements NestInterceptor {
  private readonly logger = new Logger('PerformanceMonitor');

  public intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const start = process.hrtime.bigint();
    const http = context.switchToHttp();
    const request = http.getRequest<FastifyRequest>();
    const response = http.getResponse<FastifyReply>();

    const path = request.url;
    const method = request.method;

    return next.handle().pipe(
      tap({
        next: () => {
          const end = process.hrtime.bigint();
          const durationNs = Number(end - start);
          const durationMs = Math.round((durationNs / 1_000_000) * 100) / 100;

          // Set standard Server-Timing and X-Response-Time headers
          try {
            response.header('Server-Timing', `total;dur=${durationMs};desc="Total execution time"`);
            response.header('X-Response-Time', `${durationMs}ms`);
          } catch {
            // Headers already sent
          }

          // Performance threshold alerting
          const isSearch = path.includes('/search') || path.includes('/discover');
          const thresholdMs = isSearch ? 300 : 500;

          if (durationMs > thresholdMs) {
            this.logger.warn(
              `⚡ SLOW REQUEST [${method} ${path}] took ${durationMs}ms (Threshold: ${thresholdMs}ms)`,
            );
          }
        },
        error: (err) => {
          const end = process.hrtime.bigint();
          const durationMs = Math.round((Number(end - start) / 1_000_000) * 100) / 100;
          try {
            response.header('X-Response-Time', `${durationMs}ms`);
          } catch {
            // Ignore
          }
        },
      }),
    );
  }
}
