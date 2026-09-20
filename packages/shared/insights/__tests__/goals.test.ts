import { describe, expect, it } from 'vitest'
import type { DailyRecord, Goal } from '../../schema/index.js'
import { computeGoalProgress } from '../goals.js'

const sleepGoal: Goal = {
  goalId: 'sleep',
  metricId: 'sleep',
  label: 'Sleep',
  target: 7.5,
  unit: 'h',
  cadence: 'day',
}

const day = (date: string, sleepHours: number | null): DailyRecord => ({
  date,
  steps: 5000,
  distanceKm: 3.6,
  calories: 400,
  sleepHours,
  workouts: [],
})

describe('computeGoalProgress', () => {
  it('reports attainment as the mean over the target', () => {
    const records = Array.from({ length: 7 }, (_, i) => day(`2026-09-${14 + i}`, 7.5))

    expect(computeGoalProgress(records, sleepGoal, 7)?.attainment).toBeCloseTo(1, 5)
  })

  it('reports adherence separately, so a healthy average cannot hide a failure', () => {
    // 5 weeknights at 6.25h, 2 weekend nights at 8.67h -> mean 6.94, attainment 93%
    const records = [
      day('2026-09-14', 6.25),
      day('2026-09-15', 6.25),
      day('2026-09-16', 6.25),
      day('2026-09-17', 6.25),
      day('2026-09-18', 6.25),
      day('2026-09-19', 8.67),
      day('2026-09-20', 8.67),
    ]

    const progress = computeGoalProgress(records, sleepGoal, 7)

    expect(progress?.attainment).toBeCloseTo(0.925, 2)
    expect(progress?.met).toBe(2)
    expect(progress?.of).toBe(7)
  })

  it('excludes gaps from the mean and from the denominator, rather than zeroing them', () => {
    const records = [
      day('2026-09-14', 8),
      day('2026-09-15', null),
      day('2026-09-16', 8),
      day('2026-09-17', 8),
      day('2026-09-18', 8),
      day('2026-09-19', 8),
      day('2026-09-20', 8),
    ]

    const progress = computeGoalProgress(records, sleepGoal, 7)

    expect(progress?.of).toBe(6) // "met 6 of 6 nights", not "6 of 7"
    expect(progress?.met).toBe(6)
    expect(progress?.mean).toBeCloseTo(8, 5)
  })

  it('returns null when every day in range is a gap, rather than 0%', () => {
    const records = Array.from({ length: 7 }, (_, i) => day(`2026-09-${14 + i}`, null))

    expect(computeGoalProgress(records, sleepGoal, 7)).toBeNull()
  })

  it('counts a day exactly on target as met', () => {
    expect(computeGoalProgress([day('2026-09-20', 7.5)], sleepGoal, 7)?.met).toBe(1)
  })

  it('bands status from adherence, not from attainment', () => {
    const highAverageLowAdherence = [
      day('2026-09-14', 6),
      day('2026-09-15', 6),
      day('2026-09-16', 6),
      day('2026-09-17', 6),
      day('2026-09-18', 6),
      day('2026-09-19', 11),
      day('2026-09-20', 11),
    ]

    expect(computeGoalProgress(highAverageLowAdherence, sleepGoal, 7)?.status).toBe('watch')
  })

  it('reads only the last `range` days', () => {
    const records = [
      ...Array.from({ length: 10 }, (_, i) => day(`2026-09-${String(i + 1).padStart(2, '0')}`, 4)),
      ...Array.from({ length: 7 }, (_, i) => day(`2026-09-${14 + i}`, 8)),
    ]

    expect(computeGoalProgress(records, sleepGoal, 7)?.mean).toBeCloseTo(8, 5)
  })
})
