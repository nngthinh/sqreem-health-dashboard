import { describe, expect, it } from 'vitest'
import { generateDataset, getDatasetFor } from '../index'

const END = '2026-09-20'
const records = generateDataset({ seed: 20260921, endDate: END, days: 90 })

const mean = (xs: (number | null)[]) => {
  const vals = xs.filter((x): x is number => x !== null)
  return vals.reduce((a, b) => a + b, 0) / vals.length
}
const lastN = (n: number) => records.slice(-n)

describe('shape', () => {
  it('produces 90 daily records, oldest first, ending on the end date', () => {
    expect(records).toHaveLength(90)
    expect(records.at(-1)?.date).toBe(END)
    expect(records[0]?.date).toBe('2026-06-23')
  })

  it('is deterministic for a given seed', () => {
    const again = generateDataset({ seed: 20260921, endDate: END, days: 90 })
    expect(again).toEqual(records)
  })

  it('differs for a different seed', () => {
    const other = generateDataset({ seed: 1, endDate: END, days: 90 })
    expect(other).not.toEqual(records)
  })
})

describe('the story: steps are the mover', () => {
  it('averages roughly 7,200 a day across the window', () => {
    expect(mean(records.map((r) => r.steps))).toBeGreaterThan(6900)
    expect(mean(records.map((r) => r.steps))).toBeLessThan(7700)
  })

  it('drops to roughly 6,100 in the last seven days', () => {
    expect(mean(lastN(7).map((r) => r.steps))).toBeGreaterThan(5700)
    expect(mean(lastN(7).map((r) => r.steps))).toBeLessThan(6500)
  })

  it('falls at least 10% against the previous seven days, so it clears significance', () => {
    const current = mean(lastN(7).map((r) => r.steps))
    const previous = mean(records.slice(-14, -7).map((r) => r.steps))
    expect((current - previous) / previous).toBeLessThan(-0.1)
  })
})

describe('the story: sleep debt is masked by the average', () => {
  const last30 = records.slice(-30)

  it('averages near 7h, which reads as roughly fine', () => {
    expect(mean(last30.map((r) => r.sleepHours))).toBeGreaterThan(6.7)
    expect(mean(last30.map((r) => r.sleepHours))).toBeLessThan(7.2)
  })

  it('but actually hits the 7.5h target on about 2 nights in 7', () => {
    const met = last30.filter((r) => r.sleepHours !== null && r.sleepHours >= 7.5).length
    const recorded = last30.filter((r) => r.sleepHours !== null).length
    expect(met / recorded).toBeGreaterThan(0.2)
    expect(met / recorded).toBeLessThan(0.38)
  })
})

describe('the story: calories fail steadily without moving', () => {
  it('sits roughly 20% under the 500 kcal target', () => {
    const m = mean(records.map((r) => r.calories))
    expect(m).toBeGreaterThan(370)
    expect(m).toBeLessThan(430)
  })

  it('never once hits the target across the whole window', () => {
    expect(records.filter((r) => r.calories !== null && r.calories >= 500)).toHaveLength(0)
  })

  it('moves less than 10% week on week, so it does not clear significance', () => {
    const current = mean(lastN(7).map((r) => r.calories))
    const previous = mean(records.slice(-14, -7).map((r) => r.calories))
    expect(Math.abs((current - previous) / previous)).toBeLessThan(0.1)
  })
})

describe('honest gaps', () => {
  it('has a contiguous 10-day distance hole', () => {
    const missing = records.map((r, i) => (r.distanceKm === null ? i : -1)).filter((i) => i >= 0)
    const contiguous = missing.filter((i) => missing.includes(i + 1) || missing.includes(i - 1))
    expect(contiguous.length).toBeGreaterThanOrEqual(10)
  })

  it('scatters single missing days across the other metrics', () => {
    expect(records.some((r) => r.steps === null)).toBe(true)
    expect(records.some((r) => r.sleepHours === null)).toBe(true)
  })

  it('always records the two most recent days, so Today’s read is never empty', () => {
    for (const r of lastN(2)) {
      expect(r.steps).not.toBeNull()
      expect(r.sleepHours).not.toBeNull()
      expect(r.calories).not.toBeNull()
    }
  })

  it('never uses zero to mean missing', () => {
    expect(records.every((r) => r.steps === null || r.steps > 0)).toBe(true)
  })
})

describe('corroboration', () => {
  it('moves distance in lockstep with steps', () => {
    const paired = records.filter((r) => r.steps !== null && r.distanceKm !== null)
    for (const r of paired) {
      const implied = (r.steps as number) * 0.00072
      expect(Math.abs((r.distanceKm as number) - implied) / implied).toBeLessThan(0.2)
    }
  })
})

describe('getDatasetFor', () => {
  it('resolves every user to the Daniel fixture, the multi-tenancy seam', () => {
    const a = getDatasetFor('user-a', END)
    const b = getDatasetFor('user-b', END)
    expect(a.persona.name).toBe('Daniel Tan')
    expect(a.records).toEqual(b.records)
  })

  it('returns exactly three per-day goals', () => {
    const { goals } = getDatasetFor('user-a', END)
    expect(goals.map((g) => g.goalId).sort()).toEqual(['calories', 'sleep', 'steps'])
    expect(goals.every((g) => g.cadence === 'day')).toBe(true)
  })

  it('rolls the window so it always ends today', () => {
    const { records: r } = getDatasetFor('user-a')
    const today = new Date().toISOString().slice(0, 10)
    expect(r.at(-1)?.date).toBe(today)
  })
})
