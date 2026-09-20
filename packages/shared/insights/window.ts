import type { DailyRecord, MetricId, Range } from '../schema/index.js'

/** The one place that maps a metric id onto its field, so nothing else has to know the record shape. */
export function metricValue(record: DailyRecord, metricId: MetricId): number | null {
  switch (metricId) {
    case 'steps':
      return record.steps
    case 'distance':
      return record.distanceKm
    case 'calories':
      return record.calories
    case 'sleep':
      return record.sleepHours
  }
}

/** Records are oldest-first, so the last `range` entries are the range. */
export function sliceRange(records: DailyRecord[], range: Range): DailyRecord[] {
  return records.slice(-range)
}

/** Drops the gaps instead of zeroing them — a missing day is unknown, not a day of nothing. */
export function presentValues(records: DailyRecord[], metricId: MetricId): number[] {
  return records.map((record) => metricValue(record, metricId)).filter((value) => value !== null)
}

export function meanOrNull(values: number[]): number | null {
  if (values.length === 0) return null

  return values.reduce((sum, value) => sum + value, 0) / values.length
}
