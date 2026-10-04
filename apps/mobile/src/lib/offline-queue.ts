import { z } from 'zod';
import { logViewingSchema, uuidSchema } from '@cinewrapped/validation';

const entrySchema = z.object({
  id: uuidSchema,
  mediaId: uuidSchema,
  body: logViewingSchema,
  attempts: z.number().int().min(0),
  nextAttemptAt: z.number(),
  error: z.string().nullable(),
  mediaTitle: z.string().max(300).optional(),
});
export type OfflineViewing = z.output<typeof entrySchema>;
interface Storage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
export interface QueueStatus {
  owner: string | null;
  pending: number;
  blocked: number;
  error: string | null;
  failures: Array<{ id: string; title: string; error: string | null }>;
}

export class OfflineViewingQueue {
  private owner: string | null = null;
  private entries: OfflineViewing[] = [];
  private serial: Promise<unknown> = Promise.resolve();
  private controller: AbortController | null = null;
  private listeners = new Set<(status: QueueStatus) => void>();
  private error: string | null = null;
  private flushing: Promise<number> | null = null;
  constructor(
    private readonly storage: Storage,
    private readonly send: (
      owner: string,
      entry: OfflineViewing,
      signal: AbortSignal,
    ) => Promise<void>,
    private readonly now: () => number = Date.now,
    private readonly lock: <T>(operation: () => Promise<T>) => Promise<T> = (operation) =>
      operation(),
  ) {}
  private key(owner: string) {
    return `cinewrapped.offline-viewings.v1.${owner}`;
  }
  private exclusive<T>(operation: () => Promise<T>): Promise<T> {
    const run = () => this.lock(operation);
    const result = this.serial.then(run, run);
    this.serial = result.catch(() => undefined);
    return result;
  }
  public snapshot(): QueueStatus {
    return {
      owner: this.owner,
      pending: this.entries.length,
      blocked: this.entries.filter((entry) => entry.attempts >= 10).length,
      error: this.error,
      failures: this.entries
        .filter((entry) => entry.attempts >= 10)
        .map((entry) => ({
          id: entry.id,
          title: entry.mediaTitle ?? 'Saved viewing',
          error: entry.error,
        })),
    };
  }
  public subscribe(listener: (status: QueueStatus) => void): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }
  private publish() {
    for (const listener of this.listeners) listener(this.snapshot());
  }
  public setOwner(owner: string | null): Promise<void> {
    const previous = this.owner;
    if (owner === previous) return this.serial.then(() => undefined);
    this.owner = owner;
    this.controller?.abort();
    this.entries = [];
    this.error = null;
    this.publish();
    return this.exclusive(async () => {
      if (previous) await this.storage.removeItem(this.key(previous));
      if (!owner || owner !== this.owner) return;
      const value = await this.storage.getItem(this.key(owner));
      if (owner !== this.owner) return;
      if (value) this.entries = z.array(entrySchema).max(200).parse(JSON.parse(value));
      this.publish();
    });
  }
  private async persist(owner: string, entries: OfflineViewing[]) {
    await this.storage.setItem(this.key(owner), JSON.stringify(entries));
    if (owner === this.owner) {
      this.entries = entries;
      this.publish();
    }
  }
  private async restore(owner: string): Promise<void> {
    const value = await this.storage.getItem(this.key(owner));
    if (owner === this.owner)
      this.entries = value ? z.array(entrySchema).max(200).parse(JSON.parse(value)) : [];
  }
  public enqueue(
    mediaId: string,
    body: z.input<typeof logViewingSchema>,
    mediaTitle?: string,
  ): Promise<void> {
    const owner = this.owner;
    if (!owner) return Promise.reject(new Error('Sign in before saving a viewing.'));
    const parsed = entrySchema.parse({
      id: body.clientOperationId,
      mediaId,
      body,
      attempts: 0,
      nextAttemptAt: 0,
      error: null,
      ...(mediaTitle ? { mediaTitle } : {}),
    });
    return this.exclusive(async () => {
      if (owner !== this.owner) throw new Error('Your account changed. Please try again.');
      await this.restore(owner);
      if (owner !== this.owner) throw new Error('Your account changed.');
      if (this.entries.length >= 200)
        throw new Error('Sync your pending viewings before adding more.');
      if (this.entries.some((entry) => entry.id === parsed.id)) return;
      await this.persist(owner, [...this.entries, parsed]);
    });
  }
  public discardFailed(id: string): Promise<void> {
    const owner = this.owner;
    return this.exclusive(async () => {
      if (!owner || owner !== this.owner) return;
      await this.restore(owner);
      if (owner !== this.owner) return;
      await this.persist(
        owner,
        this.entries.filter((entry) => entry.id !== id || entry.attempts < 10),
      );
      if (!this.entries.length) this.error = null;
      this.publish();
    });
  }
  public retry(): Promise<void> {
    const owner = this.owner;
    return this.exclusive(async () => {
      if (owner && owner === this.owner) {
        await this.restore(owner);
        await this.persist(
          owner,
          this.entries.map((entry) => ({ ...entry, attempts: 0, nextAttemptAt: 0, error: null })),
        );
      }
    });
  }
  public flush(): Promise<number> {
    if (this.flushing) return this.flushing;
    this.flushing = this.flushBatch().finally(() => {
      this.flushing = null;
    });
    return this.flushing;
  }
  private flushBatch(): Promise<number> {
    const owner = this.owner;
    return this.exclusive(async () => {
      if (!owner || owner !== this.owner) return 0;
      await this.restore(owner);
      if (owner !== this.owner) return 0;
      let acknowledged = 0;
      for (const entry of [...this.entries].slice(0, 10)) {
        if (owner !== this.owner) break;
        if (entry.attempts >= 10 || entry.nextAttemptAt > this.now()) continue;
        this.controller = new AbortController();
        try {
          await this.send(owner, entry, this.controller.signal);
          if (owner !== this.owner) break;
          await this.persist(
            owner,
            this.entries.filter((item) => item.id !== entry.id),
          );
          acknowledged++;
          this.error = null;
        } catch (reason) {
          if (owner !== this.owner) break;
          const status = (reason as { status?: number }).status;
          const code = (reason as { code?: string }).code;
          const retryable =
            status === undefined ||
            status >= 500 ||
            status === 429 ||
            code === 'IDEMPOTENCY_REQUEST_IN_PROGRESS';
          const attempts = retryable ? entry.attempts + 1 : 10;
          const error = retryable
            ? 'Waiting for a connection. Your viewing is saved on this device.'
            : 'A viewing could not sync. Review the error and retry.';
          this.error = error;
          await this.persist(
            owner,
            this.entries.map((item) =>
              item.id === entry.id
                ? {
                    ...item,
                    attempts,
                    error: code ?? (status ? `HTTP_${status}` : 'NETWORK_UNAVAILABLE'),
                    nextAttemptAt:
                      this.now() + Math.min(300_000, 5000 * 2 ** Math.min(attempts, 6)),
                  }
                : item,
            ),
          );
          // Avoid repeating a failing request for every item while offline or signed out.
          break;
        } finally {
          this.controller = null;
        }
      }
      this.publish();
      return acknowledged;
    });
  }
}
