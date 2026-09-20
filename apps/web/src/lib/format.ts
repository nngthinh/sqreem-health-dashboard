import { METRIC_UNITS, type MetricId } from '@health/shared/schema'

/** A gap reads as an em dash, never as a zero. */
export function formatMetric(value: number | null, metricId: MetricId): string {
  if (value === null) return '—'

  switch (metricId) {
    case 'steps':
      return Math.round(value).toLocaleString()
    case 'distance':
      return `${value.toFixed(1)} ${METRIC_UNITS.distance}`
    case 'calories':
      return `${Math.round(value)} ${METRIC_UNITS.calories}`
    case 'sleep': {
      const hours = Math.floor(value)
      const minutes = Math.round((value - hours) * 60)
      return `${hours}h${String(minutes).padStart(2, '0')}m`
    }
  }
}

/** Magnitude only — the direction is drawn as an icon beside it. */
export function formatDelta(deltaPct: number | null): string {
  if (deltaPct === null) return 'no comparison'

  return `${Math.abs(Math.round(deltaPct))}%`
}
