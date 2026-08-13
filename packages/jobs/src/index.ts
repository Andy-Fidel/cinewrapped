export const CINEWRAPPED_QUEUE = 'cinewrapped-jobs';
export const CINEWRAPPED_DEAD_LETTER_QUEUE = 'cinewrapped-jobs-dead-letter';

export const jobNames = [
  'system.healthcheck',
  'journal.export',
  'data.import',
  'data.export',
  'scene.identify',
  'watch-party.notification',
  'calendar.sync',
] as const;

export type JobName = (typeof jobNames)[number];

export interface OutboxJobPayload {
  outboxEventId: string;
  aggregateType: string;
  aggregateId: string;
  eventVersion: number;
  payload: unknown;
  occurredAt: string;
}

export const defaultJobOptions = {
  attempts: 5,
  backoff: { type: 'exponential' as const, delay: 2_000 },
  removeOnComplete: { age: 86_400, count: 5_000 },
  removeOnFail: false,
};

export function isJobName(value: string): value is JobName {
  return (jobNames as readonly string[]).includes(value);
}
