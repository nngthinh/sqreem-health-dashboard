import { describe, expect, it } from 'vitest'
import { createApp } from '../app.js'
import { parseEnv } from '../env.js'

const env = parseEnv(process.env as Record<string, string | undefined>)

describe('GET /api/health', () => {
  it('responds 200 without a session', async () => {
    const res = await createApp(env).request('/api/health')
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true })
  })

  it('reports the auth mode so demo mode is never invisible', async () => {
    const res = await createApp(env).request('/api/health')
    expect(await res.json()).toMatchObject({ authMode: 'sso' })
  })
})
