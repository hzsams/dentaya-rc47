type Bucket = { count: number; resetAt: number };
type BudgetResult = { allowed: boolean; remaining: number; retryAfterSeconds: number };

type RateLimitStore = typeof globalThis & {
  __dentayaRateLimitStore?: Map<string, Bucket>;
};

const globalStore = globalThis as RateLimitStore;
const store = globalStore.__dentayaRateLimitStore ?? new Map<string, Bucket>();
if (!globalStore.__dentayaRateLimitStore) globalStore.__dentayaRateLimitStore = store;

export function consumeRequestBudget(key: string, limit: number, windowMs: number): BudgetResult {
  const now = Date.now();
  if (store.size > 10000) {
    for (const [id, bucket] of store) if (bucket.resetAt <= now) store.delete(id);
    if (!store.has(key) && store.size > 10000) return { allowed: false, remaining: 0, retryAfterSeconds: Math.ceil(windowMs / 1000) };
  }
  const current = store.get(key);
  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: Math.max(0, limit - 1), retryAfterSeconds: 0 };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  return { allowed: true, remaining: Math.max(0, limit - current.count), retryAfterSeconds: 0 };
}

export function requestBodyTooLarge(request: Request, maxBytes: number): boolean {
  const raw = request.headers.get("content-length");
  if (!raw) return false;
  const length = Number(raw);
  return Number.isFinite(length) && length > maxBytes;
}

export function hasJsonContentType(request: Request): boolean {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  return contentType.startsWith("application/json");
}
