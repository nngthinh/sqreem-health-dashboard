import { useParams } from 'react-router'

export function MetricRoute() {
  const { metricId } = useParams()
  return <p className="text-ink-muted">Drill-down for {metricId} lands in Task 16.</p>
}
