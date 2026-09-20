import { weekdayBreakdown } from '@health/shared/insights'
import type { DailyRecord, MetricId } from '@health/shared/schema'
import { formatMetric } from '../../lib/format'

export function WeekdayBreakdown({
  records,
  metricId,
  goalTarget,
}: {
  records: DailyRecord[]
  metricId: MetricId
  goalTarget: number | null
}) {
  const rows = weekdayBreakdown(records, metricId)
  const max = Math.max(...rows.map((row) => row.mean ?? 0), goalTarget ?? 0)

  return (
    <section aria-labelledby="weekday-heading">
      <h2 id="weekday-heading" className="mb-3 text-xs uppercase tracking-wide text-ink-muted">
        By day of week
      </h2>
      <ul className="space-y-2">
        {rows.map((row) => (
          <li
            key={row.weekday}
            className="grid grid-cols-[3rem_1fr_6rem] items-center gap-3 text-sm"
          >
            <span className="text-ink-muted">{row.label}</span>
            <span className="h-2 rounded-full bg-line">
              <span
                className={`block h-full rounded-full ${
                  goalTarget !== null && (row.mean ?? 0) >= goalTarget ? 'bg-good' : 'bg-watch'
                }`}
                style={{ width: max > 0 ? `${((row.mean ?? 0) / max) * 100}%` : '0%' }}
              />
            </span>
            <span className="figure text-right">
              {row.mean === null ? 'no data' : formatMetric(row.mean, metricId)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
