import type { Band } from '@health/shared/schema'

/** Recharts takes colours as props, so the theme tokens are read rather than re-declared. */
type ColorToken = Band | 'line' | 'ink-muted'

/** Only hit when a token is missing from the stylesheet, or under a test DOM with no styles. */
const FALLBACK = '#888888'

const cache = new Map<ColorToken, string>()

export function chartColor(token: ColorToken): string {
  const cached = cache.get(token)
  if (cached) return cached

  const value =
    getComputedStyle(document.documentElement).getPropertyValue(`--color-${token}`).trim() ||
    FALLBACK

  cache.set(token, value)
  return value
}
