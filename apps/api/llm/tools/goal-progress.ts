import { computeGoalProgress } from '@health/shared/insights'
import { GOAL_IDS } from '@health/shared/schema'
import {
  type Dataset,
  isGoalId,
  PROGRESS_RANGE,
  type ResolvedGoal,
  type Tool,
  type ToolArgs,
  type ToolResult,
} from './shared.js'

function run({ records, goals }: Dataset, args: ToolArgs): ToolResult {
  const requested = args.goalId

  if (requested !== undefined && !isGoalId(requested)) {
    return { ok: false, reason: 'unknown_metric', validIds: GOAL_IDS }
  }

  const selected =
    requested === undefined ? goals : goals.filter((goal) => goal.goalId === requested)
  const progress = selected
    .map((goal) => computeGoalProgress(records, goal, PROGRESS_RANGE))
    .filter((entry): entry is ResolvedGoal => entry !== null)

  if (progress.length === 0) {
    return { ok: false, reason: 'no_data', detail: 'No recorded data for that goal.' }
  }

  return { ok: true, range: PROGRESS_RANGE, goals: progress }
}

export const goalProgressTool: Tool = {
  definition: {
    name: 'get_goal_progress',
    description:
      'Attainment (mean against target) and adherence (days the target was met) for one goal, or all of them when goalId is omitted.',
    parameters: {
      type: 'object',
      properties: { goalId: { type: 'string', enum: [...GOAL_IDS] } },
    },
  },
  run,
}
