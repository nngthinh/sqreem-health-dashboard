import { createMiddleware } from 'hono/factory'
import type { AppBindings } from '../app.js'
import { getOrCreateFixedUser } from '../db/users.js'
import type { Env } from '../env.js'
import { readSession, readSessionCookie } from './session.js'

/**
 * Every path that has to answer before a session exists: the health probe and the
 * four endpoints that mint sessions. `/api/auth/demo` and `/api/auth/dev` belong here
 * for the same reason `/login` does — guarded, they could never be reached, and demo
 * mode would have no way in at all. Each one gates itself on the mode it belongs to.
 */
const ALLOWLIST = new Set([
  '/api/health',
  '/api/auth/login',
  '/api/auth/callback',
  '/api/auth/demo',
  '/api/auth/dev',
])

export const DEV_SUB = 'dev:local'
export const DEMO_SUB = 'demo:shared'

export function authGuard(env: Env) {
  return createMiddleware<AppBindings>(async (c, next) => {
    if (ALLOWLIST.has(new URL(c.req.url).pathname)) return next()

    if (env.devBypass) {
      const user = await getOrCreateFixedUser(DEV_SUB, env.devUserEmail, 'Dev User')
      c.set('userId', user.id)
      return next()
    }

    const sessionId = await readSessionCookie(c)
    if (!sessionId) return c.json({ error: 'unauthenticated' }, 401)

    const session = await readSession(sessionId)
    if (!session) return c.json({ error: 'unauthenticated' }, 401)

    c.set('userId', session.userId)
    return next()
  })
}
