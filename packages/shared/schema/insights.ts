import { z } from 'zod'
import type { GoalId, MetricId, Range } from './ids'

/** Shared three-state health judgement: readiness band, goal status, signal severity. */
export enum Band {
  Good = 'good',
  Steady = 'steady',
  Watch = 'watch',
}

export enum Direction {
  Up = 'up',
  Down = 'down',
  Flat = 'flat',
}

export enum Confidence {
  Full = 'full',
  Partial = 'partial',
}

export const BandSchema = z.enum(Band)
export const DirectionSchema = z.enum(Direction)
export const ConfidenceSchema = z.enum(Confidence)

export type ReadinessDriver = {
  metricId: MetricId
  label: string
  weight: number
  value: number | null
  target: number | null
  /** signed fraction: -0.17 means 17% below target/baseline */
  deviation: number
  direction: Direction
  explanation: string
}

export type Readiness = {
  score: number | null
  band: Band
  confidence: Confidence
  droppedTerms: MetricId[]
  drivers: ReadinessDriver[]
}

export type SparkPoint = { date: string; value: number | null }

export type Trend = {
  metricId: MetricId
  label: string
  unit: string
  current: number | null
  previous: number | null
  deltaPct: number | null
  direction: Direction
  significant: boolean
  sampleDays: number
  series: SparkPoint[]
}

export type GoalProgress = {
  goalId: GoalId
  metricId: MetricId
  label: string
  target: number
  unit: string
  mean: number
  /** mean ÷ target, unclamped so 1.2 is legible as "over target" */
  attainment: number
  /** days in range where the target was actually met */
  met: number
  /** days in range with a recorded value — gaps are excluded, not zeroed */
  of: number
  status: Band
} | null

export type Signal = {
  id: string
  severity: Band
  title: string
  detail: string
  metricIds: MetricId[]
  evidence: string[]
}

export type Recommendation = {
  id: string
  title: string
  rationale: string
  evidence: string[]
  askPrompt: string
  metricIds: MetricId[]
}

export type CoverageNote = {
  metricId: MetricId
  missingDays: number
  lastRecorded: string | null
  message: string
}

export type Insights = {
  range: Range
  asOf: string
  readiness: Readiness
  trends: Trend[]
  movers: MetricId[]
  steady: MetricId[]
  goals: NonNullable<GoalProgress>[]
  emptyGoals: GoalId[]
  signals: Signal[]
  recommendations: Recommendation[]
  coverage: CoverageNote[]
}
