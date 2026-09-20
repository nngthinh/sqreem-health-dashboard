// Imported from the leaf modules, never from ./index — index re-exports this file,
// so importing from it would be a cycle.
import type { DailyRecord, Goal, GoalId, GoalProgress, Range, Trend } from '../schema/index.js'
import { METRIC_IDS } from '../schema/index.js'
import { computeCoverage } from './coverage.js'
import { computeGoalProgress } from './goals.js'
import { computeReadiness } from './readiness.js'
import { detectSignals } from './signals.js'
import { computeTrend } from './trends.js'

const RANGES: Range[] = [7, 30, 90]

/** The range the prose sections speak in; the aggregate table still carries all three. */
const PRIMARY_RANGE: Range = 30

type ResolvedGoal = NonNullable<GoalProgress>

function trendsFor(records: DailyRecord[], range: Range): Trend[] {
  return METRIC_IDS.map((metricId) => computeTrend(records, metricId, range))
}

function splitGoals(
  records: DailyRecord[],
  goals: Goal[],
  range: Range,
): { resolved: ResolvedGoal[]; empty: GoalId[] } {
  const resolved: ResolvedGoal[] = []
  const empty: GoalId[] = []

  for (const goal of goals) {
    const progress = computeGoalProgress(records, goal, range)

    if (progress === null) empty.push(goal.goalId)
    else resolved.push(progress)
  }

  return { resolved, empty }
}

function trendLine(trend: Trend, range: Range): string {
  const current = trend.current === null ? 'no data' : trend.current.toFixed(1)
  const delta = trend.deltaPct === null ? 'n/a' : `${trend.deltaPct.toFixed(1)}%`

  return `  ${trend.metricId} ${range}d: ${current} ${trend.unit} | vs previous ${range}d: ${delta} | significant: ${trend.significant} | recorded days: ${trend.sampleDays}/${range}`
}

function goalLine(goal: ResolvedGoal): string {
  return `  ${goal.goalId}: target ${goal.target}${goal.unit} | mean ${goal.mean.toFixed(1)}${goal.unit} | attainment ${Math.round(goal.attainment * 100)}% | met ${goal.met} of ${goal.of} recorded days | status ${goal.status}`
}

/**
 * The grounding block the assistant answers from: compact, deterministic, and produced
 * by the same engine the dashboard renders, so the chat can never contradict the screen.
 */
export function buildDigest(records: DailyRecord[], goals: Goal[], asOf: string): string {
  const primaryTrends = trendsFor(records, PRIMARY_RANGE)
  const { resolved, empty } = splitGoals(records, goals, PRIMARY_RANGE)

  const readiness = computeReadiness(records, goals)
  const signals = detectSignals(primaryTrends, resolved, PRIMARY_RANGE)
  const coverage = computeCoverage(records, PRIMARY_RANGE)

  const lines: string[] = [`DATA DIGEST (as of ${asOf}, all figures computed, none estimated)`]

  lines.push('', 'READINESS')
  lines.push(
    `  score: ${readiness.score ?? 'unavailable'} (${readiness.band}), confidence ${readiness.confidence}`,
  )
  for (const driver of readiness.drivers) {
    lines.push(`  driver: ${driver.label} — ${driver.explanation}`)
  }

  lines.push('', 'METRIC AGGREGATES (mean per day)')
  for (const range of RANGES) {
    const trends = range === PRIMARY_RANGE ? primaryTrends : trendsFor(records, range)
    for (const trend of trends) lines.push(trendLine(trend, range))
  }

  lines.push('', 'GOALS (attainment = mean/target; adherence = days target actually met)')
  for (const goal of resolved) lines.push(goalLine(goal))
  for (const goalId of empty) lines.push(`  ${goalId}: no recorded data in range`)

  lines.push('', 'SIGNALS')
  for (const signal of signals)
    lines.push(`  [${signal.severity}] ${signal.title} — ${signal.detail}`)

  lines.push('', 'DATA COVERAGE')
  if (coverage.length === 0) {
    lines.push(`  all metrics fully recorded in the last ${PRIMARY_RANGE} days`)
  }
  for (const note of coverage) lines.push(`  ${note.message}`)

  return lines.join('\n')
}
