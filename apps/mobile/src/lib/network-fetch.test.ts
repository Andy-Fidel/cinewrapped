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
});
