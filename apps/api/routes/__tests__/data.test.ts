import { describe, expect, it } from 'vitest'
import { createApp } from '../../app.js'
import { parseEnv } from '../../env.js'

const raw = process.env as Record<string, string | undefined>
const app = createApp(parseEnv({ ...raw, AUTH_DEV_BYPASS: 'true' }))
const locked = createApp(parseEnv({ ...raw, AUTH_DEV_BYPASS: 'false' }))

describe('GET /api/profile', () => {
  it('returns the persona and exactly three per-day goals', async () => {
    const body = await (await app.request('/api/profile')).json()

    expect(body.persona.name).toBe('Daniel Tan')
    expect(body.goals).toHaveLength(3)
    expect(body.goals.every((g: { cadence: string }) => g.cadence === 'day')).toBe(true)
  })

  it('is behind the guard', async () => {
    expect((await locked.request('/api/profile')).status).toBe(401)
  })
})

describe('GET /api/records', () => {
  it('returns the whole 90-day window by default', async () => {
    const body = await (await app.request('/api/records')).json()

    expect(body.records).toHaveLength(90)
  })

  it('filters to an explicit range', async () => {
    const today = new Date().toISOString().slice(0, 10)

    const body = await (await app.request(`/api/records?from=${today}&to=${today}`)).json()

    expect(body.records).toHaveLength(1)
    expect(body.records[0].date).toBe(today)
  })

  it('rejects a malformed date with 400 rather than returning something plausible', async () => {
    expect((await app.request('/api/records?from=yesterday')).status).toBe(400)
  })
})

describe('GET /api/insights', () => {
  it('defaults to the 30-day range', async () => {
    const body = await (await app.request('/api/insights')).json()

    expect(body.range).toBe(30)
  })

  it('carries readiness with its drivers attached', async () => {
    const body = await (await app.request('/api/insights?range=7')).json()

    expect(typeof body.readiness.score === 'number' || body.readiness.score === null).toBe(true)
    expect(body.readiness.drivers.length).toBeGreaterThan(0)
  })

  it('splits movers from the steady strip', async () => {
    const body = await (await app.request('/api/insights?range=7')).json()

    expect(body.movers).toContain('steps')
    expect(body.steady).toContain('calories')
  })

  it('carries both goal numbers, never just the average', async () => {
    const body = await (await app.request('/api/insights?range=7')).json()

    const sleep = body.goals.find((g: { goalId: string }) => g.goalId === 'sleep')
    expect(sleep.attainment).toBeGreaterThan(0.85)
    expect(sleep.met).toBeLessThanOrEqual(3)
    expect(sleep.of).toBeGreaterThan(0)
  })

  it('rejects a range that is not 7, 30 or 90', async () => {
    expect((await app.request('/api/insights?range=14')).status).toBe(400)
  })
})
