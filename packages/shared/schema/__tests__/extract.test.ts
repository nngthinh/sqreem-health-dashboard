import { describe, expect, it } from 'vitest'
import { BlockKind, extractInsightBlocks, MAX_BLOCKS_PER_MESSAGE, Tone } from '../blocks.js'

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

  it('caps a reply at the documented number of blocks', () => {
    const one = '```insight\n{ "kind": "goal", "goalId": "sleep" }\n```\n'

    expect(extractInsightBlocks(one.repeat(5)).blocks).toHaveLength(MAX_BLOCKS_PER_MESSAGE)
  })
})

/**
 * A model writes a fence however it likes. Each of these is a real shape one emits, and
 * losing a block to any of them would be a silently missing chart, so they are pinned.
 */
describe('extractInsightBlocks whitespace tolerance', () => {
  const GOAL = '{ "kind": "goal", "goalId": "sleep" }'
  const expected = [{ kind: BlockKind.Goal, goalId: 'sleep' }]

  it.each([
    ['padding inside the object', '```insight\n{   "kind":"goal",   "goalId":"sleep"   }\n```'],
    ['trailing space after the tag', `\`\`\`insight \n${GOAL}\n\`\`\``],
    ['blank lines around the body', `\`\`\`insight\n\n${GOAL}\n\n\`\`\``],
    ['an info string after the tag', `\`\`\`insight chart\n${GOAL}\n\`\`\``],
    ['an indented fence inside a list item', `- here:\n  \`\`\`insight\n  ${GOAL}\n  \`\`\``],
    ['no newline before the closing fence', `\`\`\`insight\n${GOAL}\`\`\``],
    ['CRLF line endings', `\`\`\`insight\r\n${GOAL}\r\n\`\`\``],
    ['four backticks', `\`\`\`\`insight\n${GOAL}\n\`\`\`\``],
  ])('extracts through %s', (_name, md) => {
    expect(extractInsightBlocks(md).blocks).toEqual(expected)
  })

  it.each([
    ['an empty object', '```insight\n{}\n```'],
    ['an object of only whitespace', '```insight\n{    }\n```'],
  ])('drops %s, which parses but is not a block', (_name, md) => {
    const { blocks, dropped } = extractInsightBlocks(md)

    expect(blocks).toEqual([])
    expect(dropped).toBe(1)
  })
})
