import type { GoalProgress, Range, Recommendation, Signal, Trend } from '../schema/index.js'
import { Band, Direction } from '../schema/index.js'

const MAX_RECOMMENDATIONS = 3

const SEVERITY_ORDER: Record<Band, number> = {
  [Band.Watch]: 0,
  [Band.Steady]: 1,
  [Band.Good]: 2,
}

/**
 * Distance and sleep move in fractions of their unit, so rounding them to whole numbers
 * renders a real 13% drop as "5 to 5 km" — a sentence the assistant would then repeat
 * verbatim. Precision is per unit, not global.
 */
const FRACTION_DIGITS: Record<string, number> = { km: 1, h: 1 }

const formatValue = (value: number, unit: string) => {
  const digits = FRACTION_DIGITS[unit] ?? 0

  return value.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

function goalAdherenceSignal(goal: NonNullable<GoalProgress>): Signal {
  const meanDigits = goal.unit === 'h' ? 1 : 0

  return {
    id: `goal-adherence-${goal.goalId}`,
    severity: Band.Watch,
    title: `${goal.label}: met on ${goal.met} of ${goal.of} days`,
    detail: `The average sits at ${Math.round(goal.attainment * 100)}% of target, which reads fine — but the target was actually met on ${goal.met} of ${goal.of} recorded days.`,
    metricIds: [goal.metricId],
    evidence: [
      `Average ${goal.mean.toFixed(meanDigits)}${goal.unit} against a ${goal.target}${goal.unit} target`,
      `Target met on ${goal.met} of ${goal.of} recorded days`,
    ],
  }
}

/** A second metric moving the same way is what separates real activity from a miscounting band. */
function findCorroboration(trend: Trend, trends: Trend[]): Trend | undefined {
  return trends.find(
    (other) =>
      other.metricId !== trend.metricId && other.significant && other.direction === trend.direction,
  )
}

function trendSignal(trend: Trend, trends: Trend[], range: Range): Signal {
  const corroboration = findCorroboration(trend, trends)
  const movedDown = trend.direction === Direction.Down

  const current = formatValue(trend.current as number, trend.unit)
  const previous = formatValue(trend.previous as number, trend.unit)

  return {
    id: `trend-${trend.metricId}`,
    severity: movedDown ? Band.Watch : Band.Good,
    title: `${trend.label} ${movedDown ? 'down' : 'up'} ${Math.abs(Math.round(trend.deltaPct as number))}%`,
    detail: `${trend.label} moved from ${previous} to ${current} ${trend.unit} a day, comparing the last ${range} days with the ${range} before them.`,
    metricIds: corroboration ? [trend.metricId, corroboration.metricId] : [trend.metricId],
    evidence: [
      `Last ${range} days: ${current} ${trend.unit}/day`,
      `Previous ${range} days: ${previous} ${trend.unit}/day`,
      ...(corroboration
        ? [
            `${corroboration.label} moved the same way (${Math.round(corroboration.deltaPct as number)}%), so this is real activity rather than a miscounting band`,
          ]
        : []),
    ],
  }
}

/**
 * Signals are the evidence behind every recommendation. A health app that says
 * "sleep more" without showing why is not trustworthy, so each signal carries the
 * sentences the `[why?]` disclosure renders verbatim.
 */
export function detectSignals(
  trends: Trend[],
  goals: NonNullable<GoalProgress>[],
  range: Range,
): Signal[] {
  const goalSignals = goals
    .filter((goal) => goal.status === Band.Watch)
    .map((goal) => goalAdherenceSignal(goal))

  const trendSignals = trends
    .filter((trend) => trend.significant && trend.deltaPct !== null)
    .map((trend) => trendSignal(trend, trends, range))

  return [...goalSignals, ...trendSignals].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  )
}

type RecommendationTemplate = { title: string; rationale: string; ask: string }

/** Only signals we can act on get a template — the rest stay evidence without advice. */
const TEMPLATES: Record<string, RecommendationTemplate> = {
  'goal-adherence-sleep': {
    title: 'Protect weeknight sleep',
    rationale:
      'Weekend catch-up is holding the average up while weeknights run short. Moving lights-out 30 minutes earlier on weeknights moves adherence, which the average will not show.',
    ask: 'Why is my sleep average fine but my nights are not?',
  },
  'goal-adherence-calories': {
    title: 'Add one deliberate 20-minute effort',
    rationale:
      'Active calories have never reached target and have not moved. A single short, deliberate effort most days closes more of the gap than a longer session once a week.',
    ask: 'What would it take to hit my active calorie goal?',
  },
  'trend-steps': {
    title: 'Two short walks beat one long one',
    rationale:
      'Step count has fallen against the previous period and distance fell with it, so this is fewer walks rather than a band miscounting. Two ten-minute walks are easier to restart than one long one.',
    ask: 'Why have my steps dropped?',
  },
}

export function buildRecommendations(signals: Signal[]): Recommendation[] {
  return signals
    .flatMap((signal) => {
      const template = TEMPLATES[signal.id]
      if (!template) return []

      return [
        {
          id: signal.id,
          title: template.title,
          rationale: template.rationale,
          evidence: signal.evidence,
          askPrompt: template.ask,
          metricIds: signal.metricIds,
        },
      ]
    })
    .slice(0, MAX_RECOMMENDATIONS) // A focus is 1-3 items; more is a list, not a focus.
}
