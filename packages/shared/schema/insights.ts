import type { GoalId, MetricId, Range } from './ids'

export type ReadinessDriver = {
  metricId: MetricId
  label: string
  weight: number
  value: number | null
  target: number | null
  /** signed fraction: -0.17 means 17% below target/baseline */
  deviation: number
  direction: 'up' | 'down' | 'flat'
  explanation: string
}

export type Readiness = {
  score: number | null
  band: 'good' | 'steady' | 'watch'
  confidence: 'full' | 'partial'
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
  direction: 'up' | 'down' | 'flat'
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
  status: 'good' | 'steady' | 'watch'
} | null

export type Signal = {
  id: string
  severity: 'good' | 'steady' | 'watch'
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
