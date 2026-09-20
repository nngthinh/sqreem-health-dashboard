import type { DailyRecord, MetricId } from '../schema/index.js'
import { meanOrNull, metricValue } from './window.js'

const LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

const SLEEP_GOOD_THRESHOLD = 7
const MIN_PAIRS_PER_SIDE = 3

export function weekdayBreakdown(
  records: DailyRecord[],
  metricId: MetricId,
): { weekday: number; label: string; mean: number | null; days: number }[] {
  const buckets: number[][] = Array.from({ length: 7 }, () => [])

  for (const record of records) {
    const value = metricValue(record, metricId)
    if (value === null) continue
    const jsDay = new Date(`${record.date}T00:00:00`).getDay() // 0 = Sunday
    const index = (jsDay + 6) % 7 // Monday first
    buckets[index]?.push(value)
  }

  return buckets.map((values, index) => ({
    weekday: index,
    label: LABELS[index] as string,
    mean: meanOrNull(values),
    days: values.length,
  }))
}

/**
 * "Your step count is N% higher on days following 7+ hours of sleep" — computed
 * from the records, never invented. Returns null rather than a weak claim when
 * either side is too thin.
 */
export function sleepStepCorrelation(
  records: DailyRecord[],
): { pct: number; goodNights: number; otherNights: number } | null {
  const after: { sleptWell: boolean; steps: number }[] = []

  for (let i = 0; i < records.length - 1; i++) {
    const night = records[i]
    const nextDay = records[i + 1]
    if (!night || !nextDay) continue
    if (night.sleepHours === null || nextDay.steps === null) continue
    after.push({ sleptWell: night.sleepHours >= SLEEP_GOOD_THRESHOLD, steps: nextDay.steps })
  }

  const good = after.filter((a) => a.sleptWell).map((a) => a.steps)
  const other = after.filter((a) => !a.sleptWell).map((a) => a.steps)
  if (good.length < MIN_PAIRS_PER_SIDE || other.length < MIN_PAIRS_PER_SIDE) return null

  const goodMean = meanOrNull(good)
  const otherMean = meanOrNull(other)
  if (goodMean === null || otherMean === null || otherMean === 0) return null

  return {
    pct: ((goodMean - otherMean) / otherMean) * 100,
    goodNights: good.length,
    otherNights: other.length,
  }
}
