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
import { type Job, Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';

import { WORKER_ENVIRONMENT } from './worker-environment.js';

interface ClaimedOutboxEvent {
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
  readonly #prisma = new PrismaClient();
  #redis: Redis | null = null;
  #queue: Queue<OutboxJobPayload> | null = null;
  #deadLetterQueue: Queue<OutboxJobPayload> | null = null;
  #consumer: Worker<OutboxJobPayload> | null = null;
  #pollTimer: ReturnType<typeof setInterval> | null = null;
  #polling = false;

  public constructor(@Inject(WORKER_ENVIRONMENT) private readonly environment: WorkerEnvironment) {}

  public async onApplicationBootstrap(): Promise<void> {
    await this.#prisma.$connect();
    this.#redis = new Redis(this.environment.REDIS_URL, { maxRetriesPerRequest: null });
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
          lockedAt: { lt: new Date(Date.now() - 5 * 60_000) },
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
        ORDER BY "createdAt" ASC
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
        { ...defaultJobOptions, jobId: event.id },
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

  private process(job: Job<OutboxJobPayload>): Promise<void> {
    if (job.name === 'system.healthcheck') return Promise.resolve();
    return Promise.reject(new Error(`No worker handler is registered for ${job.name}.`));
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
