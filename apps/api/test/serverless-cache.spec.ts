import { describe, expect, it, vi } from 'vitest';
import type { ApiEnvironment } from '@cinewrapped/config';
import { CacheService } from '../src/cache/cache.service.js';
import type { PrismaService } from '../src/database/prisma.service.js';

describe('serverless cache', () => {
  it('returns shared cached data without a provider call', async () => {
    const prisma = { $queryRaw: vi.fn().mockResolvedValue([{ value: { title: 'Alien' } }]) };
    const load = vi.fn();
    const cache = new CacheService({} as ApiEnvironment, prisma as unknown as PrismaService);
    expect(await cache.remember('movie:1', 60, load)).toEqual({ title: 'Alien' });
    expect(load).not.toHaveBeenCalled();
  });

  it('preserves provider availability on cache failure', async () => {
    const prisma = {
      $queryRaw: vi.fn().mockRejectedValue(new Error('offline')),
      $executeRaw: vi.fn().mockRejectedValue(new Error('offline')),
    };
    const cache = new CacheService({} as ApiEnvironment, prisma as unknown as PrismaService);
    expect(await cache.remember('movie:1', 60, () => Promise.resolve({ title: 'Alien' }))).toEqual({
      title: 'Alien',
    });
  });

  it('enforces the shared counter boundary', async () => {
    const prisma = {
      $queryRaw: vi
        .fn()
        .mockResolvedValueOnce([{ count: 10 }])
        .mockResolvedValueOnce([{ count: 11 }]),
    };
    const cache = new CacheService({} as ApiEnvironment, prisma as unknown as PrismaService);
    expect(await cache.consume('ai:subject', 10, 60, true)).toBe(true);
    expect(await cache.consume('ai:subject', 10, 60, true)).toBe(false);
  });

  it('fails closed for AI limits when the database is unavailable', async () => {
    const prisma = { $queryRaw: vi.fn().mockRejectedValue(new Error('offline')) };
    const cache = new CacheService({} as ApiEnvironment, prisma as unknown as PrismaService);
    expect(await cache.consume('ai:subject', 10, 60, true)).toBe(false);
    expect(await cache.consume('search:subject', 10, 60)).toBe(true);
  });
});
