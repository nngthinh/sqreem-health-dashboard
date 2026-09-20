import { format, subDays } from 'date-fns'
import { z } from 'zod'
import { GoalIdSchema, MetricIdSchema, RangeSchema } from './ids'
import { PeriodSchema } from './records'

export const InsightBlockSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('metric'),
    metricId: MetricIdSchema,
    range: RangeSchema.optional(),
    period: PeriodSchema.optional(),
  }),
  z.object({
    kind: z.literal('comparison'),
    metricId: MetricIdSchema,
    periodA: PeriodSchema,
    periodB: PeriodSchema,
  }),
  z.object({ kind: z.literal('goal'), goalId: GoalIdSchema }),
  z.object({
    kind: z.literal('callout'),
    tone: z.enum(['good', 'watch', 'risk']),
    text: z.string().max(240),
  }),
  z.object({
    kind: z.literal('actions'),
    items: z.array(z.string().max(160)).min(1).max(3),
  }),
])

export type InsightBlock = z.infer<typeof InsightBlockSchema>

/**
 * Freeze relative ranges to absolute dates before persisting (§3.6). The 90-day
 * window rolls with today (§2.4), so a stored `range: 30` would silently redraw
 * with numbers the user never saw.
 */
export function normaliseBlock(block: InsightBlock, asOf: string): InsightBlock {
  if (block.kind !== 'metric' || block.range === undefined) return block
  const to = asOf
  const from = format(subDays(new Date(`${asOf}T00:00:00`), block.range - 1), 'yyyy-MM-dd')
  return { kind: 'metric', metricId: block.metricId, period: { from, to } }
}
