import type { DailyRecord, Goal, GoalId, GoalProgress, Insights, Range } from '../schema/index.js'
import { METRIC_IDS } from '../schema/index.js'
import { computeCoverage } from './coverage.js'
import { computeGoalProgress } from './goals.js'
import { computeReadiness } from './readiness.js'
import { buildRecommendations, detectSignals } from './signals.js'
import { computeTrend, splitMovers } from './trends.js'

export * from './breakdown.js'
export * from './coverage.js'
export * from './digest.js'
export * from './goals.js'
export * from './readiness.js'
export * from './signals.js'
export * from './trends.js'
export * from './window.js'

type ResolvedGoal = NonNullable<GoalProgress>

/** A goal with no recorded day in range resolves to nothing, and is reported as empty rather than as 0%. */
function splitGoals(
  records: DailyRecord[],
  goals: Goal[],
  range: Range,
): { resolved: ResolvedGoal[]; empty: GoalId[] } {
  const resolved: ResolvedGoal[] = []
  const empty: GoalId[] = []

  for (const goal of goals) {
    const progress = computeGoalProgress(records, goal, range)

    if (progress === null) {
      empty.push(goal.goalId)
    } else {
      resolved.push(progress)
    }
  }

  return { resolved, empty }
}

/** The single entry point: everything the dashboard and the chat answer from. */
export function buildInsights(
  records: DailyRecord[],
  goals: Goal[],
  range: Range,
  asOf: string,
): Insights {
  const trends = METRIC_IDS.map((metricId) => computeTrend(records, metricId, range))
  const { movers, steady } = splitMovers(trends)

  const { resolved, empty } = splitGoals(records, goals, range)
  const signals = detectSignals(trends, resolved, range)

  return {
    range,
    asOf,
    readiness: computeReadiness(records, goals),
    trends,
    movers,
    steady,
    goals: resolved,
    emptyGoals: empty,
    signals,
    recommendations: buildRecommendations(signals),
    coverage: computeCoverage(records, range),
  }
}
