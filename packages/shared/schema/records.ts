import { z } from 'zod'
import { GoalIdSchema, MetricIdSchema } from './ids.js'

export enum WorkoutType {
  Walk = 'walk',
  Run = 'run',
  Strength = 'strength',
  Cycle = 'cycle',
}

export const WorkoutTypeSchema = z.enum(WorkoutType)

export const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD')

export const WorkoutSchema = z.object({
  type: WorkoutTypeSchema,
  durationMin: z.number().int().positive(),
  calories: z.number().int().nonnegative(),
})

export const DailyRecordSchema = z.object({
  date: IsoDateSchema,
  steps: z.number().int().nonnegative().nullable(),
  distanceKm: z.number().nonnegative().nullable(),
  calories: z.number().int().nonnegative().nullable(),
  sleepHours: z.number().nonnegative().max(24).nullable(),
  workouts: z.array(WorkoutSchema),
})

export const GoalSchema = z.object({
  goalId: GoalIdSchema,
  metricId: MetricIdSchema,
  label: z.string(),
  target: z.number().positive(),
  unit: z.string(),
  cadence: z.literal('day'),
})

export const PersonaSchema = z.object({
  userId: z.string(),
  name: z.string(),
  age: z.number().int().positive(),
  occupation: z.string(),
  location: z.string(),
  initials: z.string().max(2),
  narrative: z.string(),
})

export const PeriodSchema = z.object({ from: IsoDateSchema, to: IsoDateSchema })

export type Workout = z.infer<typeof WorkoutSchema>
export type DailyRecord = z.infer<typeof DailyRecordSchema>
export type Goal = z.infer<typeof GoalSchema>
export type Persona = z.infer<typeof PersonaSchema>
export type Period = z.infer<typeof PeriodSchema>
