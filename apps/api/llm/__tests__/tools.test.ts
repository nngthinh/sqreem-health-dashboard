import { describe, expect, it } from 'vitest'
import { MAX_TOOL_ROUNDS, runTool, TOOL_DEFS } from '../tools.js'

const USER = 'any-user'
const TODAY = '2026-09-20'

describe('tool contract', () => {
  it('exposes exactly the four tools in the design', () => {
    expect(TOOL_DEFS.map((tool) => tool.name).sort()).toEqual([
      'compare_periods',
      'get_goal_progress',
      'get_metric_series',
      'get_recent_workouts',
    ])
  })

  it('caps tool rounds at four', () => {
    expect(MAX_TOOL_ROUNDS).toBe(4)
  })
})

describe('get_metric_series', () => {
  it('returns daily points for a valid metric', async () => {
    const result = await runTool(
      USER,
      'get_metric_series',
      { metricId: 'steps', from: '2026-09-14', to: '2026-09-20', granularity: 'day' },
      TODAY,
    )

    expect(result.ok).toBe(true)
    if (result.ok && 'points' in result) expect(result.points).toHaveLength(7)
  })

  it('aggregates to weeks when asked, since nothing finer than a day exists', async () => {
    const result = await runTool(
      USER,
      'get_metric_series',
      { metricId: 'steps', from: '2026-08-24', to: '2026-09-20', granularity: 'week' },
      TODAY,
    )

    expect(result.ok).toBe(true)
    if (result.ok && 'points' in result) expect(result.points.length).toBeLessThanOrEqual(5)
  })

  it('returns the list of valid ids on an unknown metric, so the model self-corrects', async () => {
    const result = await runTool(USER, 'get_metric_series', { metricId: 'hrv' }, TODAY)

    expect(result).toMatchObject({ ok: false, reason: 'unknown_metric' })
    if (!result.ok) expect(result.validIds).toEqual(['steps', 'distance', 'calories', 'sleep'])
  })

  it('says no_data explicitly rather than returning silence', async () => {
    const result = await runTool(
      USER,
      'get_metric_series',
      { metricId: 'steps', from: '2020-01-01', to: '2020-01-07' },
      TODAY,
    )

    expect(result).toMatchObject({ ok: false, reason: 'no_data' })
  })
})

describe('get_goal_progress', () => {
  it('returns attainment and adherence together, the same pair the user sees', async () => {
    const result = await runTool(USER, 'get_goal_progress', { goalId: 'sleep' }, TODAY)

    expect(result.ok).toBe(true)
    if (result.ok && 'goals' in result) {
      const sleep = result.goals[0]

      expect(sleep).toHaveProperty('attainment')
      expect(sleep).toHaveProperty('met')
      expect(sleep).toHaveProperty('of')
    }
  })

  it('rejects a metric that is not a goal', async () => {
    const result = await runTool(USER, 'get_goal_progress', { goalId: 'distance' }, TODAY)

    expect(result).toMatchObject({ ok: false, reason: 'unknown_metric' })
  })
})

describe('compare_periods and get_recent_workouts', () => {
  it('compares two periods with a computed delta', async () => {
    const result = await runTool(
      USER,
      'compare_periods',
      {
        metricId: 'steps',
        periodA: { from: '2026-09-14', to: '2026-09-20' },
        periodB: { from: '2026-09-07', to: '2026-09-13' },
      },
      TODAY,
    )

    expect(result.ok).toBe(true)
    if (result.ok && 'deltaPct' in result) expect(typeof result.deltaPct).toBe('number')
  })

  it('returns recent workouts up to the limit', async () => {
    const result = await runTool(USER, 'get_recent_workouts', { limit: 3 }, TODAY)

    expect(result.ok).toBe(true)
    if (result.ok && 'workouts' in result) expect(result.workouts.length).toBeLessThanOrEqual(3)
  })
})

describe('unknown tool', () => {
  it('fails closed', async () => {
    const result = await runTool(USER, 'drop_table', {}, TODAY)

    expect(result.ok).toBe(false)
  })
})
