import { describe, expect, it } from 'vitest'
import { BlockKind, InsightBlockSchema, normaliseBlock } from '../blocks.js'

describe('InsightBlockSchema', () => {
  it('accepts a metric block with a legal range', () => {
    const parsed = InsightBlockSchema.safeParse({ kind: 'metric', metricId: 'sleep', range: 30 })
    expect(parsed.success).toBe(true)
  })

  it('rejects an invented metric id', () => {
    const parsed = InsightBlockSchema.safeParse({ kind: 'metric', metricId: 'hrv', range: 30 })
    expect(parsed.success).toBe(false)
  })

  it('rejects a range that is not 7, 30 or 90', () => {
    const parsed = InsightBlockSchema.safeParse({ kind: 'metric', metricId: 'steps', range: 14 })
    expect(parsed.success).toBe(false)
  })

  it('rejects a goal block naming a metric that is not a goal', () => {
    const parsed = InsightBlockSchema.safeParse({ kind: 'goal', goalId: 'distance' })
    expect(parsed.success).toBe(false)
  })

  it('caps callout text at 240 characters', () => {
    const parsed = InsightBlockSchema.safeParse({
      kind: 'callout',
      tone: 'watch',
      text: 'x'.repeat(241),
    })
    expect(parsed.success).toBe(false)
  })

  it('allows at most three action items', () => {
    const parsed = InsightBlockSchema.safeParse({ kind: 'actions', items: ['a', 'b', 'c', 'd'] })
    expect(parsed.success).toBe(false)
  })
})

describe('normaliseBlock', () => {
  it('freezes a relative range into absolute dates', () => {
    const block = { kind: BlockKind.Metric, metricId: 'sleep', range: 30 } as const
    expect(normaliseBlock(block, '2026-09-20')).toEqual({
      kind: BlockKind.Metric,
      metricId: 'sleep',
      period: { from: '2026-08-22', to: '2026-09-20' },
    })
  })

  it('leaves a comparison block, which is already absolute, untouched', () => {
    const block = {
      kind: BlockKind.Comparison,
      metricId: 'steps',
      periodA: { from: '2026-09-14', to: '2026-09-20' },
      periodB: { from: '2026-09-07', to: '2026-09-13' },
    } as const
    expect(normaliseBlock(block, '2026-09-20')).toEqual(block)
  })
})
