/** mulberry32 — 32-bit, fast, and stable across Node versions, which `Math.random` is not. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Box–Muller, so noise is normal rather than uniform and the charts look like data. */
export function gaussian(rand: () => number, mean: number, sd: number): number {
  const u = Math.max(rand(), Number.EPSILON)
  const v = rand()
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}
