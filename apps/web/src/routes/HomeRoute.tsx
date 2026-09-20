import { FocusThisWeek } from '../components/dashboard/FocusThisWeek'
import { GoalsStrip } from '../components/dashboard/GoalsStrip'
import { RecentActivities } from '../components/dashboard/RecentActivities'
import { TodaysRead } from '../components/dashboard/TodaysRead'
import { WhatChanged } from '../components/dashboard/WhatChanged'
import { ErrorCard } from '../components/states/ErrorCard'
import { SkeletonCard } from '../components/states/SkeletonCard'
import { useAppSelector } from '../store'
import { useGetInsightsQuery, useGetRecordsQuery } from '../store/api/dataApi'

/**
 * Section order is the product argument: am I okay → what changed → what do I do
 * → the detail behind it.
 */
export function HomeRoute() {
  const range = useAppSelector((state) => state.ui.range)

  const insightsQuery = useGetInsightsQuery(range)
  const recordsQuery = useGetRecordsQuery({})

  const handleRetryInsights = () => {
    void insightsQuery.refetch()
  }

  const handleRetryRecords = () => {
    void recordsQuery.refetch()
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      {insightsQuery.isLoading && (
        <>
          <SkeletonCard lines={3} />
          <SkeletonCard lines={2} />
          <SkeletonCard lines={3} />
        </>
      )}

      {insightsQuery.isError && (
        <ErrorCard
          title="Couldn't load your insights"
          message="The dashboard could not reach the server."
          onRetry={handleRetryInsights}
        />
      )}

      {insightsQuery.data && (
        <>
          <TodaysRead insights={insightsQuery.data} />
          <WhatChanged insights={insightsQuery.data} />
          <FocusThisWeek insights={insightsQuery.data} />
          <GoalsStrip insights={insightsQuery.data} />

          {insightsQuery.data.coverage.length > 0 && (
            <ul className="space-y-1 text-xs text-ink-muted">
              {insightsQuery.data.coverage.map((note) => (
                <li key={note.metricId}>{note.message}</li>
              ))}
            </ul>
          )}
        </>
      )}

      {/* Recent activities fails on its own: one broken section never blanks the page. */}
      {recordsQuery.isError && (
        <ErrorCard title="Couldn't load recent activities" onRetry={handleRetryRecords} />
      )}

      {!recordsQuery.isError &&
        (recordsQuery.data ? (
          <RecentActivities records={recordsQuery.data.records} />
        ) : (
          <SkeletonCard lines={3} />
        ))}
    </div>
  )
}
