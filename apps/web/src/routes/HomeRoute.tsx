import { Home } from '../components/dashboard/Home'
import { useAppSelector } from '../store'
import { useGetInsightsQuery, useGetRecordsQuery } from '../store/api/dataApi'

/** The route owns the data wiring; everything visual lives in Home. */
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
    <Home
      insights={{
        data: insightsQuery.data,
        isLoading: insightsQuery.isLoading,
        isError: insightsQuery.isError,
        onRetry: handleRetryInsights,
      }}
      records={{
        data: recordsQuery.data?.records,
        isLoading: recordsQuery.isLoading,
        isError: recordsQuery.isError,
        onRetry: handleRetryRecords,
      }}
    />
  )
}
