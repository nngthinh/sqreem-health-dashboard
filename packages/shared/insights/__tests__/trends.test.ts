import { describe, expect, it } from 'vitest'
import type { DailyRecord } from '../../schema/index.js'
import { computeTrend, MIN_SAMPLE_DAYS, SIGNIFICANCE_PCT, splitMovers } from '../trends.js'

/** Distance mirrors steps so that a second moving metric is available for ranking. */
const days = (values: (number | null)[]): DailyRecord[] =>
  values.map((value, i) => ({
    date: `2026-07-${String(i + 1).padStart(2, '0')}`,
    steps: value,
    distanceKm: value,
    calories: 400,
    sleepHours: 7,
    workouts: [],
  }))

describe('computeTrend', () => {
  it('compares the last 7 days with the 7 before them', () => {
    const trend = computeTrend(days([...Array(7).fill(8000), ...Array(7).fill(6000)]), 'steps', 7)

    expect(trend.previous).toBe(8000)
    expect(trend.current).toBe(6000)
    expect(trend.deltaPct).toBeCloseTo(-25, 5)
    expect(trend.direction).toBe('down')
  })

  it('marks a move at or beyond the threshold as significant', () => {
    const trend = computeTrend(days([...Array(7).fill(1000), ...Array(7).fill(1100)]), 'steps', 7)

    expect(SIGNIFICANCE_PCT).toBe(10)
    expect(trend.deltaPct).toBeCloseTo(10, 5)
    expect(trend.significant).toBe(true)
  })

  it('does not mark a smaller move as significant', () => {
    const trend = computeTrend(days([...Array(7).fill(1000), ...Array(7).fill(1050)]), 'steps', 7)

    expect(trend.significant).toBe(false)
    expect(trend.direction).toBe('flat')
  })

  it('refuses to call a thin sample significant', () => {
    expect(MIN_SAMPLE_DAYS).toBe(4)

    const thin = days([...Array(7).fill(8000), 6000, 6000, 6000, null, null, null, null])
    const trend = computeTrend(thin, 'steps', 7)

    expect(trend.sampleDays).toBe(3)
    expect(trend.significant).toBe(false)
  })

  it('returns a null delta when a period has no data at all', () => {
    const trend = computeTrend(days([...Array(7).fill(null), ...Array(7).fill(6000)]), 'steps', 7)

    expect(trend.previous).toBeNull()
    expect(trend.deltaPct).toBeNull()
    expect(trend.significant).toBe(false)
  })

  it('carries a series with gaps preserved as null, never zeroed', () => {
    const trend = computeTrend(
      days([...Array(7).fill(8000), 6000, null, 6000, 6000, 6000, 6000, 6000]),
      'steps',
      7,
    )

    expect(trend.series).toHaveLength(7)
    expect(trend.series[1]?.value).toBeNull()
  })
})

describe('splitMovers', () => {
  it('separates significant movers from the steady strip', () => {
    const trends = [
      computeTrend(days([...Array(7).fill(8000), ...Array(7).fill(6000)]), 'steps', 7),
      computeTrend(days([...Array(7).fill(8000), ...Array(7).fill(7900)]), 'calories', 7),
    ]

    const { movers, steady } = splitMovers(trends)

    expect(movers).toEqual(['steps'])
    expect(steady).toEqual(['calories'])
  })

  it('ranks movers by the size of the move, so the loudest is first', () => {
    const big = computeTrend(days([...Array(7).fill(8000), ...Array(7).fill(4000)]), 'steps', 7)
    const small = computeTrend(
      days([...Array(7).fill(8000), ...Array(7).fill(6800)]),
      'distance',
      7,
    )

    expect(splitMovers([small, big]).movers).toEqual(['steps', 'distance'])
  })
})
