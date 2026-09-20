import { Confidence, Direction, type Insights, type ReadinessDriver } from '@health/shared/schema'
import { ReadinessRing } from '../charts/ReadinessRing'

function driverToneClass(direction: ReadinessDriver['direction']): string {
  if (direction === Direction.Down) return 'text-watch'

  if (direction === Direction.Up) return 'text-good'

  return ''
}

export function TodaysRead({ insights }: { insights: Insights }) {
  const { readiness } = insights

  return (
    <section aria-labelledby="today-heading">
      <h2 id="today-heading" className="mb-3 text-xs uppercase tracking-wide text-ink-muted">
        Today&rsquo;s read
      </h2>

      <div className="flex flex-col gap-5 rounded-card border border-line bg-surface-raised p-4 sm:flex-row sm:items-center">
        <ReadinessRing score={readiness.score} band={readiness.band} />

        {/* The score alone is a black box; the drivers make it actionable, and they
            are the same drivers the assistant cites when asked about it. */}
        {readiness.drivers.length === 0 && (
          <p className="flex-1 text-sm text-ink-muted">
            Nothing recorded in this range yet, so there is no score to break down.
          </p>
        )}

        <ul className="flex-1 space-y-2">
          {readiness.drivers.map((driver) => (
            <li key={driver.metricId} className="flex items-baseline justify-between gap-4 text-sm">
              <span className="text-ink-muted">{driver.label}</span>
              <span className={`figure text-right ${driverToneClass(driver.direction)}`}>
                {driver.explanation}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {readiness.confidence === Confidence.Partial && (
        <p className="mt-2 text-xs text-ink-muted">
          Lower confidence: no {readiness.droppedTerms.join(' or ')} recorded, so those terms were
          left out rather than counted as zero.
        </p>
      )}
    </section>
  )
}
