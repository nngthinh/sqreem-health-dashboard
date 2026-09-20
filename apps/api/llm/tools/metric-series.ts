import { metricValue } from '@health/shared/insights'
import { METRIC_IDS, type MetricId } from '@health/shared/schema'
import {
  asText,
  type Dataset,
  isMetricId,
  type Tool,
  type ToolArgs,
  type ToolResult,
  toWeekPoints,
  within,
} from './shared.js'

function run({ records }: Dataset, args: ToolArgs): ToolResult {
  if (!isMetricId(args.metricId)) {
    return { ok: false, reason: 'unknown_metric', validIds: METRIC_IDS }
  }

  const from = asText(args.from) ?? records[0]?.date
  const to = asText(args.to) ?? records.at(-1)?.date
  const window = within(records, from, to)

  if (window.length === 0) {
    return { ok: false, reason: 'no_data', detail: `No records between ${from} and ${to}.` }
  }

  if (args.granularity === 'week') {
    return {
      ok: true,
      metricId: args.metricId,
      granularity: 'week',
      points: toWeekPoints(window, args.metricId),
    }
  }

  return {
    ok: true,
    metricId: args.metricId,
    granularity: 'day',
    points: window.map((record) => ({
      date: record.date,
      value: metricValue(record, args.metricId as MetricId),
    })),
  }
}

export const metricSeriesTool: Tool = {
  definition: {
    name: 'get_metric_series',
    description:
      'Daily or weekly points for one metric over a date range. Nothing finer than a day exists.',
    parameters: {
      type: 'object',
      properties: {
        metricId: { type: 'string', enum: [...METRIC_IDS] },
        from: { type: 'string', description: 'YYYY-MM-DD' },
        to: { type: 'string', description: 'YYYY-MM-DD' },
        granularity: { type: 'string', enum: ['day', 'week'] },
      },
      required: ['metricId'],
    },
  },
  run,
}
