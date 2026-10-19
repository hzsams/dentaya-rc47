export type RetryOptions = {
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
};

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function isTransientNetworkError(error: unknown): boolean {
  if (error instanceof TypeError && /fetch|network|load failed/i.test(error.message)) return true;
  if (error instanceof Error && /timeout|timed out|network|fetch|temporar/i.test(error.message)) return true;
  return false;
}

export async function retryAsync<T>(task: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const attempts = Math.max(1, Math.min(5, options.attempts ?? 3));
  const baseDelayMs = Math.max(50, options.baseDelayMs ?? 350);
  const maxDelayMs = Math.max(baseDelayMs, options.maxDelayMs ?? 2_000);
  const shouldRetry = options.shouldRetry ?? isTransientNetworkError;

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (attempt >= attempts || !shouldRetry(error, attempt)) throw error;
      const delay = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      await sleep(delay);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Retry failed");
}

export async function fetchWithRetry(input: RequestInfo | URL, init?: RequestInit, options: RetryOptions = {}) {
  return retryAsync(async () => {
    const response = await fetch(input, init);
    if ([408, 429, 500, 502, 503, 504].includes(response.status)) {
      throw new Error(`HTTP_${response.status}`);
    }
    return response;
  }, {
    attempts: options.attempts ?? 3,
    baseDelayMs: options.baseDelayMs ?? 400,
    maxDelayMs: options.maxDelayMs ?? 1_600,
    shouldRetry: (error, attempt) => {
      if (error instanceof Error && /^HTTP_(408|429|500|502|503|504)$/.test(error.message)) return true;
      return (options.shouldRetry ?? isTransientNetworkError)(error, attempt);
    },
  });
}
