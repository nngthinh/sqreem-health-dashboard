import { meanOrNull, presentValues } from '@health/shared/insights'
import { METRIC_IDS, type Period } from '@health/shared/schema'
import {
  asPeriod,
  type Dataset,
  isMetricId,
  PERIOD_PARAM,
  type Tool,
  type ToolArgs,
  type ToolResult,
  within,
} from './shared.js'

function run({ records }: Dataset, args: ToolArgs): ToolResult {
  if (!isMetricId(args.metricId)) {
    return { ok: false, reason: 'unknown_metric', validIds: METRIC_IDS }
  }

  const metricId = args.metricId
  const periodA = asPeriod(args.periodA)
  const periodB = asPeriod(args.periodB)

  const meanIn = (period: Partial<Period>) =>
    meanOrNull(presentValues(within(records, period.from, period.to), metricId))

  const meanA = meanIn(periodA)
  const meanB = meanIn(periodB)

  if (meanA === null || meanB === null || meanB === 0) {
    return { ok: false, reason: 'no_data', detail: 'One of the periods has no recorded values.' }
  }

  return {
    ok: true,
    metricId,
    periodA: { ...periodA, mean: meanA },
    periodB: { ...periodB, mean: meanB },
    deltaPct: ((meanA - meanB) / meanB) * 100,
  }
}

export const comparePeriodsTool: Tool = {
  definition: {
    name: 'compare_periods',
    description: 'Mean of one metric across two date periods, with the delta between them.',
    parameters: {
      type: 'object',
      properties: {
        metricId: { type: 'string', enum: [...METRIC_IDS] },
        periodA: PERIOD_PARAM,
        periodB: PERIOD_PARAM,
      },
      required: ['metricId', 'periodA', 'periodB'],
    },
  },
  run,
}
