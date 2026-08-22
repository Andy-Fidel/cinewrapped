import { describe, expect, it, vi } from 'vitest';

import { withNetworkRetry, type Fetcher } from './network-fetch';

describe('withNetworkRetry', () => {
  it('retries one transient network failure', async () => {
    const response = new Response('{}', { status: 200 });
    const fetcher = vi
      .fn<Fetcher>()
      .mockRejectedValueOnce(new TypeError('Network request failed'))
      .mockResolvedValueOnce(response);
    const wait = vi.fn(() => Promise.resolve());

    await expect(withNetworkRetry(fetcher, wait)('https://example.test')).resolves.toBe(response);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledOnce();
  });

  it('does not retry HTTP responses or non-network exceptions', async () => {
    const response = new Response('{}', { status: 401 });
    const httpFetcher = vi.fn<Fetcher>().mockResolvedValue(response);
    const applicationError = new Error('Invalid credentials');
    const failingFetcher = vi.fn<Fetcher>().mockRejectedValue(applicationError);
    const wait = vi.fn(() => Promise.resolve());

    await expect(withNetworkRetry(httpFetcher, wait)('https://example.test')).resolves.toBe(
      response,
    );
    await expect(withNetworkRetry(failingFetcher, wait)('https://example.test')).rejects.toBe(
      applicationError,
    );
    expect(httpFetcher).toHaveBeenCalledOnce();
    expect(failingFetcher).toHaveBeenCalledOnce();
    expect(wait).not.toHaveBeenCalled();
  });

  it('does not retry unsafe requests unless they carry an idempotency key', async () => {
    const unsafeFetcher = vi
      .fn<Fetcher>()
      .mockRejectedValue(new TypeError('Network request failed'));
    const safeMutationFetcher = vi
      .fn<Fetcher>()
      .mockRejectedValueOnce(new TypeError('Network request failed'))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }));
    const wait = vi.fn(() => Promise.resolve());

    await expect(
      withNetworkRetry(unsafeFetcher, wait)('https://example.test', { method: 'POST' }),
    ).rejects.toThrow('Network request failed');
    await expect(
      withNetworkRetry(safeMutationFetcher, wait)('https://example.test', {
        method: 'POST',
        headers: { 'Idempotency-Key': 'retry-safe-operation-123' },
      }),
    ).resolves.toBeInstanceOf(Response);
    expect(unsafeFetcher).toHaveBeenCalledOnce();
    expect(safeMutationFetcher).toHaveBeenCalledTimes(2);
  });

  it('aborts a stalled request at the configured timeout', async () => {
    const fetcher = vi.fn<Fetcher>(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener(
            'abort',
            () => {
              const reason: unknown = init.signal?.reason;
              reject(reason instanceof Error ? reason : new Error('Request aborted'));
            },
            { once: true },
          );
        }),
    );

    await expect(
      withNetworkRetry(
        fetcher,
        () => Promise.resolve(),
        5,
      )('https://example.test', {
        method: 'POST',
      }),
    ).rejects.toThrow('Network request timed out');
  });
});
