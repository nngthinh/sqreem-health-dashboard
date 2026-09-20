import { afterEach, describe, expect, it, vi } from 'vitest'
import { checkRateLimit, resetRateLimits } from '../rateLimit.js'

afterEach(() => {
  resetRateLimits()
  vi.useRealTimers()
})

describe('checkRateLimit', () => {
  it('allows up to the limit within a minute', () => {
    for (let i = 0; i < 4; i++) expect(checkRateLimit('u1', 4)).toBe(true)

    expect(checkRateLimit('u1', 4)).toBe(false)
  })

  it('counts each user separately, which is what auth bought us', () => {
    for (let i = 0; i < 4; i++) checkRateLimit('u1', 4)

    expect(checkRateLimit('u2', 4)).toBe(true)
  })

  it('refills after the window', () => {
    vi.useFakeTimers()
    for (let i = 0; i < 4; i++) checkRateLimit('u1', 4)
    expect(checkRateLimit('u1', 4)).toBe(false)

    vi.advanceTimersByTime(61_000)

    expect(checkRateLimit('u1', 4)).toBe(true)
  })
})
