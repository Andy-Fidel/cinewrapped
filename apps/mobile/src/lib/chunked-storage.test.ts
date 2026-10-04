import { describe, expect, it } from 'vitest';
import { chunkedStorage } from './chunked-storage';
describe('encrypted queue storage commit', () => {
  it.each([1, 2, 3, 4, 5])('preserves the committed value when write %s fails', async (failAt) => {
    const data = new Map<string, string>();
    let writes = 0;
    let failure = Infinity;
    const store = chunkedStorage({
      get: (key) => Promise.resolve(data.get(key) ?? null),
      set: (key, value) => {
        if (++writes === failure) throw new Error('disk full');
        data.set(key, value);
        return Promise.resolve();
      },
      remove: (key) => {
        data.delete(key);
        return Promise.resolve();
      },
    });
    await store.setItem('queue', 'old value');
    writes = 0;
    failure = failAt;
    try {
      await store.setItem('queue', '🚀'.repeat(1000));
    } catch {
      /* Simulates a failed encrypted chunk or pointer commit. */
    }
    expect(await store.getItem('queue')).toBe('old value');
    await store.removeItem('queue');
    expect(data.size).toBe(0);
  });
  it('round trips multi-byte content and clears both tracked slots', async () => {
    const data = new Map<string, string>();
    const store = chunkedStorage({
      get: (key) => Promise.resolve(data.get(key) ?? null),
      set: (key, value) => {
        data.set(key, value);
        return Promise.resolve();
      },
      remove: (key) => {
        data.delete(key);
        return Promise.resolve();
      },
    });
    await store.setItem('queue', '😀'.repeat(1000));
    expect(await store.getItem('queue')).toBe('😀'.repeat(1000));
    await store.setItem('queue', 'new');
    expect(await store.getItem('queue')).toBe('new');
    await store.removeItem('queue');
    expect(data.size).toBe(0);
  });
});
