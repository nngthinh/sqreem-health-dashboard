import { describe, expect, it } from 'vitest'
import { BlockKind, extractInsightBlocks, Tone } from '../blocks.js'

describe('extractInsightBlocks', () => {
  it('extracts a well-formed block', () => {
    const md =
      'Your sleep has been slipping.\n\n```insight\n{ "kind": "metric", "metricId": "sleep", "range": 30 }\n```\n'

    const { blocks, dropped } = extractInsightBlocks(md)

    expect(blocks).toEqual([{ kind: BlockKind.Metric, metricId: 'sleep', range: 30 }])
    expect(dropped).toBe(0)
  })

  it('extracts two blocks from one message', () => {
    const md =
      '```insight\n{ "kind": "goal", "goalId": "sleep" }\n```\ntext\n```insight\n{ "kind": "goal", "goalId": "steps" }\n```'

    expect(extractInsightBlocks(md).blocks).toHaveLength(2)
  })

  it('drops malformed JSON and keeps the prose', () => {
    const md = 'Here you go.\n```insight\n{ kind: metric, }\n```'

    const { blocks, dropped } = extractInsightBlocks(md)

    expect(blocks).toEqual([])
    expect(dropped).toBe(1)
  })

  it('drops an invented metric id', () => {
    const md = '```insight\n{ "kind": "metric", "metricId": "hrv", "range": 30 }\n```'

    expect(extractInsightBlocks(md).blocks).toEqual([])
  })

  it('drops an out-of-range value', () => {
    const md = '```insight\n{ "kind": "metric", "metricId": "steps", "range": 45 }\n```'

    expect(extractInsightBlocks(md).blocks).toEqual([])
  })

  it('carries injected HTML as plain text rather than markup', () => {
    const md =
      '```insight\n{ "kind": "callout", "tone": "good", "text": "<img src=x onerror=alert(1)>" }\n```'

    const { blocks } = extractInsightBlocks(md)

    // The block validates as a string, so the renderer must escape it — assert the
    // value is carried as plain text and never as markup.
    expect(blocks[0]).toEqual({
      kind: BlockKind.Callout,
      tone: Tone.Good,
      text: '<img src=x onerror=alert(1)>',
    })
  })

  it('ignores an unclosed fence, which is every mid-stream message', () => {
    const md = 'Streaming...\n```insight\n{ "kind": "metric"'

    expect(extractInsightBlocks(md).blocks).toEqual([])
  })

  it('leaves ordinary code fences alone', () => {
    const md = '```json\n{ "kind": "metric", "metricId": "sleep", "range": 30 }\n```'

    expect(extractInsightBlocks(md).blocks).toEqual([])
  })

  it('caps a reply at two blocks', () => {
    const one = '```insight\n{ "kind": "goal", "goalId": "sleep" }\n```\n'

    expect(extractInsightBlocks(one.repeat(5)).blocks).toHaveLength(2)
  })
})
