import { Band, type BlockKind, type InsightBlock, METRIC_LABELS } from '@health/shared/schema'
import { recordsInPeriod, summariseMetric } from '../../../lib/blockWindow'
import { formatMetric } from '../../../lib/format'
import { useAppSelector } from '../../../store'
import { useGetRecordsQuery } from '../../../store/api/dataApi'
import { Sparkline } from '../../charts/Sparkline'
import { EmptyCard } from '../../states/EmptyCard'
import { ErrorCard } from '../../states/ErrorCard'
import { SkeletonCard } from '../../states/SkeletonCard'
import { BlockCard } from './BlockCard'
import { formatPeriod } from './period'

type MetricBlockProps = { block: Extract<InsightBlock, { kind: BlockKind.Metric }> }

export function MetricBlock({ block }: MetricBlockProps) {
  const selectedRange = useAppSelector((state) => state.ui.range)

  // The whole retained window is one cache entry shared with the dashboard, so
  // slicing a block's window here costs no extra request.
  const { data, isLoading, isError, refetch } = useGetRecordsQuery({})

  const handleRetry = () => {
    void refetch()
  }

  if (isLoading) return <SkeletonCard lines={2} />

  if (isError || !data) {
    return <ErrorCard title="Couldn't load this chart" onRetry={handleRetry} />
  }

  const label = METRIC_LABELS[block.metricId]

  // A persisted block carries absolute dates so it keeps showing what the user saw;
  // a live one just names a range and follows the window they are looking at.
  const range = block.range ?? selectedRange
  const window = block.period
    ? recordsInPeriod(data.records, block.period)
    : data.records.slice(-range)
  const caption = block.period
    ? `${label} · ${formatPeriod(block.period)}`
    : `${label} · last ${range} days`

  const { mean, series, days } = summariseMetric(window, block.metricId)

  if (mean === null) {
    return (
      <EmptyCard
        title={`No ${label.toLowerCase()} data`}
        message="Nothing was recorded in this window."
      />
    )
  }

  return (
    <BlockCard caption={caption}>
      <p className="figure mt-1 text-xl">{formatMetric(mean, block.metricId)}</p>
      <p className="mt-0.5 text-xs text-ink-muted">daily average over {days} recorded days</p>

      <div className="mt-2">
        <Sparkline series={series} tone={Band.Steady} height={64} />
      </div>
    </BlockCard>
  )
}
