export type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
type Wait = () => Promise<void>;

function isNetworkFailure(error: unknown): boolean {
  return (
    error instanceof TypeError ||
    (error instanceof Error &&
      /network request failed|failed to fetch|load failed/iu.test(error.message))
  );
}

const retryDelay: Wait = () => new Promise((resolve) => setTimeout(resolve, 600));

export function withNetworkRetry(fetcher: Fetcher, wait: Wait = retryDelay): Fetcher {
  return async (...arguments_) => {
    try {
      return await fetcher(...arguments_);
    } catch (error) {
      if (!isNetworkFailure(error)) throw error;
      await wait();
      return fetcher(...arguments_);
    }
  };
}
