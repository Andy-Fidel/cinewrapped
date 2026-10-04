import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@cinewrapped/database';
import { Module } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AuthGuard } from '../src/auth/auth.guard.js';
import type { AuthPrincipal } from '../src/auth/auth.types.js';
import type { SupabaseJwtVerifier } from '../src/auth/supabase-jwt-verifier.js';
import { ApiExceptionFilter } from '../src/common/api-exception.filter.js';
import { AppException } from '../src/common/app.exception.js';
import type { PrismaService } from '../src/database/prisma.service.js';
import { UsersController } from '../src/users/users.controller.js';
import { UsersService } from '../src/users/users.service.js';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (databaseUrl) {
  const url = new URL(databaseUrl);
  if (!['localhost', '127.0.0.1', '::1'].includes(url.hostname) || !url.pathname.endsWith('_test'))
    throw new Error('Theme tests require an isolated local database ending in _test.');
}

describe.runIf(databaseUrl !== undefined)('saved appearance preferences', () => {
  const db = new PrismaClient({
    datasourceUrl: databaseUrl ?? 'postgresql://unused:unused@localhost/unused_test',
  });
  const prisma = db as unknown as PrismaService;
  const ownerId = randomUUID();
  const otherId = randomUUID();
  const principal = {
    subject: `theme-${ownerId}`,
    sessionId: `theme-session-${ownerId}`,
  } as AuthPrincipal;
  let http: NestFastifyApplication;
  beforeAll(async () => {
    for (const id of [ownerId, otherId]) {
      await db.user.create({
        data: {
          id,
          authSubject: `theme-${id}`,
          email: `${id}@example.test`,
          emailNormalized: `${id}@example.test`,
          username: id.slice(0, 20),
          usernameNormalized: id.slice(0, 20),
          displayName: 'Theme test',
          countryCode: 'GH',
          preferredLanguage: 'en-US',
          timezone: 'Africa/Accra',
          preferences: { create: { defaultCountryForStreaming: 'GH' } },
        },
      });
    }
    await db.authSession.create({ data: { id: principal.sessionId, userId: ownerId } });
    Reflect.defineMetadata('design:paramtypes', [UsersService], UsersController);
    @Module({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: new UsersService(prisma) }],
    })
    class ThemeTransportModule {}
    http = await NestFactory.create<NestFastifyApplication>(
      ThemeTransportModule,
      new FastifyAdapter(),
      { logger: false },
    );
    http.setGlobalPrefix('api/v1');
    const verifier = {
      verify: (token: string) =>
        token === 'fixture-owner'
          ? Promise.resolve(principal)
          : Promise.reject(new AppException(401, 'AUTH_TOKEN_INVALID', 'Invalid fixture token.')),
    } as unknown as SupabaseJwtVerifier;
    http.useGlobalGuards(new AuthGuard(new Reflector(), verifier, prisma));
    http.useGlobalFilters(new ApiExceptionFilter());
    await http.init();
    await http.getHttpAdapter().getInstance().ready();
  });
  afterAll(async () => {
    await http?.close();
    await db.user.deleteMany({ where: { id: { in: [ownerId, otherId] } } });
    await db.$disconnect();
  });
  it.each(['OCEAN', 'FOREST', 'AMETHYST', 'ROSE', 'SUNSET'])(
    'round-trips %s through HTTP and PostgreSQL without changing another account',
    async (theme) => {
      const saved = await http.inject({
        method: 'PATCH',
        url: '/api/v1/users/me/preferences',
        headers: { authorization: 'Bearer fixture-owner' },
        payload: { theme, userId: otherId },
      });
      expect(saved.statusCode).toBe(200);
      expect(saved.json()).toMatchObject({ data: { theme } });
      const reloaded = await http.inject({
        method: 'GET',
        url: '/api/v1/users/me/preferences',
        headers: { authorization: 'Bearer fixture-owner' },
      });
      expect(reloaded.json()).toMatchObject({
        data: { theme, defaultCountryForStreaming: 'GH', preferredRatingSystem: 'FIVE_STAR' },
      });
      expect(
        (await db.userPreferences.findUniqueOrThrow({ where: { userId: otherId } })).theme,
      ).toBe('SYSTEM');
    },
  );
  it('rejects anonymous changes and unknown themes while preserving the saved choice', async () => {
    const previous = await db.userPreferences.findUniqueOrThrow({ where: { userId: ownerId } });
    const anonymous = await http.inject({
      method: 'PATCH',
      url: '/api/v1/users/me/preferences',
      payload: { theme: 'LIGHT' },
    });
    expect(anonymous.statusCode).toBe(401);
    const invalid = await http.inject({
      method: 'PATCH',
      url: '/api/v1/users/me/preferences',
      headers: { authorization: 'Bearer fixture-owner' },
      payload: { theme: 'NEON' },
    });
    expect(invalid.statusCode).toBe(422);
    expect((await db.userPreferences.findUniqueOrThrow({ where: { userId: ownerId } })).theme).toBe(
      previous.theme,
    );
  });
  it.each(['SYSTEM', 'LIGHT', 'DARK'])(
    'keeps the original %s preference working',
    async (theme) => {
      const saved = await http.inject({
        method: 'PATCH',
        url: '/api/v1/users/me/preferences',
        headers: { authorization: 'Bearer fixture-owner' },
        payload: { theme },
      });
      expect(saved.statusCode).toBe(200);
      expect(saved.json()).toMatchObject({ data: { theme } });
    },
  );
});
