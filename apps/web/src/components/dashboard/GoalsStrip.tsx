import { Band, type GoalId, type Insights, METRIC_LABELS } from '@health/shared/schema'
import { TriangleAlert } from 'lucide-react'
import { GoalBar } from '../charts/GoalBar'

const EMPTY_COPY: Record<GoalId, string> = {
  steps: 'No steps recorded in this range — wear your band to see this goal.',
  sleep: 'No sleep recorded in this range — wear your band overnight to see this goal.',
  calories: 'No active calories recorded in this range — wear your band to see this goal.',
}

const ROW_CLASS = 'grid grid-cols-[6rem_1fr] items-center gap-3 sm:grid-cols-[7rem_1fr_4rem_9rem]'

export function GoalsStrip({ insights }: { insights: Insights }) {
  return (
    <section aria-labelledby="goals-heading">
      <h2 id="goals-heading" className="mb-3 text-xs uppercase tracking-wide text-ink-muted">
        Goals
      </h2>

      <ul className="space-y-3 rounded-card border border-line bg-surface-raised p-4">
        {insights.goals.map((goal) => (
          <li
            key={goal.goalId}
            data-testid={`goal-${goal.goalId}`}
            data-status={goal.status}
            className={ROW_CLASS}
          >
            <span className="text-sm">{goal.label}</span>
            <GoalBar attainment={goal.attainment} tone={goal.status} />
            <span className="figure text-sm">{Math.round(goal.attainment * 100)}%</span>

            {/* Attainment alone hides the story: a flattering average beside a poor
                adherence count is exactly the pair a single number would lose. */}
            <span
              className={`flex items-center gap-1.5 text-sm ${
                goal.status === Band.Watch ? 'text-watch' : 'text-ink-muted'
              }`}
            >
              met {goal.met} of {goal.of} {goal.unit === 'h' ? 'nights' : 'days'}
              {goal.status === Band.Watch && (
                <TriangleAlert size={14} aria-label="needs attention" />
              )}
            </span>
          </li>
        ))}

        {insights.emptyGoals.map((goalId) => (
          <li key={goalId} data-testid={`goal-${goalId}`} data-status="empty" className={ROW_CLASS}>
            <span className="text-sm text-ink-muted">{METRIC_LABELS[goalId]}</span>

            {/* A gap is not a zero, so the row keeps its place without drawing a bar. */}
            <p className="col-span-1 text-sm text-ink-muted/80 sm:col-span-3">
              {EMPTY_COPY[goalId]}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
