const WINDOW_MS = 60_000

type Bucket = { count: number; resetAt: number }

/**
 * In-process and per-user: one chat turn can cost several model requests against a
 * shared per-project quota, so the ceiling is deliberately low. A single instance
 * makes a Map enough; a fleet would move this to the database or a cache.
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
