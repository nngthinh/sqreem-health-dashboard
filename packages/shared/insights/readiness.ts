import type { DailyRecord, Goal, MetricId, Readiness, ReadinessDriver } from '../schema/index.js'
import { Band, Confidence, Direction } from '../schema/index.js'
import { meanOrNull, presentValues } from './window.js'

const SLEEP_WEIGHT = 0.5
const STEPS_WEIGHT = 0.3
const CALORIES_WEIGHT = 0.2

/** The step term is a week-on-week comparison: 0.8x the prior week scores 0, 1.2x scores 1, parity sits at 0.5. */
const STEPS_FLOOR_RATIO = 0.8
const STEPS_CEILING_RATIO = 1.2

const GOOD_SCORE = 75
const STEADY_SCORE = 50

/** Below this, a driver is reported as holding flat rather than as a move in either direction. */
const FLAT_DEVIATION = 0.02

const TREND_DAYS = 7

/** One weighted input to the score, carrying the sentence that explains it to the reader. */
type Term = {
  metricId: MetricId
  label: string
  weight: number
  /** null when the input is missing, which drops the term rather than scoring it zero */
  score: number | null
  value: number | null
  target: number | null
  deviation: number
  explanation: string
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

const ratioOrNull = (value: number | null, target: number | null): number | null =>
  value === null || target === null || target <= 0 ? null : value / target

function bandForScore(score: number | null): Band {
  if (score === null) return Band.Watch

  if (score >= GOOD_SCORE) return Band.Good

  if (score >= STEADY_SCORE) return Band.Steady

  return Band.Watch
}

function directionForDeviation(deviation: number): Direction {
  if (deviation > FLAT_DEVIATION) return Direction.Up

  if (deviation < -FLAT_DEVIATION) return Direction.Down

  return Direction.Flat
}

function buildSleepTerm(lastNight: number | null, target: number | null): Term {
  const ratio = ratioOrNull(lastNight, target)

  return {
    metricId: 'sleep',
    label: 'Last night’s sleep',
    weight: SLEEP_WEIGHT,
    score: ratio === null ? null : clamp01(ratio),
    value: lastNight,
    target,
    deviation: ratio === null ? 0 : ratio - 1,
    explanation:
      ratio === null
        ? 'No sleep recorded last night'
        : `${(lastNight as number).toFixed(1)}h against a ${target}h target`,
  }
}

function buildStepsTerm(current: number | null, previous: number | null): Term {
  const ratio = ratioOrNull(current, previous)
  const span = STEPS_CEILING_RATIO - STEPS_FLOOR_RATIO

  return {
    metricId: 'steps',
    label: `${TREND_DAYS}-day step trend`,
    weight: STEPS_WEIGHT,
    score: ratio === null ? null : clamp01((ratio - STEPS_FLOOR_RATIO) / span),
    value: current,
    target: previous,
    deviation: ratio === null ? 0 : ratio - 1,
    explanation:
      ratio === null
        ? 'Not enough step history to compare weeks'
        : `${Math.round(current as number).toLocaleString()} a day vs ${Math.round(previous as number).toLocaleString()} the week before`,
  }
}

function buildCaloriesTerm(yesterday: number | null, target: number | null): Term {
  const ratio = ratioOrNull(yesterday, target)

  return {
    metricId: 'calories',
    label: 'Yesterday’s active calories',
    weight: CALORIES_WEIGHT,
    score: ratio === null ? null : clamp01(ratio),
    value: yesterday,
    target,
    deviation: ratio === null ? 0 : ratio - 1,
    explanation:
      ratio === null
        ? 'No active calories recorded yesterday'
        : `${yesterday} kcal against a ${target} kcal target`,
  }
}

/** The score explains itself: the terms that moved it most, largest deviation first. */
function topDrivers(terms: Term[]): ReadinessDriver[] {
  return terms
    .filter((term) => term.score !== null)
    .sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation))
    .slice(0, 3)
    .map((term) => ({
      metricId: term.metricId,
      label: term.label,
      weight: term.weight,
      value: term.value,
      target: term.target,
      deviation: term.deviation,
      direction: directionForDeviation(term.deviation),
      explanation: term.explanation,
    }))
}

export function computeReadiness(records: DailyRecord[], goals: Goal[]): Readiness {
  const targetOf = (goalId: string) => goals.find((goal) => goal.goalId === goalId)?.target ?? null

  const yesterday = records.at(-1)
  const currentWeekSteps = meanOrNull(presentValues(records.slice(-TREND_DAYS), 'steps'))
  const previousWeekSteps = meanOrNull(
    presentValues(records.slice(-TREND_DAYS * 2, -TREND_DAYS), 'steps'),
  )

  const terms: Term[] = [
    buildSleepTerm(yesterday?.sleepHours ?? null, targetOf('sleep')),
    buildStepsTerm(currentWeekSteps, previousWeekSteps),
    buildCaloriesTerm(yesterday?.calories ?? null, targetOf('calories')),
  ]

  // A missing input drops its term and renormalises the rest, so a gap costs
  // confidence rather than score — zeroing the term would halve an honest reading.
  const present = terms.filter((term) => term.score !== null)
  const droppedTerms = terms.filter((term) => term.score === null).map((term) => term.metricId)
  const totalWeight = present.reduce((sum, term) => sum + term.weight, 0)

  const score =
    totalWeight === 0
      ? null
      : Math.round(
          (present.reduce((sum, term) => sum + term.weight * (term.score as number), 0) /
            totalWeight) *
            100,
        )

  return {
    score,
    band: bandForScore(score),
    confidence: droppedTerms.length === 0 ? Confidence.Full : Confidence.Partial,
    droppedTerms,
    drivers: topDrivers(terms),
  }
}
