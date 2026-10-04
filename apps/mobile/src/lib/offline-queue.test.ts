import { describe, expect, it, vi } from 'vitest';
import { OfflineViewingQueue, type OfflineViewing } from './offline-queue';
const owner = '10000000-0000-4000-8000-000000000001';
const mediaId = '20000000-0000-4000-8000-000000000001';
const body = {
  clientOperationId: '30000000-0000-4000-8000-000000000001',
  watchedAt: '2026-10-04T12:00:00Z',
  completed: true,
};
function fixture() {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => Promise.resolve(values.get(key) ?? null),
    setItem: (key: string, value: string) => {
      values.set(key, value);
      return Promise.resolve();
    },
    removeItem: (key: string) => {
      values.delete(key);
      return Promise.resolve();
    },
  };
  const send = vi
    .fn<(owner: string, entry: OfflineViewing, signal: AbortSignal) => Promise<void>>()
    .mockResolvedValue(undefined);
  return { values, storage, send, queue: new OfflineViewingQueue(storage, send, () => 1000) };
}
describe('durable offline viewing queue', () => {
  it('persists before sending and restores after an app restart', async () => {
    const f = fixture();
    await f.queue.setOwner(owner);
    await f.queue.enqueue(mediaId, body);
    expect(f.send).not.toHaveBeenCalled();
    const restarted = new OfflineViewingQueue(f.storage, f.send);
    await restarted.setOwner(owner);
    expect(restarted.snapshot().pending).toBe(1);
    expect(await restarted.flush()).toBe(1);
    expect(f.send.mock.calls[0]?.[1].body.clientOperationId).toBe(body.clientOperationId);
    expect(restarted.snapshot().pending).toBe(0);
  });
  it('keeps a request after a network failure with its original operation ID', async () => {
    const f = fixture();
    await f.queue.setOwner(owner);
    await f.queue.enqueue(mediaId, body);
    f.send.mockRejectedValueOnce(new TypeError('Network failed'));
    expect(await f.queue.flush()).toBe(0);
    expect(f.queue.snapshot().pending).toBe(1);
    await f.queue.retry();
    expect(await f.queue.flush()).toBe(1);
    expect(f.send.mock.calls.map((call) => call[1].id)).toEqual([
      body.clientOperationId,
      body.clientOperationId,
    ]);
  });
  it('serializes concurrent writes without losing either viewing', async () => {
    const f = fixture();
    await f.queue.setOwner(owner);
    await Promise.all([
      f.queue.enqueue(mediaId, body),
      f.queue.enqueue(mediaId, {
        ...body,
        clientOperationId: '30000000-0000-4000-8000-000000000002',
      }),
    ]);
    expect(f.queue.snapshot().pending).toBe(2);
  });
  it('clears the previous account queue and never sends it as the next account', async () => {
    const f = fixture();
    await f.queue.setOwner(owner);
    await f.queue.enqueue(mediaId, body);
    await f.queue.setOwner('10000000-0000-4000-8000-000000000002');
    expect(f.queue.snapshot().pending).toBe(0);
    await f.queue.flush();
    expect(f.send).not.toHaveBeenCalled();
    expect(f.values.has(`cinewrapped.offline-viewings.v1.${owner}`)).toBe(false);
  });
  it('retains permanent failures for user attention instead of silently dropping them', async () => {
    const f = fixture();
    await f.queue.setOwner(owner);
    await f.queue.enqueue(mediaId, body);
    f.send.mockRejectedValue({ status: 409, code: 'OPERATION_ID_CONFLICT' });
    await f.queue.flush();
    await f.queue.flush();
    expect(f.send).toHaveBeenCalledOnce();
    expect(f.queue.snapshot().blocked).toBe(1);
  });
  it('lets the user discard a rejected viewing without silently removing other entries', async () => {
    const f = fixture();
    await f.queue.setOwner(owner);
    await f.queue.enqueue(mediaId, body, 'Arrival');
    f.send.mockRejectedValue({ status: 404, code: 'MEDIA_NOT_FOUND' });
    await f.queue.flush();
    expect(f.queue.snapshot().failures[0]?.title).toBe('Arrival');
    await f.queue.discardFailed(body.clientOperationId);
    expect(f.queue.snapshot().pending).toBe(0);
  });
  it('does not mark a viewing saved when persistence fails', async () => {
    const f = fixture();
    await f.queue.setOwner(owner);
    f.storage.setItem = () => Promise.reject(new Error('disk full'));
    await expect(f.queue.enqueue(mediaId, body)).rejects.toThrow('disk full');
    expect(f.queue.snapshot().pending).toBe(0);
  });
});
