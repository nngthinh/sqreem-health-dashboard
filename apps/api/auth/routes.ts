import { timingSafeEqual } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import type { AppBindings } from '../app'
import { db } from '../db/client'
import { users } from '../db/schema'
import { getOrCreateFixedUser, upsertGoogleUser } from '../db/users'
import type { Env } from '../env'
import {
  claimsFromIdToken,
  createAuthorizationUrl,
  exchangeCodeForIdToken,
  generateCodeVerifier,
  generateState,
} from './google'
import { DEMO_SUB, DEV_SUB } from './guard'
import {
  clearSessionCookie,
  createSession,
  destroySession,
  readSessionCookie,
  setSessionCookie,
} from './session'

const attempts = new Map<string, { count: number; resetAt: number }>()

function tooManyAttempts(ip: string): boolean {
  const now = Date.now()
  const entry = attempts.get(ip)
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + 15 * 60_000 })
    return false
  }
  entry.count += 1
  return entry.count > 5
}

function constantTimeEquals(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

export function authRoutes(env: Env) {
  const app = new Hono<AppBindings>()

  app.get('/api/auth/login', async (c) => {
    if (env.authMode === 'demo') return c.json({ error: 'not_found' }, 404)
    const state = generateState()
    const verifier = generateCodeVerifier()
    const opts = {
      httpOnly: true,
      secure: env.isProduction,
      sameSite: 'Lax',
      path: '/',
      maxAge: 600,
    } as const
    setCookie(c, 'g_state', state, opts)
    setCookie(c, 'g_verifier', verifier, opts)
    return c.redirect(createAuthorizationUrl(env, state, verifier))
  })

  app.get('/api/auth/callback', async (c) => {
    if (env.authMode === 'demo') return c.json({ error: 'not_found' }, 404)
    const code = c.req.query('code')
    const state = c.req.query('state')
    const storedState = getCookie(c, 'g_state')
    const verifier = getCookie(c, 'g_verifier')
    deleteCookie(c, 'g_state', { path: '/' })
    deleteCookie(c, 'g_verifier', { path: '/' })

    if (!code || !state || !storedState || !verifier || state !== storedState) {
      return c.redirect('/login?error=oauth_state')
    }

    const claims = claimsFromIdToken(await exchangeCodeForIdToken(env, code, verifier))
    const user = await upsertGoogleUser({
      googleSub: claims.sub,
      email: claims.email,
      name: claims.name,
      picture: claims.picture ?? null,
    })
    const session = await createSession(user.id)
    await setSessionCookie(c, session.id, session.expiresAt)
    return c.redirect('/')
  })

  app.post('/api/auth/demo', async (c) => {
    if (env.authMode !== 'demo' || !env.demoAccessCode) return c.json({ error: 'not_found' }, 404)
    const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local'
    if (tooManyAttempts(ip)) return c.json({ error: 'too_many_attempts' }, 429)

    const body = await c.req.json<{ code?: string }>().catch(() => ({}) as { code?: string })
    if (!body.code || !constantTimeEquals(body.code, env.demoAccessCode)) {
      return c.json({ error: 'invalid_code' }, 401)
    }
    const user = await getOrCreateFixedUser(DEMO_SUB, 'demo@health-insight', 'Demo User')
    const session = await createSession(user.id)
    await setSessionCookie(c, session.id, session.expiresAt)
    return c.json({ ok: true })
  })

  app.post('/api/auth/dev', async (c) => {
    if (!env.devBypass) return c.json({ error: 'not_found' }, 404)
    const user = await getOrCreateFixedUser(DEV_SUB, env.devUserEmail, 'Dev User')
    const session = await createSession(user.id)
    await setSessionCookie(c, session.id, session.expiresAt)
    return c.json({ ok: true })
  })

  app.post('/api/auth/logout', async (c) => {
    const sessionId = await readSessionCookie(c)
    if (sessionId) await destroySession(sessionId)
    clearSessionCookie(c)
    return c.json({ ok: true })
  })

  app.get('/api/me', async (c) => {
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.id, c.get('userId')))
      .limit(1)
    const user = rows[0]
    if (!user) return c.json({ error: 'unauthenticated' }, 401)
    return c.json({
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      authMode: env.authMode,
      devBypass: env.devBypass,
    })
  })

  return app
}
