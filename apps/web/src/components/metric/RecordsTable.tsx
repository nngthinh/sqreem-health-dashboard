import { metricValue } from '@health/shared/insights'
import type { DailyRecord, MetricId } from '@health/shared/schema'
import { format, parseISO } from 'date-fns'
import { formatMetric } from '../../lib/format'

export function RecordsTable({
  records,
  metricId,
}: {
  records: DailyRecord[]
  metricId: MetricId
}) {
  return (
    <section aria-labelledby="records-heading">
      <h2 id="records-heading" className="mb-3 text-xs uppercase tracking-wide text-ink-muted">
        The numbers
      </h2>
      <div className="max-h-80 overflow-auto rounded-card border border-line">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-surface-raised text-left text-ink-muted">
            <tr>
              <th scope="col" className="px-3 py-2 font-normal">
                Date
              </th>
              <th scope="col" className="px-3 py-2 text-right font-normal">
                Value
              </th>
            </tr>
          </thead>
          <tbody>
            {[...records].reverse().map((record) => {
              const value = metricValue(record, metricId)
              return (
                <tr key={record.date} className="border-t border-line">
                  <td className="px-3 py-1.5">{format(parseISO(record.date), 'EEE d MMM')}</td>
                  <td className="figure px-3 py-1.5 text-right">
                    {value === null ? (
                      <span className="text-ink-muted">not recorded</span>
                    ) : (
                      formatMetric(value, metricId)
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
