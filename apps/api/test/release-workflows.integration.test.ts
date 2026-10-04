import 'reflect-metadata';
import { parseWorkerEnvironment } from '@cinewrapped/config';
import { WorkerService } from '@cinewrapped/worker';
import { Module } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AuthGuard } from '../src/auth/auth.guard.js';
import type { SupabaseJwtVerifier } from '../src/auth/supabase-jwt-verifier.js';
import { AppException } from '../src/common/app.exception.js';
import { ApiExceptionFilter } from '../src/common/api-exception.filter.js';
import { DataTransferController } from '../src/data-transfer/data-transfer.controller.js';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@cinewrapped/database';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AuthPrincipal } from '../src/auth/auth.types.js';
import type { PrismaService } from '../src/database/prisma.service.js';
import type { MediaCatalogService } from '../src/media-provider/media-catalog.service.js';
import type { MediaProvider } from '../src/media-provider/media-provider.types.js';
import { DataTransferService } from '../src/data-transfer/data-transfer.service.js';
import {
  AccountExportService,
  exportCollections,
} from '../src/data-transfer/account-export.service.js';
import { LibraryService } from '../src/library/library.service.js';
import { SocialService } from '../src/social/social.service.js';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (databaseUrl) {
  const url = new URL(databaseUrl);
  if (!['localhost', '127.0.0.1', '::1'].includes(url.hostname) || !url.pathname.endsWith('_test'))
    throw new Error('Release tests require an isolated local database ending in _test.');
}
describe.runIf(databaseUrl !== undefined)('release workflows against PostgreSQL', () => {
  const db = new PrismaClient({
    datasourceUrl: databaseUrl ?? 'postgresql://unused:unused@localhost/unused_test',
  });
  const prisma = db as unknown as PrismaService;
  const ownerId = randomUUID();
  const otherId = randomUUID();
  const mediaId = randomUUID();
  const subject = `release-${ownerId}`;
  const principal = { subject, sessionId: `release-session-${ownerId}` } as AuthPrincipal;
  let http: NestFastifyApplication;
  const catalog = {
    search: () => Promise.resolve([{ id: mediaId, title: 'Arrival' }]),
  } as unknown as MediaCatalogService;
  const transfer = new DataTransferService(prisma, catalog);
  beforeAll(async () => {
    for (const id of [ownerId, otherId])
      await db.user.create({
        data: {
          id,
          authSubject: id === ownerId ? subject : `release-${id}`,
          email: `${id}@example.test`,
          emailNormalized: `${id}@example.test`,
          username: id.slice(0, 20),
          usernameNormalized: id.slice(0, 20),
          displayName: 'Release test',
          countryCode: 'US',
          preferredLanguage: 'en-US',
          timezone: 'UTC',
        },
      });
    await db.authSession.create({ data: { id: principal.sessionId, userId: ownerId } });
    await db.media.create({
      data: {
        id: mediaId,
        externalProvider: 'TMDB',
        externalId: mediaId,
        mediaType: 'MOVIE',
        title: 'Arrival',
        originalTitle: 'Arrival',
        releaseYear: 2016,
      },
    });
    // Vitest's transformer omits constructor metadata; match TypeScript's emitted runtime metadata.
    Reflect.defineMetadata(
      'design:paramtypes',
      [DataTransferService, AccountExportService],
      DataTransferController,
    );
    @Module({
      controllers: [DataTransferController],
      providers: [
        { provide: DataTransferService, useValue: transfer },
        { provide: AccountExportService, useValue: new AccountExportService(prisma) },
      ],
    })
    class TestTransportModule {}
    http = await NestFactory.create<NestFastifyApplication>(
      TestTransportModule,
      new FastifyAdapter(),
      { logger: false },
    );
    http.setGlobalPrefix('api/v1');
    const verifier = {
      verify: (token: string) =>
        token === 'fixture-owner'
          ? Promise.resolve(principal)
          : Promise.reject(new AppException(401, 'AUTH_TOKEN_INVALID', 'The token is invalid.')),
    } as unknown as SupabaseJwtVerifier;
    http.useGlobalGuards(new AuthGuard(new Reflector(), verifier, prisma));
    http.useGlobalFilters(new ApiExceptionFilter());
    await http.init();
    await http.getHttpAdapter().getInstance().ready();
  });
  afterAll(async () => {
    await http?.close();
    await db.outboxEvent.deleteMany({ where: { aggregateId: { in: [ownerId, otherId] } } });
    const notifications = await db.notification.findMany({
      where: { userId: { in: [ownerId, otherId] } },
      select: { id: true },
    });
    await db.outboxEvent.deleteMany({
      where: { aggregateId: { in: notifications.map((row) => row.id) } },
    });
    await db.user.deleteMany({ where: { id: { in: [ownerId, otherId] } } });
    await db.media.delete({ where: { id: mediaId } });
    await db.$disconnect();
  });
  it('enforces authentication and input validation over HTTP before creating a job', async () => {
    const unauthorized = await http.inject({
      method: 'GET',
      url: '/api/v1/data-transfer/export?collection=profile',
    });
    expect(unauthorized.statusCode).toBe(401);
    const bad = await http.inject({
      method: 'POST',
      url: '/api/v1/data-transfer/imports',
      headers: { authorization: 'Bearer fixture-owner' },
      payload: { entries: [{ title: 'Arrival', isRewatch: false, rating: 99 }] },
    });
    expect(bad.statusCode).toBe(422);
    expect(await db.outboxEvent.count({ where: { aggregateId: ownerId } })).toBe(0);
    const valid = await http.inject({
      method: 'GET',
      url: `/api/v1/data-transfer/export?collection=profile&userId=${otherId}`,
      headers: { authorization: 'Bearer fixture-owner' },
    });
    expect(valid.statusCode).toBe(200);
    const response = valid.json<{ data: { records: Array<{ id: string }> } }>();
    expect(response.data.records[0]?.id).toBe(ownerId);
  });
  it('rolls back row writes when checkpoint persistence fails, then resumes safely', async () => {
    const input = {
      entries: [
        {
          title: 'Arrival',
          releaseYear: 2016,
          isRewatch: false,
          watchedDate: '2026-09-01',
          rating: 4,
          review: 'A private imported review.',
        },
      ],
    };
    const started = await transfer.startImport(principal, input);
    const job = await db.outboxEvent.findUniqueOrThrow({ where: { id: started.id } });
    await expect(transfer.processImport({ ...job, id: randomUUID() })).rejects.toThrow();
    expect(await db.viewing.count({ where: { userId: ownerId } })).toBe(0);
    expect(await db.review.count({ where: { userId: ownerId } })).toBe(0);
    expect(await transfer.processImport(job)).toBe(false);
    await db.outboxEvent.update({ where: { id: job.id }, data: { status: 'PUBLISHED' } });
    const repeated = await transfer.startImport(principal, input);
    await transfer.processImport(
      await db.outboxEvent.findUniqueOrThrow({ where: { id: repeated.id } }),
    );
    expect(await db.viewing.count({ where: { userId: ownerId } })).toBe(1);
    expect(await db.review.count({ where: { userId: ownerId, visibility: 'PRIVATE' } })).toBe(1);
    expect(
      (
        await db.watchHistory.findUniqueOrThrow({
          where: { userId_mediaId: { userId: ownerId, mediaId } },
        })
      ).watchCount,
    ).toBe(1);
    await db.outboxEvent.update({ where: { id: repeated.id }, data: { status: 'PUBLISHED' } });
  });
  it('accepts concurrent offline redelivery once and rejects reuse for different input', async () => {
    const library = new LibraryService(prisma, {} as MediaProvider);
    const input = {
      clientOperationId: randomUUID(),
      watchedAt: '2026-10-04T12:00:00Z',
      completed: true,
    };
    const rows = await Promise.all([
      library.logViewing(principal, mediaId, input),
      library.logViewing(principal, mediaId, input),
    ]);
    expect(rows[0].id).toBe(rows[1].id);
    expect(
      await db.viewing.count({
        where: { userId: ownerId, clientOperationId: input.clientOperationId },
      }),
    ).toBe(1);
    expect(
      (
        await db.watchHistory.findUniqueOrThrow({
          where: { userId_mediaId: { userId: ownerId, mediaId } },
        })
      ).watchCount,
    ).toBe(2);
    await expect(
      library.logViewing(principal, mediaId, { ...input, watchedAt: '2026-10-03T12:00:00Z' }),
    ).rejects.toMatchObject({ code: 'OPERATION_ID_CONFLICT' });
  });
  it('exports every supported collection while enforcing ownership and excluding credentials', async () => {
    await db.rating.create({ data: { userId: otherId, mediaId, ratingValue: 1, ratingScale: 5 } });
    const exporter = new AccountExportService(prisma);
    for (const collection of exportCollections) {
      const page = await exporter.page(principal, { collection });
      expect(JSON.stringify(page.records)).not.toContain(`release-${otherId}`);
      if (collection === 'ratings') expect(page.records).toHaveLength(1);
      if (collection === 'profile') {
        expect(page.records[0]).not.toHaveProperty('authSubject');
        expect(page.records[0]).not.toHaveProperty('pushDevices');
      }
    }
    expect(await transfer.imports({ subject: `release-${otherId}` } as AuthPrincipal)).toEqual([]);
  });
  it('gives older due work priority over an import-style requeued event', async () => {
    const requeuedId = randomUUID();
    const waitingId = randomUUID();
    await db.outboxEvent.createMany({
      data: [
        {
          id: requeuedId,
          aggregateType: 'release-test',
          aggregateId: ownerId,
          eventType: 'system.healthcheck',
          payloadJson: {},
          createdAt: new Date('1990-01-01'),
          availableAt: new Date('2000-01-01'),
        },
        {
          id: waitingId,
          aggregateType: 'release-test',
          aggregateId: ownerId,
          eventType: 'system.healthcheck',
          payloadJson: {},
          createdAt: new Date('1995-01-01'),
          availableAt: new Date('1995-01-01'),
        },
      ],
    });
    const environment = parseWorkerEnvironment({
      DATABASE_URL: databaseUrl,
      NODE_ENV: 'test',
      TMDB_API_TOKEN: 'fixture-token-not-used',
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SECRET_KEY: 'fixture-secret-not-used',
      OUTBOX_BATCH_SIZE: '1',
    });
    expect(await new WorkerService(environment).runScheduledBatch()).toEqual({
      processed: 1,
      failed: 0,
    });
    expect((await db.outboxEvent.findUniqueOrThrow({ where: { id: waitingId } })).status).toBe(
      'PUBLISHED',
    );
    expect((await db.outboxEvent.findUniqueOrThrow({ where: { id: requeuedId } })).status).toBe(
      'PENDING',
    );
    await db.outboxEvent.update({ where: { id: requeuedId }, data: { status: 'PUBLISHED' } });
  });
  it('commits friend requests with one notification and a per-device durable push job', async () => {
    await db.pushDevice.create({
      data: {
        userId: otherId,
        installationId: 'release-test',
        platform: 'IOS',
        pushTokenHash: randomUUID(),
        encryptedToken: 'encrypted-test-fixture',
        lastSeenAt: new Date(),
      },
    });
    const social = new SocialService(prisma);
    await social.createFriendship(principal, otherId);
    await social.createFriendship(principal, otherId);
    const notifications = await db.notification.findMany({
      where: { userId: otherId, type: 'FRIEND_REQUEST' },
    });
    expect(notifications).toHaveLength(1);
    const notification = notifications[0];
    if (!notification) throw new Error('Missing notification.');
    expect(
      await db.outboxEvent.count({
        where: { aggregateId: notification.id, eventType: 'notification.push' },
      }),
    ).toBe(1);
  });
});
