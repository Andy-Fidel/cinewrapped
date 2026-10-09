import 'reflect-metadata';
import type {
  CollectionResponse,
  LibraryItem,
  SuccessResponse,
  UserPreferences,
} from '@cinewrapped/shared-types';
import { LibraryController } from '../src/library/library.controller.js';
import { LibraryService } from '../src/library/library.service.js';
import type { MediaProvider } from '../src/media-provider/media-provider.types.js';
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
    throw new Error('Library and goals tests require an isolated local database ending in _test.');
}

describe.runIf(databaseUrl !== undefined)('library browsing and viewing goals', () => {
  const db = new PrismaClient({
    datasourceUrl: databaseUrl ?? 'postgresql://unused:unused@localhost/unused_test',
  });
  const prisma = db as unknown as PrismaService;
  const ownerId = randomUUID();
  const otherId = randomUUID();
  const principal = {
    subject: `library-${ownerId}`,
    sessionId: `library-session-${ownerId}`,
  } as AuthPrincipal;
  const mediaIds = Array.from({ length: 63 }, () => randomUUID());
  let http: NestFastifyApplication;
  beforeAll(async () => {
    for (const id of [ownerId, otherId]) {
      await db.user.create({
        data: {
          id,
          authSubject: `library-${id}`,
          email: `${id}@example.test`,
          emailNormalized: `${id}@example.test`,
          username: id.slice(0, 20),
          usernameNormalized: id.slice(0, 20),
          displayName: 'Library test',
          countryCode: 'GH',
          preferredLanguage: 'en-US',
          timezone: 'Africa/Accra',
          preferences: { create: { defaultCountryForStreaming: 'GH' } },
        },
      });
    }
    for (const [i, id] of mediaIds.entries()) {
      await db.media.create({
        data: {
          id,
          externalProvider: 'TMDB',
          externalId: id,
          mediaType: i % 2 ? 'TV' : 'MOVIE',
          title: i === 0 ? '100% Film' : `Title ${String(Math.floor(i / 2)).padStart(3, '0')}`,
          originalTitle: 'Fixture',
        },
      });
      await db.watchHistory.create({
        data: {
          id,
          userId: ownerId,
          mediaId: id,
          status: i % 3 === 0 ? 'COMPLETED' : 'WATCHING',
          updatedAt: new Date('2026-01-01T00:00:00Z'),
        },
      });
    }
    await db.watchHistory.create({
      data: { userId: otherId, mediaId: mediaIds[0]!, status: 'PLANNED' },
    });
    await db.authSession.create({ data: { id: principal.sessionId, userId: ownerId } });
    Reflect.defineMetadata('design:paramtypes', [UsersService], UsersController);
    Reflect.defineMetadata('design:paramtypes', [LibraryService], LibraryController);
    @Module({
      controllers: [UsersController, LibraryController],
      providers: [
        { provide: LibraryService, useValue: new LibraryService(prisma, {} as MediaProvider) },
        { provide: UsersService, useValue: new UsersService(prisma) },
      ],
    })
    class LibraryTransportModule {}
    http = await NestFactory.create<NestFastifyApplication>(
      LibraryTransportModule,
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
    await http.close();
    await db.user.deleteMany({ where: { id: { in: [ownerId, otherId] } } });
    await db.media.deleteMany({ where: { id: { in: mediaIds } } });
    await db.$disconnect();
  });
  const headers = { authorization: 'Bearer fixture-owner' };
  it.each(['RECENT', 'OLDEST', 'TITLE_ASC', 'TITLE_DESC'])(
    'pages all 63 titles without duplicates using %s',
    async (sort) => {
      const ids: string[] = [];
      const titles: string[] = [];
      let cursor: string | null = null;
      do {
        const response = await http.inject({
          method: 'GET',
          url: `/api/v1/library?limit=17&sort=${sort}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
          headers,
        });
        expect(response.statusCode).toBe(200);
        const page: CollectionResponse<LibraryItem> = response.json();
        ids.push(...page.data.map((item: { media: { id: string } }) => item.media.id));
        titles.push(...page.data.map((item) => item.media.title));
        cursor = page.meta.page.nextCursor;
        expect(ids.length).toBeLessThanOrEqual(63);
      } while (cursor);
      expect(new Set(ids).size).toBe(63);
      if (sort.startsWith('TITLE'))
        expect(titles).toEqual(
          [...titles].sort((a, b) =>
            sort === 'TITLE_ASC' ? a.localeCompare(b) : b.localeCompare(a),
          ),
        );
      else
        expect(ids).toEqual(
          [...ids].sort((a, b) => (sort === 'OLDEST' ? a.localeCompare(b) : b.localeCompare(a))),
        );
    },
  );
  it('combines filters, searches across the library and treats wildcard input literally', async () => {
    const result = await http.inject({
      method: 'GET',
      url: '/api/v1/library?q=title&mediaType=TV&status=WATCHING&sort=TITLE_ASC',
      headers,
    });
    expect(result.statusCode).toBe(200);
    expect(result.json<CollectionResponse<LibraryItem>>().data.length).toBeGreaterThan(0);
    for (const item of result.json<CollectionResponse<LibraryItem>>().data) {
      expect(item.media.mediaType).toBe('TV');
      expect(item.status).toBe('WATCHING');
      expect(item.media.title).toMatch(/^Title/u);
    }
    const literal = await http.inject({ method: 'GET', url: '/api/v1/library?q=%25', headers });
    expect(
      literal
        .json<CollectionResponse<LibraryItem>>()
        .data.map((item: { media: { title: string } }) => item.media.title),
    ).toEqual(['100% Film']);
    const last = await http.inject({
      method: 'GET',
      url: '/api/v1/library?q=Title%20031',
      headers,
    });
    expect(last.json<CollectionResponse<LibraryItem>>().data).toHaveLength(1);
  });
  it('rejects invalid/reused cursors and anonymous library reads', async () => {
    const first = await http.inject({ method: 'GET', url: '/api/v1/library?limit=1', headers });
    for (const suffix of ['&sort=TITLE_ASC', '&status=COMPLETED', '&q=title']) {
      const response = await http.inject({
        method: 'GET',
        url: `/api/v1/library?cursor=${first.json<CollectionResponse<LibraryItem>>().meta.page.nextCursor}${suffix}`,
        headers,
      });
      expect(response.statusCode).toBe(400);
    }
    expect(
      (await http.inject({ method: 'GET', url: '/api/v1/library?cursor=invalid', headers }))
        .statusCode,
    ).toBe(400);
    expect((await http.inject({ method: 'GET', url: '/api/v1/library' })).statusCode).toBe(401);
  });
  it('persists and clears personal goals without altering other preferences or owners', async () => {
    const saved = await http.inject({
      method: 'PATCH',
      url: '/api/v1/users/me/preferences',
      headers,
      payload: { annualViewingGoal: 150, monthlyViewingGoal: 12, userId: otherId },
    });
    expect(saved.statusCode).toBe(200);
    const reloaded = await http.inject({
      method: 'GET',
      url: '/api/v1/users/me/preferences',
      headers,
    });
    expect(reloaded.json<SuccessResponse<UserPreferences>>().data).toMatchObject({
      annualViewingGoal: 150,
      monthlyViewingGoal: 12,
      theme: 'SYSTEM',
    });
    expect(await db.userPreferences.findUnique({ where: { userId: otherId } })).toMatchObject({
      annualViewingGoal: null,
      monthlyViewingGoal: null,
    });
    const cleared = await http.inject({
      method: 'PATCH',
      url: '/api/v1/users/me/preferences',
      headers,
      payload: { annualViewingGoal: null },
    });
    expect(cleared.json<SuccessResponse<UserPreferences>>().data).toMatchObject({
      annualViewingGoal: null,
      monthlyViewingGoal: 12,
    });
  });
  it.each([0, -1, 1.5, 10001, '100'])('rejects an invalid goal %s', async (value) => {
    const response = await http.inject({
      method: 'PATCH',
      url: '/api/v1/users/me/preferences',
      headers,
      payload: { annualViewingGoal: value },
    });
    expect(response.statusCode).toBe(422);
  });
  it('rejects anonymous goal updates and enforces ranges below the API', async () => {
    const response = await http.inject({
      method: 'PATCH',
      url: '/api/v1/users/me/preferences',
      payload: { annualViewingGoal: 100 },
    });
    expect(response.statusCode).toBe(401);
    await expect(
      db.userPreferences.update({
        where: { userId: ownerId },
        data: { annualViewingGoal: 0 },
      }),
    ).rejects.toThrow();
    await expect(
      db.userPreferences.update({
        where: { userId: ownerId },
        data: { monthlyViewingGoal: 10001 },
      }),
    ).rejects.toThrow();
  });
});
