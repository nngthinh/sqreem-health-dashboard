import type { DailyRecord, Insights } from '@health/shared/schema'
import { ErrorCard } from '../states/ErrorCard'
import { SkeletonCard } from '../states/SkeletonCard'
import { FocusThisWeek } from './FocusThisWeek'
import { GoalsStrip } from './GoalsStrip'
import { RangeTabs } from './RangeTabs'
import { RecentActivities } from './RecentActivities'
import { TodaysRead } from './TodaysRead'
import { WhatChanged } from './WhatChanged'

/** What a section needs to render itself, whatever the fetching layer happens to be. */
export type SectionState<T> = {
  data: T | undefined
  isLoading: boolean
  isError: boolean
  onRetry: () => void
}

/**
 * Section order is the product argument: am I okay → what changed → what do I do
 * → the detail behind it.
 */
export function Home({
  insights,
  records,
}: {
  insights: SectionState<Insights>
  records: SectionState<DailyRecord[]>
}) {
  const renderInsights = () => {
    if (insights.isLoading) {
      return (
        <>
          <SkeletonCard lines={3} />
          <SkeletonCard lines={2} />
          <SkeletonCard lines={3} />
        </>
      )
    }

    if (insights.isError) {
      return (
        <ErrorCard
          title="Couldn't load your insights"
          message="The dashboard could not reach the server."
          onRetry={insights.onRetry}
        />
      )
    }

    if (!insights.data) return null

    return (
      <>
        <TodaysRead insights={insights.data} />
        <WhatChanged insights={insights.data} />
        <FocusThisWeek insights={insights.data} />
        <GoalsStrip insights={insights.data} />

        {insights.data.coverage.length > 0 && (
          <ul className="space-y-1 text-xs text-ink-muted">
            {insights.data.coverage.map((note) => (
              <li key={note.metricId}>{note.message}</li>
            ))}
          </ul>
        )}
      </>
    )
  }

  // Recent activities resolves on its own: one broken section never blanks the page.
  const renderActivities = () => {
    if (records.isError) {
      return <ErrorCard title="Couldn't load recent activities" onRetry={records.onRetry} />
    }

    if (!records.data) return <SkeletonCard lines={3} />

    return <RecentActivities records={records.data} />
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <div className="flex justify-end">
        <RangeTabs />
      </div>

      {renderInsights()}
      {renderActivities()}
    </div>
  )
}
