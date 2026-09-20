import { and, eq, gt } from 'drizzle-orm'
import type { Context } from 'hono'
import { deleteCookie, getSignedCookie, setSignedCookie } from 'hono/cookie'
import { db } from '../db/client'
import { sessions } from '../db/schema'
import { env } from '../env'

export const SESSION_COOKIE = 'hi_session'
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export async function createSession(userId: string, ttlMs = SEVEN_DAYS_MS) {
  const expiresAt = new Date(Date.now() + ttlMs)
  const [row] = await db.insert(sessions).values({ userId, expiresAt }).returning()
  if (!row) throw new Error('createSession returned no row')
  return { id: row.id, expiresAt }
}

export async function readSession(sessionId: string): Promise<{ userId: string } | null> {
  const rows = await db
    .select({ userId: sessions.userId })
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date())))
    .limit(1)
  return rows[0] ?? null
}

export async function destroySession(sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId))
}

export async function setSessionCookie(c: Context, sessionId: string, expiresAt: Date) {
  await setSignedCookie(c, SESSION_COOKIE, sessionId, env.sessionSecret, {
    httpOnly: true,
    sameSite: 'Lax',
    secure: env.isProduction,
    path: '/',
    expires: expiresAt,
  })
}

export async function readSessionCookie(c: Context): Promise<string | null> {
  const value = await getSignedCookie(c, env.sessionSecret, SESSION_COOKIE)
  return typeof value === 'string' && value.length > 0 ? value : null
}

export function clearSessionCookie(c: Context) {
  deleteCookie(c, SESSION_COOKIE, { path: '/' })
}
