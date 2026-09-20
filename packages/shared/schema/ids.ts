import { z } from 'zod'

export const METRIC_IDS = ['steps', 'distance', 'calories', 'sleep'] as const
export const GOAL_IDS = ['steps', 'calories', 'sleep'] as const

export const MetricIdSchema = z.enum(METRIC_IDS)
export const GoalIdSchema = z.enum(GOAL_IDS)

export type MetricId = (typeof METRIC_IDS)[number]
export type GoalId = (typeof GOAL_IDS)[number]

export const RANGES = [7, 30, 90] as const
export const RangeSchema = z.union([z.literal(7), z.literal(30), z.literal(90)])
export type Range = (typeof RANGES)[number]

export const METRIC_LABELS: Record<MetricId, string> = {
  steps: 'Steps',
  distance: 'Distance',
  calories: 'Active calories',
  sleep: 'Sleep',
}

export const METRIC_UNITS: Record<MetricId, string> = {
  steps: 'steps',
  distance: 'km',
  calories: 'kcal',
  sleep: 'h',
}
