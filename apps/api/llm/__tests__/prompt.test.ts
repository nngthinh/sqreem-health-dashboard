import { getDatasetFor } from '@health/shared/data'
import { BlockKind, type ChatView, GOAL_IDS, METRIC_IDS } from '@health/shared/schema'
import { describe, expect, it } from 'vitest'
import { buildSystemPrompt } from '../prompt.js'
import { TOOL_DEFS } from '../tools/index.js'

const TODAY = '2026-09-20'
const { persona, goals } = getDatasetFor('any-user', TODAY)

const prompt = (view?: ChatView) =>
  buildSystemPrompt(persona, goals, 'DATA DIGEST (as of 2026-09-20)', view)

describe('output contract', () => {
  it('documents every block kind the renderer accepts', () => {
    const text = prompt()

    for (const kind of Object.values(BlockKind)) expect(text).toContain(`"kind": "${kind}"`)
  })

  it('caps blocks per reply and keeps numbers out of them', () => {
    const text = prompt()

    expect(text).toContain('at most two')
    expect(text).toContain('Never write a number inside one')
  })
})

describe('tools section', () => {
  it('names every tool Gemini is given, so the prompt cannot drift from the declarations', () => {
    const text = prompt()

    for (const tool of TOOL_DEFS) expect(text).toContain(tool.name)
  })
})

describe('identifiers', () => {
  it('enumerates the only ids that exist', () => {
    const text = prompt()

    for (const id of [...METRIC_IDS, ...GOAL_IDS]) expect(text).toContain(id)
    expect(text).toContain('No heart rate, HRV, weight, mood, water or nutrition data exists')
  })

  it('includes the current view only when one is given', () => {
    expect(prompt({ route: '/metrics', metricId: 'sleep' })).toContain('/metrics')
    expect(prompt()).not.toContain('CURRENT VIEW')
  })
})
