import type { BlockKind, InsightBlock } from '@health/shared/schema'
import { useAppSelector } from '../../../store'
import { useGetInsightsQuery } from '../../../store/api/dataApi'
import { GoalBar } from '../../charts/GoalBar'
import { EmptyCard } from '../../states/EmptyCard'
import { ErrorCard } from '../../states/ErrorCard'
import { SkeletonCard } from '../../states/SkeletonCard'
import { BlockCard } from './BlockCard'

type GoalBlockProps = { block: Extract<InsightBlock, { kind: BlockKind.Goal }> }

export function GoalBlock({ block }: GoalBlockProps) {
  const range = useAppSelector((state) => state.ui.range)

  const { data, isLoading, isError, refetch } = useGetInsightsQuery(range)

  const handleRetry = () => {
    void refetch()
  }

  if (isLoading) return <SkeletonCard lines={2} />

  if (isError || !data) {
    return <ErrorCard title="Couldn't load this goal" onRetry={handleRetry} />
  }

  const goal = data.goals.find((candidate) => candidate.goalId === block.goalId)

  if (!goal) {
    return (
      <EmptyCard
        title="No data for this goal"
        message="Nothing was recorded for it in this range."
      />
    )
  }

  return (
    <BlockCard caption={`${goal.label} · last ${range} days`}>
      <div className="mt-2">
        <GoalBar attainment={goal.attainment} tone={goal.status} />
      </div>

      <p className="figure mt-2 text-sm text-ink-muted">
        {Math.round(goal.attainment * 100)}% of target · met {goal.met} of {goal.of} days
      </p>
    </BlockCard>
  )
}
