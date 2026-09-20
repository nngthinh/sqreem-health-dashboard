import type { DailyRecord, Goal, GoalProgress, Range } from '../schema/index.js'
import { Band } from '../schema/index.js'
import { meanOrNull, metricValue, presentValues, sliceRange } from './window.js'

const GOOD_ADHERENCE = 0.7
const STEADY_ADHERENCE = 0.4

/** Status reads adherence, not attainment — a flattering average is exactly what it must not hide. */
function bandForAdherence(adherence: number): Band {
  if (adherence >= GOOD_ADHERENCE) return Band.Good

  if (adherence >= STEADY_ADHERENCE) return Band.Steady

  return Band.Watch
}

/**
 * Two numbers, never one. Attainment is the mean over the target; adherence is how
 * many recorded days actually met it. A 93% average with `2 of 7` beside it tells
 * the story with no prose at all.
 */
export function computeGoalProgress(
  records: DailyRecord[],
  goal: Goal,
  range: Range,
): GoalProgress {
  const window = sliceRange(records, range)
  const values = presentValues(window, goal.metricId)

  const mean = meanOrNull(values)
  if (mean === null) return null // every day a gap: no progress, not 0%

  const met = window.filter((record) => {
    const value = metricValue(record, goal.metricId)
    return value !== null && value >= goal.target
  }).length

  const of = values.length // gaps excluded from the denominator too

  return {
    goalId: goal.goalId,
    metricId: goal.metricId,
    label: goal.label,
    target: goal.target,
    unit: goal.unit,
    mean,
    attainment: mean / goal.target,
    met,
    of,
    status: bandForAdherence(met / of),
  }
}
