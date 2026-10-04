import type { ApiEnvironment } from '@cinewrapped/config';
import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';

import { API_ENVIRONMENT } from '../config/environment.module.js';
import { PrismaService } from '../database/prisma.service.js';

@Injectable()
export class CacheService implements OnModuleDestroy {
  readonly #redis: Redis | null;

  public constructor(
    @Inject(API_ENVIRONMENT) environment: ApiEnvironment,
    private readonly prisma: PrismaService,
  ) {
    this.#redis = environment.REDIS_URL
      ? new Redis(environment.REDIS_URL, {
          lazyConnect: true,
          enableOfflineQueue: false,
          maxRetriesPerRequest: 1,
          connectTimeout: 1_500,
        })
      : null;
    this.#redis?.on('error', () => undefined);
  }

  public async remember<T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
    if (this.#redis === null) return this.rememberInDatabase(key, ttlSeconds, load);
    try {
      if (this.#redis.status === 'wait') await this.#redis.connect();
      const cached = await this.#redis.get(`cinewrapped:v1:${key}`);
      if (cached !== null) return JSON.parse(cached) as T;
    } catch {
      // Redis is an optimization boundary. Provider requests remain available during cache incidents.
    }
    const value = await load();
    try {
      await this.#redis.set(`cinewrapped:v1:${key}`, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      // A cache write failure must not fail an otherwise valid provider response.
    }
    return value;
  }

  public async consume(
    key: string,
    limit: number,
    windowSeconds: number,
    failClosed = false,
  ): Promise<boolean> {
    if (this.#redis === null) {
      try {
        // One atomic statement enforces the same window across every function instance.
        const rows = await this.prisma.$queryRaw<{ count: number }[]>`
          INSERT INTO cinewrapped_internal.rate_limits AS counters (key, count, expires_at)
          VALUES (${key}, 1, NOW() + ${windowSeconds} * INTERVAL '1 second')
          ON CONFLICT (key) DO UPDATE SET
            count = CASE WHEN counters.expires_at <= NOW() THEN 1 ELSE counters.count + 1 END,
            expires_at = CASE WHEN counters.expires_at <= NOW()
              THEN NOW() + ${windowSeconds} * INTERVAL '1 second' ELSE counters.expires_at END
          RETURNING count
        `;
        return rows[0] !== undefined && rows[0].count <= limit;
      } catch {
        return !failClosed;
      }
    }
    try {
      if (this.#redis.status === 'wait') await this.#redis.connect();
      const count = await this.#redis.eval(
        "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n",
        1,
        `cinewrapped:v1:rate:${key}`,
        String(windowSeconds),
      );
      return typeof count === 'number' && count <= limit;
    } catch {
      return !failClosed;
    }
  }

  public onModuleDestroy(): void {
    if (this.#redis !== null && this.#redis.status !== 'end') this.#redis.disconnect();
  }

  private async rememberInDatabase<T>(
    key: string,
    ttlSeconds: number,
    load: () => Promise<T>,
  ): Promise<T> {
    try {
      const rows = await this.prisma.$queryRaw<{ value: T }[]>`
        SELECT value FROM cinewrapped_internal.cache_entries
        WHERE key = ${key} AND expires_at > NOW()
      `;
      if (rows[0] !== undefined) return rows[0].value;
    } catch {
      // Provider reads remain available when the optional cache is unavailable.
    }
    const value = await load();
    try {
      await this.prisma.$executeRaw`
        INSERT INTO cinewrapped_internal.cache_entries (key, value, expires_at)
        VALUES (${key}, ${JSON.stringify(value)}::jsonb, NOW() + ${ttlSeconds} * INTERVAL '1 second')
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, expires_at = EXCLUDED.expires_at
      `;
    } catch {
      // Cache failures do not fail a successful provider response.
    }
    return value;
  }
}
