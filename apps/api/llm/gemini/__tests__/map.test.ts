import { describe, expect, it } from 'vitest'
import { type LlmMessage, LlmRole } from '../../types.js'
import { toGeminiContents } from '../map.js'

const AS_OF = '2026-09-20'

const user = (content: string): LlmMessage => ({ role: LlmRole.User, content, toolCalls: [] })
const assistant = (content: string, toolCalls: LlmMessage['toolCalls'] = []): LlmMessage => ({
  role: LlmRole.Assistant,
  content,
  toolCalls,
})

describe('role translation', () => {
  it('maps assistant to model, because Gemini has no assistant role', () => {
    const out = toGeminiContents([user('hi'), assistant('hello')])

    expect(out.map((c) => c.role)).toEqual(['user', 'model'])
  })

  it('never emits a system turn — the system prompt is a separate top-level field', () => {
    const roles: string[] = toGeminiContents([user('hi')]).map((c) => c.role)

    expect(roles).not.toContain('system')
  })
})

describe('alternation rules', () => {
  it('drops a leading non-user entry', () => {
    const out = toGeminiContents([assistant('orphan opener'), user('hi')])

    expect(out[0]?.role).toBe('user')
    expect(out[0]?.parts[0]).toEqual({ text: 'hi' })
  })

  it('merges adjacent same-role entries', () => {
    const out = toGeminiContents([user('one'), assistant('a'), assistant('b'), user('two')])

    expect(out.map((c) => c.role)).toEqual(['user', 'model', 'user'])
    expect(out[1]?.parts).toEqual([{ text: 'a' }, { text: 'b' }])
  })

  it('returns an empty array rather than an invalid single model turn', () => {
    expect(toGeminiContents([assistant('nothing to reply to')])).toEqual([])
  })
})

describe('thought signatures', () => {
  const signed = {
    name: 'get_metric_series',
    args: { metricId: 'steps' },
    response: { ok: true },
    asOf: AS_OF,
    signature: 'sig-1',
  }
  const unsigned = {
    name: 'get_recent_workouts',
    args: {},
    response: { ok: true },
    asOf: AS_OF,
  }

  it('replays a call with the signature it was issued with', () => {
    const out = toGeminiContents([user('steps?'), assistant('Checking.', [signed])])

    expect(out[1]?.parts).toContainEqual({
      functionCall: { name: 'get_metric_series', args: { metricId: 'steps' } },
      thoughtSignature: 'sig-1',
    })
  })

  it('drops an unsigned call once the conversation shows signatures', () => {
    const out = toGeminiContents([
      user('workouts?'),
      assistant('An older answer.', [unsigned]),
      user('steps?'),
      assistant('Checking.', [signed]),
    ])

    const calls = out.flatMap((content) => content.parts).filter((part) => 'functionCall' in part)

    expect(calls).toHaveLength(1)
    // The prose of the older turn still replays; only its tool traffic is dropped.
    expect(out.flatMap((content) => content.parts)).toContainEqual({ text: 'An older answer.' })
  })

  it('keeps unsigned calls when nothing in the conversation is signed', () => {
    const out = toGeminiContents([user('workouts?'), assistant('Checking.', [unsigned])])

    expect(out[1]?.parts).toContainEqual({
      functionCall: { name: 'get_recent_workouts', args: {} },
    })
    expect(out[2]?.parts).toHaveLength(1)
  })
})

describe('tool exchanges', () => {
  it('expands one stored assistant row into a model turn and a following user turn', () => {
    const out = toGeminiContents([
      user("how's my sleep?"),
      assistant('Let me check.', [
        {
          name: 'get_goal_progress',
          args: { goalId: 'sleep' },
          response: { ok: true, met: 2, of: 7 },
          asOf: AS_OF,
        },
      ]),
    ])

    expect(out).toHaveLength(3)
    expect(out[1]?.role).toBe('model')
    expect(out[1]?.parts).toEqual([
      { text: 'Let me check.' },
      { functionCall: { name: 'get_goal_progress', args: { goalId: 'sleep' } } },
    ])
    expect(out[2]).toEqual({
      role: 'user',
      parts: [
        {
          functionResponse: {
            name: 'get_goal_progress',
            response: { ok: true, met: 2, of: 7, asOf: AS_OF },
          },
        },
      ],
    })
  })

  it('pairs two calls from one row into one model turn and one response turn', () => {
    const out = toGeminiContents([
      user('compare my weeks'),
      assistant('', [
        {
          name: 'compare_periods',
          args: { metricId: 'steps' },
          response: { ok: true },
          asOf: AS_OF,
        },
        {
          name: 'get_metric_series',
          args: { metricId: 'steps' },
          response: { ok: true },
          asOf: AS_OF,
        },
      ]),
    ])

    expect(out[1]?.parts.filter((p) => 'functionCall' in p)).toHaveLength(2)
    expect(out[2]?.parts).toHaveLength(2)
  })

  it('stamps every result with the day it was computed, so an old exchange reads as history', () => {
    const out = toGeminiContents([
      user('and last month?'),
      assistant('Checked.', [
        { name: 'get_metric_series', args: {}, response: { ok: true }, asOf: '2026-08-01' },
      ]),
    ])

    const part = out[2]?.parts[0]

    expect(part).toEqual({
      functionResponse: { name: 'get_metric_series', response: { ok: true, asOf: '2026-08-01' } },
    })
  })

  it('drops an orphaned call, which a turn aborted mid-tool-round can persist', () => {
    const out = toGeminiContents([
      user('hi'),
      assistant('checking', [
        { name: 'get_metric_series', args: {}, response: undefined, asOf: AS_OF },
      ]),
    ])

    expect(out).toHaveLength(2)
    expect(out[1]?.parts).toEqual([{ text: 'checking' }])
  })

  it('drops an assistant row that is empty once its orphaned call is removed', () => {
    const out = toGeminiContents([
      user('hi'),
      assistant('', [{ name: 'get_metric_series', args: {}, response: undefined, asOf: AS_OF }]),
    ])

    expect(out).toHaveLength(1)
  })
})
