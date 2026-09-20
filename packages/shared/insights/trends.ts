import type { DailyRecord, MetricId, Range, SparkPoint, Trend } from '../schema/index.js'
import { Direction, METRIC_LABELS, METRIC_UNITS } from '../schema/index.js'
import { meanOrNull, metricValue, presentValues } from './window.js'

/** A move smaller than this is noise, and a dashboard that shouts about noise communicates nothing. */
export const SIGNIFICANCE_PCT = 10

/** Below this many recorded days in either period, we do not have enough to call anything. */
export const MIN_SAMPLE_DAYS = 4

function percentChange(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null

  return ((current - previous) / previous) * 100
}

function directionOf(deltaPct: number | null, significant: boolean): Direction {
  if (!significant || deltaPct === null) return Direction.Flat

  return deltaPct > 0 ? Direction.Up : Direction.Down
}

export function computeTrend(records: DailyRecord[], metricId: MetricId, range: Range): Trend {
  const currentWindow = records.slice(-range)
  const previousWindow = records.slice(-range * 2, -range)

  const currentValues = presentValues(currentWindow, metricId)
  const previousValues = presentValues(previousWindow, metricId)

  const current = meanOrNull(currentValues)
  const previous = meanOrNull(previousValues)
  const deltaPct = percentChange(current, previous)

  const significant =
    deltaPct !== null &&
    Math.abs(deltaPct) >= SIGNIFICANCE_PCT &&
    currentValues.length >= MIN_SAMPLE_DAYS &&
    previousValues.length >= MIN_SAMPLE_DAYS

  const series: SparkPoint[] = currentWindow.map((record) => ({
    date: record.date,
    value: metricValue(record, metricId), // gaps stay null: zeroes lie
  }))

  return {
    metricId,
    label: METRIC_LABELS[metricId],
    unit: METRIC_UNITS[metricId],
    current,
    previous,
    deltaPct,
    direction: directionOf(deltaPct, significant),
    significant,
    sampleDays: currentValues.length,
    series,
  }
}

/** "What changed" shows only movers; everything else collapses into one steady line. */
export function splitMovers(trends: Trend[]): { movers: MetricId[]; steady: MetricId[] } {
  const movers = trends
    .filter((trend) => trend.significant)
    .sort((a, b) => Math.abs(b.deltaPct ?? 0) - Math.abs(a.deltaPct ?? 0))
    .map((trend) => trend.metricId)

  const steady = trends.filter((trend) => !trend.significant).map((trend) => trend.metricId)

  return { movers, steady }
}
