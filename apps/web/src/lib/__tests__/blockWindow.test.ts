import type { DailyRecord } from '@health/shared/schema'
import { describe, expect, it } from 'vitest'
import { recordsInPeriod, summariseMetric } from '../blockWindow'

const record = (date: string, steps: number | null): DailyRecord => ({
  date,
  steps,
  distanceKm: null,
  calories: null,
  sleepHours: null,
  workouts: [],
})

const records = [
  record('2026-09-01', 1000),
  record('2026-09-02', null),
  record('2026-09-03', 3000),
  record('2026-09-04', 5000),
]

describe('recordsInPeriod', () => {
  it('includes both bounds', () => {
    const inPeriod = recordsInPeriod(records, { from: '2026-09-02', to: '2026-09-03' })
    expect(inPeriod.map((r) => r.date)).toEqual(['2026-09-02', '2026-09-03'])
  })

  it('returns nothing for a period the records do not cover', () => {
    expect(recordsInPeriod(records, { from: '2026-10-01', to: '2026-10-07' })).toEqual([])
  })
})

describe('summariseMetric', () => {
  it('averages the recorded days and ignores the gaps', () => {
    const { mean, days } = summariseMetric(records, 'steps')
    expect(mean).toBe(3000)
    expect(days).toBe(3)
  })

  it('keeps gaps as null in the series so the chart never plots a zero', () => {
    expect(summariseMetric(records, 'steps').series[1]).toEqual({
      date: '2026-09-02',
      value: null,
    })
  })

  it('reports no mean when nothing was recorded', () => {
    expect(summariseMetric(records, 'sleep')).toEqual({
      mean: null,
      series: records.map((r) => ({ date: r.date, value: null })),
      days: 0,
    })
  })
})
