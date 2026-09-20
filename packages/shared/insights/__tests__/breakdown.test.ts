import { describe, expect, it } from 'vitest'
import type { DailyRecord } from '../../schema/index.js'
import { sleepStepCorrelation, weekdayBreakdown } from '../breakdown.js'

const day = (date: string, sleepHours: number | null, steps: number | null): DailyRecord => ({
  date,
  steps,
  distanceKm: null,
  calories: 400,
  sleepHours,
  workouts: [],
})

describe('weekdayBreakdown', () => {
  it('returns seven buckets, Monday first', () => {
    const rows = weekdayBreakdown([day('2026-09-14', 7, 8000)], 'steps')
    expect(rows).toHaveLength(7)
    expect(rows[0]?.label).toBe('Mon')
  })

  it('averages each weekday and excludes gaps from the count', () => {
    const records = [
      day('2026-09-14', 7, 6000), // Mon
      day('2026-09-21', 7, 8000), // Mon
      day('2026-09-28', 7, null), // Mon, not recorded
    ]
    const monday = weekdayBreakdown(records, 'steps')[0]
    expect(monday?.mean).toBe(7000)
    expect(monday?.days).toBe(2)
  })

  it('reports a weekday with no data as null rather than zero', () => {
    const rows = weekdayBreakdown([day('2026-09-14', 7, 6000)], 'steps')
    expect(rows[1]?.mean).toBeNull()
  })
})

describe('sleepStepCorrelation', () => {
  it('compares steps after a good night with steps after a short one', () => {
    const records = [
      day('2026-09-01', 8, 5000), // good night -> next day 9000
      day('2026-09-02', 8, 9000), // good night -> next day 9000
      day('2026-09-03', 8, 9000), // good night -> next day 9000
      day('2026-09-04', 5, 9000), // short night -> next day 6000
      day('2026-09-05', 5, 6000), // short night -> next day 6000
      day('2026-09-06', 5, 6000), // short night -> next day 6000
      day('2026-09-07', 5, 6000),
    ]
    const result = sleepStepCorrelation(records)
    expect(result).not.toBeNull()
    expect(result?.goodNights).toBe(3)
    expect(result?.otherNights).toBe(3)
    expect(result?.pct).toBeCloseTo(50, 0) // 9000 vs 6000
  })

  it('returns null when either side is too thin to claim anything', () => {
    expect(sleepStepCorrelation([day('2026-09-01', 8, 9000)])).toBeNull()
  })

  it('ignores pairs where either value is missing', () => {
    const records = [
      day('2026-09-01', 8, null),
      day('2026-09-02', null, 9000),
      day('2026-09-03', 5, 6000),
      day('2026-09-04', 5, 6000),
    ]
    expect(sleepStepCorrelation(records)).toBeNull()
  })
})
