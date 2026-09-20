import { format } from 'date-fns'
import type { DailyRecord, Goal, Persona } from '../schema'
import { generateDataset } from './generator'
import { DANIEL, GOALS } from './persona'

export { generateDataset } from './generator'
export { DANIEL, GOALS } from './persona'
export { gaussian, mulberry32 } from './rng'

const SEED = 20260921
const WINDOW_DAYS = 90

/**
 * Every user — the dev user included — resolves to the Daniel fixture. Deriving a
 * per-reviewer persona would destroy the designed narrative the product rests on.
 * Real multi-tenancy would go here and nowhere else.
 */
export function getDatasetFor(
  _userId: string,
  today: string = format(new Date(), 'yyyy-MM-dd'),
): { persona: Persona; goals: Goal[]; records: DailyRecord[] } {
  return {
    persona: DANIEL,
    goals: GOALS,
    records: generateDataset({ seed: SEED, endDate: today, days: WINDOW_DAYS }),
  }
}
