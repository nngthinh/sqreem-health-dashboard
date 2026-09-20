import { sleepStepCorrelation } from '@health/shared/insights'
import type { DailyRecord } from '@health/shared/schema'

const MIN_NOTEWORTHY_PCT = 5

export function CorrelationCallout({ records }: { records: DailyRecord[] }) {
  const correlation = sleepStepCorrelation(records)
  if (correlation === null || Math.abs(correlation.pct) < MIN_NOTEWORTHY_PCT) return null

  const direction = correlation.pct > 0 ? 'higher' : 'lower'

  return (
    <p className="rounded-card border border-line bg-surface-raised p-4 text-sm">
      Your step count is <span className="figure">{Math.abs(Math.round(correlation.pct))}%</span>{' '}
      {direction} on days following 7+ hours of sleep ({correlation.goodNights} such nights against{' '}
      {correlation.otherNights} shorter ones in this range).
    </p>
  )
}
