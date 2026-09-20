import { describe, expect, it } from 'vitest'
import { GOALS } from '../../data/persona.js'
import type { DailyRecord } from '../../schema/index.js'
import { computeReadiness } from '../readiness.js'

const build = (
  overrides: Partial<Pick<DailyRecord, 'steps' | 'calories' | 'sleepHours'>>,
  count = 21,
): DailyRecord[] =>
  Array.from({ length: count }, (_, i) => ({
    date: `2026-08-${String(i + 1).padStart(2, '0')}`,
    steps: 8000,
    distanceKm: 5.8,
    calories: 500,
    sleepHours: 7.5,
    workouts: [],
    ...overrides,
  }))

describe('computeReadiness', () => {
  // A flat step history scores the steps term at 0.5 (parity with last week), so
  // an otherwise-perfect history lands at 0.5*1 + 0.3*0.5 + 0.2*1 = 0.85.
  it('scores an on-target history with flat steps at 85', () => {
    expect(computeReadiness(build({}), GOALS).score).toBe(85)
  })

  it('scores the steps term above parity only when the week actually improved', () => {
    const rising = build({})
    for (let i = rising.length - 7; i < rising.length; i++) {
      rising[i] = { ...(rising[i] as DailyRecord), steps: 9600 } // 1.2x the prior week
    }

    expect(computeReadiness(rising, GOALS).score).toBe(100)
  })

  it('weights sleep most heavily', () => {
    const poorSleep = computeReadiness(build({ sleepHours: 3.75 }), GOALS).score as number
    const poorCalories = computeReadiness(build({ calories: 250 }), GOALS).score as number

    expect(poorSleep).toBeLessThan(poorCalories)
  })

  it('renormalises the remaining weights when a term is null, rather than scoring it zero', () => {
    const records = build({})
    records[records.length - 1] = { ...(records.at(-1) as DailyRecord), sleepHours: null }

    const result = computeReadiness(records, GOALS)

    // Remaining weights 0.3 + 0.2 renormalise: (0.3*0.5 + 0.2*1.0) / 0.5 = 0.70.
    // Counting the missing night as a zero would have given 0.35 — half as much.
    expect(result.score).toBe(70)
    expect(result.confidence).toBe('partial')
    expect(result.droppedTerms).toEqual(['sleep'])
  })

  it('returns a null score only when every term is missing', () => {
    const result = computeReadiness(build({ steps: null, calories: null, sleepHours: null }), GOALS)

    expect(result.score).toBeNull()
    expect(result.confidence).toBe('partial')
  })

  it('clamps each term, so a spectacular night cannot paper over a collapse', () => {
    const records = build({ steps: 100, calories: 50 })
    records[records.length - 1] = { ...(records.at(-1) as DailyRecord), sleepHours: 11 }

    // 11h scores 1.0, not 11/7.5 = 1.47, so the ceiling holds: 0.5 + 0.15 + 0.02 = 0.67.
    expect(computeReadiness(records, GOALS).score).toBe(67)
  })

  it('always attaches the top drivers by absolute deviation, so it explains rather than oracles', () => {
    const records = build({ calories: 200 })
    records[records.length - 1] = { ...(records.at(-1) as DailyRecord), sleepHours: 5 }

    const drivers = computeReadiness(records, GOALS).drivers

    expect(drivers.length).toBeGreaterThanOrEqual(2)
    expect(drivers.length).toBeLessThanOrEqual(3)
    expect(Math.abs(drivers[0]?.deviation ?? 0)).toBeGreaterThanOrEqual(
      Math.abs(drivers[1]?.deviation ?? 0),
    )
  })

  it('bands the score', () => {
    expect(computeReadiness(build({}), GOALS).band).toBe('good') // 85

    const poor = build({ sleepHours: 3.75, steps: 3000, calories: 150 })

    expect(computeReadiness(poor, GOALS).band).toBe('watch')
  })
})
