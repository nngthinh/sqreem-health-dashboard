import { Band, Direction, type Insights, METRIC_LABELS } from '@health/shared/schema'
import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { Link } from 'react-router'
import { formatDelta, formatMetric } from '../../lib/format'
import { TONE_TEXT } from '../../lib/tone'
import { Sparkline } from '../charts/Sparkline'

export function WhatChanged({ insights }: { insights: Insights }) {
  const movers = insights.movers.flatMap((metricId) => {
    const trend = insights.trends.find((candidate) => candidate.metricId === metricId)
    return trend ? [trend] : []
  })

  const renderMovers = () => {
    if (movers.length === 0) {
      return (
        <p className="text-sm text-ink-muted">
          Nothing moved much this week. That is a result too.
        </p>
      )
    }

    return (
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

                <p className={`mt-1 flex items-center gap-1.5 text-sm ${TONE_TEXT[tone]}`}>
                  <DirectionIcon direction={trend.direction} />
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
    )
  }

  return (
    <section aria-labelledby="changed-heading">
      <h2 id="changed-heading" className="mb-3 text-xs uppercase tracking-wide text-ink-muted">
        What changed{' '}
        <span className="normal-case">
          (last {insights.range}d vs previous {insights.range}d)
        </span>
      </h2>

      {renderMovers()}

      {insights.steady.length > 0 && (
        // A dashboard that shouts equally about everything communicates nothing,
        // so the metrics that held their line get one shared line, not four cards.
        <p className="mt-3 text-sm text-ink-muted">
          steady: {insights.steady.map((id) => METRIC_LABELS[id].toLowerCase()).join(', ')}
        </p>
      )}
    </section>
  )
}

const DIRECTION_ICONS = {
  [Direction.Up]: TrendingUp,
  [Direction.Down]: TrendingDown,
  [Direction.Flat]: Minus,
}

const DIRECTION_LABELS = {
  [Direction.Up]: 'up',
  [Direction.Down]: 'down',
  [Direction.Flat]: 'flat',
}

function DirectionIcon({ direction }: { direction: Direction }) {
  const Icon = DIRECTION_ICONS[direction]

  return <Icon size={16} aria-label={DIRECTION_LABELS[direction]} />
}
