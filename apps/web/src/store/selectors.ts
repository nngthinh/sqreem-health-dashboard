import type { GoalId, GoalProgress, MetricId, Range, Trend } from '@health/shared/schema'
import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '.'
import { dataApi } from './api/dataApi'

/**
 * Everything derived from insights is computed here rather than stored: the cache
 * entry RTK Query already holds is the single copy of the answer.
 */
const selectInsightsResult = (state: RootState, range: Range) =>
  dataApi.endpoints.getInsights.select(range)(state)

export const selectTrend = createSelector(
  [selectInsightsResult, (_state: RootState, _range: Range, metricId: MetricId) => metricId],
  (result, metricId): Trend | null =>
    result.data?.trends.find((trend) => trend.metricId === metricId) ?? null,
)

export const selectGoal = createSelector(
  [selectInsightsResult, (_state: RootState, _range: Range, goalId: GoalId) => goalId],
  (result, goalId): NonNullable<GoalProgress> | null =>
    result.data?.goals.find((goal) => goal.goalId === goalId) ?? null,
)
