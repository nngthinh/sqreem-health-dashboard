import { Band, type BlockKind, type InsightBlock, METRIC_LABELS } from '@health/shared/schema'
import { recordsInPeriod, summariseMetric } from '../../../lib/blockWindow'
import { formatDelta, formatMetric } from '../../../lib/format'
import { TONE_TEXT } from '../../../lib/tone'
import { useGetRecordsQuery } from '../../../store/api/dataApi'
import { EmptyCard } from '../../states/EmptyCard'
import { ErrorCard } from '../../states/ErrorCard'
import { SkeletonCard } from '../../states/SkeletonCard'
import { BlockCard } from './BlockCard'
import { formatPeriod } from './period'

type ComparisonBlockProps = { block: Extract<InsightBlock, { kind: BlockKind.Comparison }> }

function percentChange(from: number, to: number): number | null {
  return from === 0 ? null : ((to - from) / from) * 100
}

export function ComparisonBlock({ block }: ComparisonBlockProps) {
  const { data, isLoading, isError, refetch } = useGetRecordsQuery({})

  const handleRetry = () => {
    void refetch()
  }

  if (isLoading) return <SkeletonCard lines={2} />

  if (isError || !data) {
    return <ErrorCard title="Couldn't load this comparison" onRetry={handleRetry} />
  }

  const label = METRIC_LABELS[block.metricId]
  const earlier = summariseMetric(recordsInPeriod(data.records, block.periodA), block.metricId)
  const later = summariseMetric(recordsInPeriod(data.records, block.periodB), block.metricId)

  if (earlier.mean === null || later.mean === null) {
    return (
      <EmptyCard
        title={`Can't compare ${label.toLowerCase()}`}
        message="One of these periods has nothing recorded in it."
      />
    )
  }

  const deltaPct = percentChange(earlier.mean, later.mean)
  const tone = deltaPct !== null && deltaPct < 0 ? Band.Watch : Band.Good

  return (
    <BlockCard caption={`${label} · two periods compared`}>
      <dl className="mt-2 grid grid-cols-2 gap-3">
        <div>
          <dt className="text-xs text-ink-muted">{formatPeriod(block.periodA)}</dt>
          <dd className="figure text-lg">{formatMetric(earlier.mean, block.metricId)}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">{formatPeriod(block.periodB)}</dt>
          <dd className="figure text-lg">{formatMetric(later.mean, block.metricId)}</dd>
        </div>
      </dl>

      <p className={`mt-2 text-sm ${TONE_TEXT[tone]}`}>
        {deltaPct === null
          ? 'no comparison'
          : `${formatDelta(deltaPct)} ${deltaPct < 0 ? 'lower' : 'higher'}`}
      </p>
    </BlockCard>
  )
}
