const WINDOW_MS = 60_000

type Bucket = { count: number; resetAt: number }

/**
 * In-process and per-user. The ceiling is RATE_LIMIT_PER_MIN, 4 chat requests per
 * authenticated user per minute: one turn can spend up to MAX_TOOL_ROUNDS + 1 model
 * requests against a shared per-project quota, so 4 turns is already ~20 requests.
 * A single instance makes a Map enough; a fleet would move this to a shared store.
 */
const buckets = new Map<string, Bucket>()

export function checkRateLimit(userId: string, perMin: number): boolean {
  const now = Date.now()
  const bucket = buckets.get(userId)

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(userId, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }

  if (bucket.count >= perMin) return false

  bucket.count += 1
  return true
}

export function resetRateLimits(): void {
  buckets.clear()
}
