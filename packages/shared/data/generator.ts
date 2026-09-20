import { format, subDays } from 'date-fns'
import type { DailyRecord, Workout } from '../schema'
import { WorkoutType } from '../schema'
import { gaussian, mulberry32 } from './rng'

const STEPS_BASE = 7450
const KM_PER_STEP = 0.00072
const CALORIES_BASE = 405

/** The three-week slide, expressed against today. The headline "what changed". */
function stepsFactor(daysAgo: number): number {
  if (daysAgo <= 6) return 0.82 // the last week — the drop the dashboard leads with
  if (daysAgo <= 13) return 0.96 // the week before it, already easing off
  if (daysAgo <= 20) return 1.0 // three weeks ago: still at baseline
  if (daysAgo >= 69 && daysAgo <= 82) return 1.15 // two strong weeks early in the window
  return 0.97
}

/** Weeknight debt, weekend catch-up. The average lands near 7h and lies about it. */
function sleepBase(date: Date): number {
  const day = date.getDay()
  return day === 0 || day === 6 ? 8.67 : 6.25
}

/** The step decline drags calories only ~5% — under the significance threshold, by design. */
function caloriesFactor(daysAgo: number): number {
  return 1 + 0.25 * (stepsFactor(daysAgo) - 1)
}

const DISTANCE_GAP_START = 21
const DISTANCE_GAP_END = 30

const WORKOUT_TYPES: WorkoutType[] = [
  WorkoutType.Walk,
  WorkoutType.Run,
  WorkoutType.Strength,
  WorkoutType.Cycle,
]

export function generateDataset(options: {
  seed: number
  endDate: string
  days: number
}): DailyRecord[] {
  const { seed, endDate, days } = options
  const rand = mulberry32(seed)
  const end = new Date(`${endDate}T00:00:00`)
  const records: DailyRecord[] = []

  for (let daysAgo = days - 1; daysAgo >= 0; daysAgo--) {
    const date = subDays(end, daysAgo)
    const iso = format(date, 'yyyy-MM-dd')

    // Draw every value first so the random sequence does not depend on which
    // values are later dropped — that is what keeps the seed stable.
    const stepsRaw = Math.round(gaussian(rand, STEPS_BASE * stepsFactor(daysAgo), 950))
    const sleepRaw = Number(gaussian(rand, sleepBase(date), 0.55).toFixed(1))
    const caloriesRaw = Math.round(gaussian(rand, CALORIES_BASE * caloriesFactor(daysAgo), 35))
    const dropSteps = rand() < 0.02
    const dropSleep = rand() < 0.02
    const dropCalories = rand() < 0.02
    const dropDistance = rand() < 0.02
    const workoutRoll = rand()
    const workoutType = WORKOUT_TYPES[Math.floor(rand() * WORKOUT_TYPES.length)] ?? WorkoutType.Walk
    const workoutMin = 20 + Math.floor(rand() * 40)

    // The two most recent days are always recorded, so Today's read is never empty.
    const protectedDay = daysAgo <= 1

    const steps = !protectedDay && dropSteps ? null : Math.max(600, stepsRaw)
    const sleepHours = !protectedDay && dropSleep ? null : Math.max(3.5, Math.min(11, sleepRaw))
    const calories = !protectedDay && dropCalories ? null : Math.max(90, caloriesRaw)

    const inDistanceGap = daysAgo >= DISTANCE_GAP_START && daysAgo <= DISTANCE_GAP_END
    const distanceKm =
      inDistanceGap || steps === null || (!protectedDay && dropDistance)
        ? null
        : Number((steps * KM_PER_STEP * (0.94 + rand() * 0.12)).toFixed(2))

    const workouts: Workout[] =
      steps !== null && workoutRoll < 0.3
        ? [
            {
              type: workoutType,
              durationMin: workoutMin,
              calories: Math.round(workoutMin * (5 + rand() * 4)),
            },
          ]
        : []

    records.push({ date: iso, steps, distanceKm, calories, sleepHours, workouts })
  }

  return records
}
