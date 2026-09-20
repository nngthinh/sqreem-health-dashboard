import { format, subDays } from 'date-fns'
import { z } from 'zod'
import { GoalIdSchema, MetricIdSchema, RangeSchema } from './ids.js'
import { PeriodSchema } from './records.js'

export enum BlockKind {
  Metric = 'metric',
  Comparison = 'comparison',
  Goal = 'goal',
  Callout = 'callout',
  Actions = 'actions',
}

/** Callout tones. Not `Band`: a callout can be a `Risk`, a goal status cannot. */
export enum Tone {
  Good = 'good',
  Watch = 'watch',
  Risk = 'risk',
}

export const BlockKindSchema = z.enum(BlockKind)
export const ToneSchema = z.enum(Tone)

export const InsightBlockSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal(BlockKind.Metric),
    metricId: MetricIdSchema,
    range: RangeSchema.optional(),
    period: PeriodSchema.optional(),
  }),
  z.object({
    kind: z.literal(BlockKind.Comparison),
    metricId: MetricIdSchema,
    periodA: PeriodSchema,
    periodB: PeriodSchema,
  }),
  z.object({ kind: z.literal(BlockKind.Goal), goalId: GoalIdSchema }),
  z.object({
    kind: z.literal(BlockKind.Callout),
    tone: ToneSchema,
    text: z.string().max(240),
  }),
  z.object({
    kind: z.literal(BlockKind.Actions),
    items: z.array(z.string().max(160)).min(1).max(3),
  }),
])

export type InsightBlock = z.infer<typeof InsightBlockSchema>

/**
 * Freeze relative ranges to absolute dates before persisting. The 90-day
 * window rolls with today, so a stored `range: 30` would silently redraw
 * with numbers the user never saw.
 */
export function normaliseBlock(block: InsightBlock, asOf: string): InsightBlock {
  if (block.kind !== BlockKind.Metric || block.range === undefined) return block
  const to = asOf
  const from = format(subDays(new Date(`${asOf}T00:00:00`), block.range - 1), 'yyyy-MM-dd')
  return { kind: BlockKind.Metric, metricId: block.metricId, period: { from, to } }
}

const INSIGHT_FENCE = /```insight\s*\n([\s\S]*?)\n```/g

export const MAX_BLOCKS_PER_MESSAGE = 2

/**
 * Parse then validate, both failing safe: a block that does not parse or does not
 * validate is dropped and the prose around it still arrives. An unclosed fence —
 * every mid-stream message — simply matches nothing.
 */
export function extractInsightBlocks(markdown: string): {
  blocks: InsightBlock[]
  dropped: number
} {
  const blocks: InsightBlock[] = []
  let dropped = 0

  for (const match of markdown.matchAll(INSIGHT_FENCE)) {
    const body = match[1]
    if (body === undefined) continue

    let json: unknown
    try {
      json = JSON.parse(body)
    } catch {
      dropped += 1
      continue
    }

    const parsed = InsightBlockSchema.safeParse(json)
    if (parsed.success) blocks.push(parsed.data)
    else dropped += 1
  }

  return { blocks: blocks.slice(0, MAX_BLOCKS_PER_MESSAGE), dropped }
}
