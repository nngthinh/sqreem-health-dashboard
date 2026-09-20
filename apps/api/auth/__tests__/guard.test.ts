import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import type { AppBindings } from '../../app.js'
import { parseEnv } from '../../env.js'
import { authGuard } from '../guard.js'

const raw = process.env as Record<string, string | undefined>
const appWith = (env: ReturnType<typeof parseEnv>) => {
  const app = new Hono<AppBindings>()
  app.use('/api/*', authGuard(env))
  app.get('/api/health', (c) => c.json({ ok: true }))
  app.get('/api/auth/login', (c) => c.json({ ok: true }))
  app.get('/api/auth/callback', (c) => c.json({ ok: true }))
  app.post('/api/auth/demo', (c) => c.json({ ok: true }))
  app.post('/api/auth/dev', (c) => c.json({ ok: true }))
  app.get('/api/insights', (c) => c.json({ userId: c.get('userId') }))
  app.get('/api/conversations', (c) => c.json({ ok: true }))
  return app
}

const noBypass = parseEnv({ ...raw, AUTH_DEV_BYPASS: 'false' })
const withBypass = parseEnv({ ...raw, AUTH_DEV_BYPASS: 'true' })

describe('authGuard allowlist', () => {
  it.each(['/api/health', '/api/auth/login', '/api/auth/callback'])(
    'allows %s without a session',
    async (path) => {
      expect((await appWith(noBypass).request(path)).status).toBe(200)
    },
  )

  it.each(['/api/auth/demo', '/api/auth/dev'])(
    'allows %s without a session, so there is a way to obtain one',
    async (path) => {
      expect((await appWith(noBypass).request(path, { method: 'POST' })).status).toBe(200)
    },
  )

  it.each(['/api/insights', '/api/conversations'])('rejects %s without a session', async (path) => {
    expect((await appWith(noBypass).request(path)).status).toBe(401)
  })
})

describe('dev bypass', () => {
  it('resolves a guarded route to the fixed dev user when enabled', async () => {
    const res = await appWith(withBypass).request('/api/insights')
    expect(res.status).toBe(200)
    expect(((await res.json()) as { userId: string }).userId).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('does not apply in production even when the flag is set', async () => {
    const prod = parseEnv({
      ...raw,
      NODE_ENV: 'production',
      AUTH_DEV_BYPASS: 'true',
      GOOGLE_CLIENT_ID: 'x',
      GOOGLE_CLIENT_SECRET: 'y',
      GOOGLE_REDIRECT_URI: 'https://x/api/auth/callback',
    })
    expect((await appWith(prod).request('/api/insights')).status).toBe(401)
  })
})
