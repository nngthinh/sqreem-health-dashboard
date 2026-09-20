import { meanOrNull, metricValue } from '@health/shared/insights'
import {
  type DailyRecord,
  GOAL_IDS,
  type Goal,
  type GoalId,
  type GoalProgress,
  METRIC_IDS,
  type MetricId,
  type Period,
  type Range,
  type Workout,
} from '@health/shared/schema'
import { format } from 'date-fns'
import type { ToolDef } from '../types.js'

/** Goal progress answers in the same window the dashboard defaults to. */
export const PROGRESS_RANGE: Range = 30

export type DayPoint = { date: string; value: number | null }
export type WeekPoint = { week: string; mean: number | null }
export type PeriodMean = { from?: string; to?: string; mean: number }
export type DatedWorkout = Workout & { date: string }
export type ResolvedGoal = NonNullable<GoalProgress>

export type ToolFailure = {
  ok: false
  reason: 'no_data' | 'unknown_metric'
  validIds?: readonly string[]
  detail?: string
}

export type ToolResult =
  | { ok: true; metricId: MetricId; granularity: 'day'; points: DayPoint[] }
  | { ok: true; metricId: MetricId; granularity: 'week'; points: WeekPoint[] }
  | { ok: true; metricId: MetricId; periodA: PeriodMean; periodB: PeriodMean; deltaPct: number }
  | { ok: true; workouts: DatedWorkout[] }
  | { ok: true; range: Range; goals: ResolvedGoal[] }
  | ToolFailure

export type Dataset = { records: DailyRecord[]; goals: Goal[] }
export type ToolArgs = Record<string, unknown>

/**
 * One tool is one file exporting one of these, so adding or removing a capability is
 * adding or deleting a file plus a line in the registry — never an edit to a shared switch.
 */
export type Tool = {
  definition: ToolDef
  run: (dataset: Dataset, args: ToolArgs) => ToolResult
}

export const PERIOD_PARAM = {
  type: 'object',
  properties: { from: { type: 'string' }, to: { type: 'string' } },
  required: ['from', 'to'],
}

export const isMetricId = (value: unknown): value is MetricId =>
  METRIC_IDS.includes(value as MetricId)

export const isGoalId = (value: unknown): value is GoalId => GOAL_IDS.includes(value as GoalId)

export const asText = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined

export const asPeriod = (value: unknown): Partial<Period> => (value ?? {}) as Partial<Period>

export function within(records: DailyRecord[], from?: string, to?: string): DailyRecord[] {
  return records.filter((record) => (!from || record.date >= from) && (!to || record.date <= to))
}

/** ISO week key, because a calendar-month bucket would split a training week in half. */
export function isoWeekOf(date: string): string {
  return format(new Date(`${date}T00:00:00`), 'RRRR-II')
}

export function toWeekPoints(records: DailyRecord[], metricId: MetricId): WeekPoint[] {
  const weeks = new Map<string, number[]>()

  for (const record of records) {
    const value = metricValue(record, metricId)
    if (value === null) continue

    const key = isoWeekOf(record.date)
    weeks.set(key, [...(weeks.get(key) ?? []), value])
  }

  return [...weeks.entries()].map(([week, values]) => ({ week, mean: meanOrNull(values) }))
}
