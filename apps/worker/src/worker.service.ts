import type { WorkerEnvironment } from '@cinewrapped/config';
import { Prisma, PrismaClient } from '@cinewrapped/database';
import {
  CINEWRAPPED_DEAD_LETTER_QUEUE,
  CINEWRAPPED_QUEUE,
  defaultJobOptions,
  isJobName,
  type OutboxJobPayload,
} from '@cinewrapped/jobs';
import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { type Job, Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';

import { deliverPush } from './push-delivery.js';

import { WORKER_ENVIRONMENT } from './worker-environment.js';

export interface ClaimedOutboxEvent {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  eventVersion: number;
  payloadJson: Prisma.JsonValue;
  createdAt: Date;
}

@Injectable()
export class WorkerService implements OnApplicationBootstrap, OnApplicationShutdown {
  readonly #logger = new Logger(WorkerService.name);
  readonly #prisma: PrismaClient;
  #redis: Redis | null = null;
  #queue: Queue<OutboxJobPayload> | null = null;
  #deadLetterQueue: Queue<OutboxJobPayload> | null = null;
  #consumer: Worker<OutboxJobPayload> | null = null;
  #supabase: SupabaseClient | null = null;
  #pollTimer: ReturnType<typeof setInterval> | null = null;
  #polling = false;

  public constructor(@Inject(WORKER_ENVIRONMENT) private readonly environment: WorkerEnvironment) {
    this.#prisma = new PrismaClient({ datasourceUrl: environment.DATABASE_URL });
  }

  public async onApplicationBootstrap(): Promise<void> {
    if (this.environment.REDIS_URL === undefined) {
      throw new Error(
        'The persistent worker requires REDIS_URL. Use runScheduledBatch for serverless execution.',
      );
    }
    await this.#prisma.$connect();
    this.#redis = new Redis(this.environment.REDIS_URL, { maxRetriesPerRequest: null });
    this.#supabase = createClient(
      this.environment.SUPABASE_URL,
      this.environment.SUPABASE_SECRET_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const connection = this.#redis;
    this.#queue = new Queue<OutboxJobPayload>(CINEWRAPPED_QUEUE, { connection });
    this.#deadLetterQueue = new Queue<OutboxJobPayload>(CINEWRAPPED_DEAD_LETTER_QUEUE, {
      connection,
    });
    this.#consumer = new Worker<OutboxJobPayload>(
      CINEWRAPPED_QUEUE,
      async (job) => this.process(job),
      { connection, concurrency: this.environment.WORKER_CONCURRENCY },
    );
    this.#consumer.on('failed', (job, error) => {
      if (job !== undefined && job.attemptsMade >= (job.opts.attempts ?? 1)) {
        void this.deadLetter(job, error);
      }
    });
    this.#pollTimer = setInterval(
      () => void this.pollOutbox(),
      this.environment.OUTBOX_POLL_INTERVAL_MS,
    );
    await this.pollOutbox();
    this.#logger.log('Worker application context and outbox relay are ready.');
  }

  public async onApplicationShutdown(): Promise<void> {
    if (this.#pollTimer !== null) clearInterval(this.#pollTimer);
    await this.#consumer?.close();
    await this.#queue?.close();
    await this.#deadLetterQueue?.close();
    await this.#redis?.quit();
    await this.#prisma.$disconnect();
  }

  public getStatus(): 'ready' {
    return 'ready';
  }

  // Serverless invocations process the durable outbox directly, without starting timers or BullMQ.
  public async runScheduledBatch(
    handlers: Record<string, (event: ClaimedOutboxEvent) => Promise<boolean>> = {},
  ): Promise<{ processed: number; failed: number }> {
    let processed = 0;
    let failed = 0;
    try {
      await this.#prisma.$connect();
      this.#supabase = createClient(
        this.environment.SUPABASE_URL,
        this.environment.SUPABASE_SECRET_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } },
      );
      const events = await this.claimOutboxEvents();
      for (const event of events) {
        try {
          const handler = handlers[event.eventType];
          if (handler && (await handler(event))) {
            processed += 1;
            continue;
          }
          if (
            event.eventType === 'notification.push' &&
            (await deliverPush(this.#prisma, this.environment, event))
          ) {
            processed += 1;
            continue;
          }
          if (event.eventType === 'account.erase') await this.eraseAccount(event.aggregateId);
          else if (
            event.eventType !== 'system.healthcheck' &&
            event.eventType !== 'notification.push' &&
            !handler
          )
            throw new Error('UNSUPPORTED_JOB_TYPE');
          await this.#prisma.outboxEvent.update({
            where: { id: event.id },
            data: {
              status: 'PUBLISHED',
              publishedAt: new Date(),
              lockedAt: null,
              lastErrorCode: null,
            },
          });
          processed += 1;
        } catch (error) {
          const code =
            error instanceof Error && /^[A-Z][A-Z_0-9]{1,99}$/.test(error.message)
              ? error.message
              : error instanceof Error
                ? error.name
                : 'JOB_FAILED';
          await this.failPublish(event.id, code);
          failed += 1;
          this.#logger.error(`Scheduled outbox job ${event.id} failed.`, undefined);
        }
      }
      return { processed, failed };
    } finally {
      await this.#prisma.$disconnect();
    }
  }

  private async pollOutbox(): Promise<void> {
    if (this.#polling || this.#queue === null) return;
    this.#polling = true;
    try {
      const events = await this.claimOutboxEvents();
      for (const event of events) await this.publish(event);
    } catch (error) {
      this.#logger.error(
        'Outbox polling failed.',
        error instanceof Error ? error.stack : undefined,
      );
    } finally {
      this.#polling = false;
    }
  }

  private async claimOutboxEvents(): Promise<ClaimedOutboxEvent[]> {
    return this.#prisma.$transaction(async (transaction) => {
      await transaction.outboxEvent.updateMany({
        where: {
          status: 'PROCESSING',
          // Longer than Vercel's maximum 300-second invocation, so a live job is never reclaimed.
          lockedAt: { lt: new Date(Date.now() - 10 * 60_000) },
        },
        data: {
          status: 'FAILED',
          lockedAt: null,
          availableAt: new Date(),
          lastErrorCode: 'STALE_OUTBOX_LOCK',
        },
      });
      const events = await transaction.$queryRaw<ClaimedOutboxEvent[]>(Prisma.sql`
        SELECT id, "aggregateType", "aggregateId", "eventType", "eventVersion", "payloadJson", "createdAt"
        FROM outbox_events
        WHERE status IN ('PENDING', 'FAILED')
          AND "availableAt" <= NOW()
          AND "attemptCount" < ${this.environment.OUTBOX_MAX_ATTEMPTS}
        -- Requeued imports yield to older due work, so push jobs are not starved.
        ORDER BY "availableAt" ASC, "createdAt" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT ${this.environment.OUTBOX_BATCH_SIZE}
      `);
      if (events.length > 0) {
        await transaction.outboxEvent.updateMany({
          where: { id: { in: events.map((event) => event.id) } },
          data: { status: 'PROCESSING', lockedAt: new Date(), attemptCount: { increment: 1 } },
        });
      }
      return events;
    });
  }

  private async publish(event: ClaimedOutboxEvent): Promise<void> {
    if (this.#queue === null) return;
    if (!isJobName(event.eventType)) {
      await this.failPublish(event.id, 'UNSUPPORTED_JOB_TYPE');
      return;
    }
    try {
      await this.#queue.add(
        event.eventType,
        {
          outboxEventId: event.id,
          aggregateType: event.aggregateType,
          aggregateId: event.aggregateId,
          eventVersion: event.eventVersion,
          payload: event.payloadJson,
          occurredAt: event.createdAt.toISOString(),
        },
        {
          ...defaultJobOptions,
          jobId:
            event.eventType === 'notification.push' &&
            typeof event.payloadJson === 'object' &&
            event.payloadJson !== null &&
            'receiptId' in event.payloadJson
              ? `${event.id}-receipt`
              : event.id,
        },
      );
      await this.#prisma.outboxEvent.update({
        where: { id: event.id },
        data: { status: 'PUBLISHED', publishedAt: new Date(), lockedAt: null, lastErrorCode: null },
      });
    } catch (error) {
      await this.failPublish(
        event.id,
        error instanceof Error ? error.name : 'QUEUE_PUBLISH_FAILED',
      );
    }
  }

  private async failPublish(id: string, code: string): Promise<void> {
    const current = await this.#prisma.outboxEvent.findUnique({
      where: { id },
      select: { attemptCount: true },
    });
    const delaySeconds = Math.min(300, 2 ** Math.max(1, current?.attemptCount ?? 1));
    await this.#prisma.outboxEvent.update({
      where: { id },
      data: {
        status: 'FAILED',
        lockedAt: null,
        lastErrorCode: code.slice(0, 100),
        availableAt: new Date(Date.now() + delaySeconds * 1_000),
      },
    });
  }

  private async process(job: Job<OutboxJobPayload>): Promise<void> {
    if (job.name === 'system.healthcheck') return Promise.resolve();
    if (job.name === 'notification.push') {
      await deliverPush(this.#prisma, this.environment, {
        id: job.data.outboxEventId,
        payloadJson: job.data.payload as Prisma.JsonValue,
        createdAt: new Date(job.data.occurredAt),
      });
      return;
    }
    if (job.name === 'account.erase') return this.eraseAccount(job.data.aggregateId);
    throw new Error(`No worker handler is registered for ${job.name}.`);
  }

  private async eraseAccount(requestId: string): Promise<void> {
    const request = await this.#prisma.accountErasureRequest.findUnique({
      where: { id: requestId },
    });
    if (request === null || request.status === 'COMPLETED') return;

    await this.#prisma.accountErasureRequest.update({
      where: { id: request.id },
      data: {
        status: 'PROCESSING',
        startedAt: request.startedAt ?? new Date(),
        attemptCount: { increment: 1 },
        lastErrorCode: null,
      },
    });

    try {
      if (request.authSubject === null) {
        throw new Error('Account erasure request has no identity subject.');
      }
      await this.eraseUserStorage(request.authSubject);
      await this.deleteIdentity(request.authSubject);
      await this.purgeApplicationData(request.id, request.userId);
    } catch (error) {
      await this.#prisma.accountErasureRequest.update({
        where: { id: request.id },
        data: {
          status: 'FAILED',
          lastErrorCode: (error instanceof Error ? error.name : 'ACCOUNT_ERASURE_FAILED').slice(
            0,
            100,
          ),
        },
      });
      throw error;
    }
  }

  private async eraseUserStorage(ownerId: string): Promise<void> {
    if (this.#supabase === null) throw new Error('Supabase client is unavailable.');
    const buckets = [
      'avatars',
      'club-covers',
      'data-exports',
      'data-imports',
      'journal-attachments',
      'scene-identification',
    ] as const;
    for (const bucket of buckets) {
      const paths = await this.listStoragePaths(bucket, ownerId);
      for (let offset = 0; offset < paths.length; offset += 1000) {
        const { error } = await this.#supabase.storage
          .from(bucket)
          .remove(paths.slice(offset, offset + 1000));
        if (error !== null)
          throw new Error(`Storage erasure failed for ${bucket}: ${error.message}`);
      }
    }
  }

  private async listStoragePaths(bucket: string, directory: string): Promise<string[]> {
    if (this.#supabase === null) throw new Error('Supabase client is unavailable.');
    const paths: string[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await this.#supabase.storage
        .from(bucket)
        .list(directory, { limit: 1000, offset });
      if (error !== null) throw new Error(`Storage listing failed for ${bucket}: ${error.message}`);
      for (const item of data) {
        const path = `${directory}/${item.name}`;
        if (item.metadata === null) paths.push(...(await this.listStoragePaths(bucket, path)));
        else paths.push(path);
      }
      if (data.length < 1000) break;
    }
    return paths;
  }

  private async deleteIdentity(authSubject: string): Promise<void> {
    if (this.#supabase === null) throw new Error('Supabase client is unavailable.');
    const { error } = await this.#supabase.auth.admin.deleteUser(authSubject);
    if (error !== null && error.code !== 'user_not_found') {
      throw new Error(`Identity erasure failed: ${error.message}`);
    }
  }

  private async purgeApplicationData(requestId: string, userId: string): Promise<void> {
    await this.#prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId }, select: { id: true } });
      if (user !== null) {
        const ownedClubs = await tx.club.findMany({
          where: { ownerId: userId },
          select: { id: true },
        });
        const ownedClubIds = ownedClubs.map((club) => club.id);
        const authoredPosts = await tx.clubPost.findMany({
          where: { authorId: userId, clubId: { notIn: ownedClubIds } },
          select: { id: true },
        });
        const authoredPostIds = authoredPosts.map((post) => post.id);
        if (authoredPostIds.length > 0) {
          await tx.comment.deleteMany({
            where: { parentType: 'CLUB_POST', parentId: { in: authoredPostIds } },
          });
          await tx.reaction.deleteMany({
            where: { targetType: 'CLUB_POST', targetId: { in: authoredPostIds } },
          });
        }
        await tx.clubPost.deleteMany({ where: { authorId: userId } });
        await tx.clubPoll.deleteMany({ where: { createdById: userId } });
        await tx.clubWatchlistItem.deleteMany({ where: { suggestedById: userId } });
        await tx.clubWatchEvent.deleteMany({ where: { createdById: userId } });
        await tx.watchlistItem.deleteMany({ where: { addedByUserId: userId } });
        await tx.club.deleteMany({ where: { ownerId: userId } });
        await tx.auditLog.updateMany({
          where: { actorUserId: userId },
          data: { actorSubject: null, reason: null, metadataJson: {} },
        });
        await tx.outboxEvent.deleteMany({
          where: { aggregateType: 'data-import', aggregateId: userId },
        });
        await tx.user.delete({ where: { id: userId } });
      }
      await tx.accountErasureRequest.update({
        where: { id: requestId },
        data: {
          status: 'COMPLETED',
          authSubject: null,
          completedAt: new Date(),
          lastErrorCode: null,
        },
      });
      await tx.auditLog.create({
        data: {
          actorType: 'SYSTEM',
          action: 'ACCOUNT_PURGED',
          targetType: 'ACCOUNT_ERASURE',
          targetId: requestId,
          reason: 'USER_REQUESTED_ERASURE',
        },
      });
    });
  }

  private async deadLetter(job: Job<OutboxJobPayload>, error: Error): Promise<void> {
    await this.#deadLetterQueue?.add(job.name, job.data, {
      jobId: `${job.id ?? job.data.outboxEventId}-dead-letter`,
      removeOnFail: false,
    });
    this.#logger.error(
      `Job ${job.id ?? 'unknown'} moved to the dead-letter queue: ${error.message}`,
    );
  }
}
