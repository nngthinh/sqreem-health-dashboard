import { sliceRange } from '@health/shared/insights'
import { METRIC_IDS, METRIC_LABELS, type MetricId } from '@health/shared/schema'
import { Link, Navigate, useParams } from 'react-router'
import { MetricChart } from '../components/charts/MetricChart'
import { RangeTabs } from '../components/dashboard/RangeTabs'
import { CorrelationCallout } from '../components/metric/CorrelationCallout'
import { RecordsTable } from '../components/metric/RecordsTable'
import { WeekdayBreakdown } from '../components/metric/WeekdayBreakdown'
import { ErrorCard } from '../components/states/ErrorCard'
import { SkeletonCard } from '../components/states/SkeletonCard'
import { useAppSelector } from '../store'
import { useGetProfileQuery, useGetRecordsQuery } from '../store/api/dataApi'

export function MetricRoute() {
  const { metricId } = useParams()
  const range = useAppSelector((state) => state.ui.range)
  const recordsQuery = useGetRecordsQuery({})
  const profileQuery = useGetProfileQuery()

  if (!metricId || !METRIC_IDS.includes(metricId as MetricId)) return <Navigate to="/" replace />
  const id = metricId as MetricId

  if (recordsQuery.isError) {
    return (
      <ErrorCard title="Couldn't load this metric" onRetry={() => void recordsQuery.refetch()} />
    )
  }

  if (!recordsQuery.data) return <SkeletonCard lines={6} />

  const windowed = sliceRange(recordsQuery.data.records, range)
  const goal = profileQuery.data?.goals.find((g) => g.metricId === id) ?? null

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-7">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/" className="text-sm text-ink-muted hover:text-ink">
          ← Home
        </Link>
        <h1 className="flex-1 text-lg font-medium">{METRIC_LABELS[id]}</h1>
        <RangeTabs />
      </div>

      <MetricChart records={windowed} metricId={id} goalTarget={goal?.target ?? null} />
      <CorrelationCallout records={windowed} />
      <WeekdayBreakdown records={windowed} metricId={id} goalTarget={goal?.target ?? null} />
      <RecordsTable records={windowed} metricId={id} />
    </div>
  )
}
