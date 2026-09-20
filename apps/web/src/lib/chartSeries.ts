import type { SparkPoint } from '@health/shared/schema'

export type ChartPoint = { date: string; value: number; isGap: boolean }

/**
 * A gap is stored as null everywhere upstream — means, deltas and adherence all
 * exclude it. Charts plot it as 0, so `isGap` keeps the distinction available to
 * anything that needs to mark the point differently.
 */
export function toChartPoints(series: SparkPoint[]): ChartPoint[] {
  return series.map((point) => ({
    date: point.date,
    value: point.value ?? 0,
    isGap: point.value === null,
  }))
}
