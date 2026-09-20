import type { DailyRecord } from '@health/shared/schema'
import { format, parseISO } from 'date-fns'
import { EmptyCard } from '../states/EmptyCard'

const MAX_ITEMS = 6

/** A day can hold several workouts, so the id is fixed here rather than at render time. */
function toRecentItems(records: DailyRecord[]) {
  return records
    .flatMap((record) =>
      record.workouts.map((workout, index) => ({
        ...workout,
        date: record.date,
        id: `${record.date}-${index}`,
      })),
    )
    .slice(-MAX_ITEMS)
    .reverse()
}

export function RecentActivities({ records }: { records: DailyRecord[] }) {
  const items = toRecentItems(records)

  return (
    <section aria-labelledby="activity-heading">
      <h2 id="activity-heading" className="mb-3 text-xs uppercase tracking-wide text-ink-muted">
        Recent activities
      </h2>

      {items.length === 0 ? (
        <EmptyCard title="No workouts logged" message="Nothing recorded in this range." />
      ) : (
        <ul className="divide-y divide-line rounded-card border border-line bg-surface-raised">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="capitalize">{item.type}</span>
              <span className="figure text-ink-muted">
                {item.durationMin} min · {item.calories} kcal ·{' '}
                {format(parseISO(item.date), 'MMM d')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
