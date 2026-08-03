import type { ApiEnvironment } from '@cinewrapped/config';
import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';

import { API_ENVIRONMENT } from '../config/environment.module.js';

@Injectable()
export class CacheService implements OnModuleDestroy {
  readonly #redis: Redis;

  public constructor(@Inject(API_ENVIRONMENT) environment: ApiEnvironment) {
    this.#redis = new Redis(environment.REDIS_URL, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 1_500,
    });
    this.#redis.on('error', () => undefined);
  }

  public async remember<T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
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

  public async consume(key: string, limit: number, windowSeconds: number): Promise<boolean> {
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
      return true;
    }
  }

  public onModuleDestroy(): void {
    if (this.#redis.status !== 'end') this.#redis.disconnect();
  }
}
