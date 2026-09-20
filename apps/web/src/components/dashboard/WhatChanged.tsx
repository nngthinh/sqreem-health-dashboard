import { Band, Direction, type Insights, METRIC_LABELS } from '@health/shared/schema'
import { Link } from 'react-router'
import { formatDelta, formatMetric } from '../../lib/format'
import { TONE_TEXT } from '../../lib/tone'
import { Sparkline } from '../charts/Sparkline'

export function WhatChanged({ insights }: { insights: Insights }) {
  const movers = insights.movers.flatMap((metricId) => {
    const trend = insights.trends.find((candidate) => candidate.metricId === metricId)
    return trend ? [trend] : []
  })

  return (
    <section aria-labelledby="changed-heading">
      <h2 id="changed-heading" className="mb-3 text-xs uppercase tracking-wide text-ink-muted">
        What changed{' '}
        <span className="normal-case">
          (last {insights.range}d vs previous {insights.range}d)
        </span>
      </h2>

      {movers.length === 0 && (
        <p className="text-sm text-ink-muted">
          Nothing moved much this week. That is a result too.
        </p>
      )}

      {movers.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {movers.map((trend) => {
            const tone = trend.direction === Direction.Down ? Band.Watch : Band.Good

            return (
              <Link
                key={trend.metricId}
                to={`/metric/${trend.metricId}`}
                className="rounded-card border border-line bg-surface-raised p-4 hover:border-ink-muted"
              >
                <div data-testid={`mover-${trend.metricId}`}>
                  <p className="text-sm text-ink-muted">{METRIC_LABELS[trend.metricId]}</p>
                  <p className="figure mt-1 text-2xl">
                    {formatMetric(trend.current, trend.metricId)}
                  </p>
                  <p className={`mt-1 text-sm ${TONE_TEXT[tone]}`}>
                    {formatDelta(trend.deltaPct)} vs previous
                  </p>
                  <div className="mt-2">
                    <Sparkline series={trend.series} tone={tone} />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {insights.steady.length > 0 && (
        // A dashboard that shouts equally about everything communicates nothing,
        // so the metrics that held their line get one shared line, not four cards.
        <p className="mt-3 text-sm text-ink-muted">
          · steady: {insights.steady.map((id) => METRIC_LABELS[id].toLowerCase()).join(', ')}
        </p>
      )}
    </section>
  )
}
