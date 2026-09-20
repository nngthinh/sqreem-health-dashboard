import { getDatasetFor } from '@health/shared/data'
import {
  computeGoalProgress,
  meanOrNull,
  metricValue,
  presentValues,
} from '@health/shared/insights'
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
import type { ToolDef } from './types.js'

/** Bounds latency, bounds free-tier quota, and bounds a confused model querying in circles. */
export const MAX_TOOL_ROUNDS = 4

/** Goal progress answers in the same window the dashboard defaults to. */
const PROGRESS_RANGE: Range = 30

const DEFAULT_WORKOUT_LIMIT = 5
const MAX_WORKOUT_LIMIT = 20

type DayPoint = { date: string; value: number | null }
type WeekPoint = { week: string; mean: number | null }
type PeriodMean = { from?: string; to?: string; mean: number }
type DatedWorkout = Workout & { date: string }
type ResolvedGoal = NonNullable<GoalProgress>

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

type Dataset = { records: DailyRecord[]; goals: Goal[] }
type ToolArgs = Record<string, unknown>

const isMetricId = (value: unknown): value is MetricId => METRIC_IDS.includes(value as MetricId)

const isGoalId = (value: unknown): value is GoalId => GOAL_IDS.includes(value as GoalId)

const asText = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined

const asPeriod = (value: unknown): Partial<Period> => (value ?? {}) as Partial<Period>

function within(records: DailyRecord[], from?: string, to?: string): DailyRecord[] {
  return records.filter((record) => (!from || record.date >= from) && (!to || record.date <= to))
}

/** ISO week key, because a calendar-month bucket would split a training week in half. */
function isoWeekOf(date: string): string {
  return format(new Date(`${date}T00:00:00`), 'RRRR-II')
}

function toWeekPoints(records: DailyRecord[], metricId: MetricId): WeekPoint[] {
  const weeks = new Map<string, number[]>()

  for (const record of records) {
    const value = metricValue(record, metricId)
    if (value === null) continue

    const key = isoWeekOf(record.date)
    weeks.set(key, [...(weeks.get(key) ?? []), value])
  }

  return [...weeks.entries()].map(([week, values]) => ({ week, mean: meanOrNull(values) }))
}

function getMetricSeries({ records }: Dataset, args: ToolArgs): ToolResult {
  if (!isMetricId(args.metricId)) {
    return { ok: false, reason: 'unknown_metric', validIds: METRIC_IDS }
  }

  const from = asText(args.from) ?? records[0]?.date
  const to = asText(args.to) ?? records.at(-1)?.date
  const window = within(records, from, to)

  if (window.length === 0) {
    return { ok: false, reason: 'no_data', detail: `No records between ${from} and ${to}.` }
  }

  if (args.granularity === 'week') {
    return {
      ok: true,
      metricId: args.metricId,
      granularity: 'week',
      points: toWeekPoints(window, args.metricId),
    }
  }

  return {
    ok: true,
    metricId: args.metricId,
    granularity: 'day',
    points: window.map((record) => ({
      date: record.date,
      value: metricValue(record, args.metricId as MetricId),
    })),
  }
}

function comparePeriods({ records }: Dataset, args: ToolArgs): ToolResult {
  if (!isMetricId(args.metricId)) {
    return { ok: false, reason: 'unknown_metric', validIds: METRIC_IDS }
  }

  const metricId = args.metricId
  const periodA = asPeriod(args.periodA)
  const periodB = asPeriod(args.periodB)

  const meanIn = (period: Partial<Period>) =>
    meanOrNull(presentValues(within(records, period.from, period.to), metricId))

  const meanA = meanIn(periodA)
  const meanB = meanIn(periodB)

  if (meanA === null || meanB === null || meanB === 0) {
    return { ok: false, reason: 'no_data', detail: 'One of the periods has no recorded values.' }
  }

  return {
    ok: true,
    metricId,
    periodA: { ...periodA, mean: meanA },
    periodB: { ...periodB, mean: meanB },
    deltaPct: ((meanA - meanB) / meanB) * 100,
  }
}

function getRecentWorkouts({ records }: Dataset, args: ToolArgs): ToolResult {
  const requested = typeof args.limit === 'number' ? args.limit : DEFAULT_WORKOUT_LIMIT
  const limit = Math.min(MAX_WORKOUT_LIMIT, Math.max(1, requested))

  const workouts = records
    .flatMap((record) => record.workouts.map((workout) => ({ ...workout, date: record.date })))
    .slice(-limit)
    .reverse()

  if (workouts.length === 0) return { ok: false, reason: 'no_data', detail: 'No workouts logged.' }

  return { ok: true, workouts }
}

function getGoalProgress({ records, goals }: Dataset, args: ToolArgs): ToolResult {
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

const PERIOD_PARAM = {
  type: 'object',
  properties: { from: { type: 'string' }, to: { type: 'string' } },
  required: ['from', 'to'],
}

const RUNNERS: Record<string, (dataset: Dataset, args: ToolArgs) => ToolResult> = {
  get_metric_series: getMetricSeries,
  compare_periods: comparePeriods,
  get_recent_workouts: getRecentWorkouts,
  get_goal_progress: getGoalProgress,
}

export const TOOL_DEFS: ToolDef[] = [
  {
    name: 'get_metric_series',
    description:
      'Daily or weekly points for one metric over a date range. Nothing finer than a day exists.',
    parameters: {
      type: 'object',
      properties: {
        metricId: { type: 'string', enum: [...METRIC_IDS] },
        from: { type: 'string', description: 'YYYY-MM-DD' },
        to: { type: 'string', description: 'YYYY-MM-DD' },
        granularity: { type: 'string', enum: ['day', 'week'] },
      },
      required: ['metricId'],
    },
  },
  {
    name: 'compare_periods',
    description: 'Mean of one metric across two date periods, with the delta between them.',
    parameters: {
      type: 'object',
      properties: {
        metricId: { type: 'string', enum: [...METRIC_IDS] },
        periodA: PERIOD_PARAM,
        periodB: PERIOD_PARAM,
      },
      required: ['metricId', 'periodA', 'periodB'],
    },
  },
  {
    name: 'get_recent_workouts',
    description: 'The most recent logged workouts, newest first.',
    parameters: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: `default ${DEFAULT_WORKOUT_LIMIT}, max ${MAX_WORKOUT_LIMIT}`,
        },
      },
    },
  },
  {
    name: 'get_goal_progress',
    description:
      'Attainment (mean against target) and adherence (days the target was met) for one goal, or all of them when goalId is omitted.',
    parameters: {
      type: 'object',
      properties: { goalId: { type: 'string', enum: [...GOAL_IDS] } },
    },
  },
]

/**
 * Every failure is an explicit, machine-readable "we do not have that" — an unknown id
 * comes back with the ids that do exist, so the model self-corrects instead of inventing.
 */
export async function runTool(
  userId: string,
  name: string,
  rawArgs: unknown,
  today?: string,
): Promise<ToolResult> {
  const runner = RUNNERS[name]

  if (!runner) {
    return { ok: false, reason: 'unknown_metric', detail: `No tool named ${name}.` }
  }

  const { records, goals } = getDatasetFor(userId, today)

  return runner({ records, goals }, (rawArgs ?? {}) as ToolArgs)
}
