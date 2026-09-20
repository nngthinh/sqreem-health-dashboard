import { meanOrNull, metricValue, presentValues } from '@health/shared/insights'
import type { DailyRecord, MetricId, Period, SparkPoint } from '@health/shared/schema'

export type MetricWindow = { mean: number | null; series: SparkPoint[]; days: number }

/**
 * Both bounds inclusive. ISO dates sort lexicographically, so the raw strings
 * compare correctly without parsing a single one into a Date.
 */
export function recordsInPeriod(records: DailyRecord[], period: Period): DailyRecord[] {
  return records.filter((record) => record.date >= period.from && record.date <= period.to)
}

/**
 * A chat block names a window; the figures inside it are drawn here from the same
 * records the dashboard uses, which is what makes an invented number impossible.
 */
export function summariseMetric(records: DailyRecord[], metricId: MetricId): MetricWindow {
  const present = presentValues(records, metricId)

  return {
    mean: meanOrNull(present),
    // Gaps stay null rather than zero: a day with no reading is unknown, not empty.
    series: records.map((record) => ({ date: record.date, value: metricValue(record, metricId) })),
    days: present.length,
  }
}
