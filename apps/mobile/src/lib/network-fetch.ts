export type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
type Wait = () => Promise<void>;

function isNetworkFailure(error: unknown): boolean {
  return (
    error instanceof TypeError ||
    (error instanceof Error &&
      /network request failed|failed to fetch|load failed|network request timed out|timeout|abort/iu.test(
        error.message,
      ))
  );
}

const retryDelay: Wait = () => new Promise((resolve) => setTimeout(resolve, 600));

async function fetchWithTimeout(
  fetcher: Fetcher,
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const upstreamSignal = init?.signal;
  const abortFromUpstream = () => controller.abort(upstreamSignal?.reason);
  if (upstreamSignal?.aborted === true) abortFromUpstream();
  else upstreamSignal?.addEventListener('abort', abortFromUpstream, { once: true });
  const timer = setTimeout(
    () => controller.abort(new Error('Network request timed out')),
    timeoutMs,
  );
  try {
    return await fetcher(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    upstreamSignal?.removeEventListener('abort', abortFromUpstream);
  }
}

export function withNetworkRetry(
  fetcher: Fetcher,
  wait: Wait = retryDelay,
  timeoutMs = 15_000,
): Fetcher {
  return async (...arguments_) => {
    const request = arguments_[0] instanceof Request ? arguments_[0] : null;
    const init = arguments_[1];
    const method = (init?.method ?? request?.method ?? 'GET').toUpperCase();
    const headers = new Headers(init?.headers ?? request?.headers);
    const retryAllowed =
      method === 'GET' ||
      method === 'HEAD' ||
      method === 'OPTIONS' ||
      headers.has('Idempotency-Key');
    try {
      return await fetchWithTimeout(fetcher, arguments_[0], arguments_[1], timeoutMs);
    } catch (error) {
      if (!retryAllowed || !isNetworkFailure(error)) throw error;
      await wait();
      return fetchWithTimeout(fetcher, arguments_[0], arguments_[1], timeoutMs);
    }
  };
}
