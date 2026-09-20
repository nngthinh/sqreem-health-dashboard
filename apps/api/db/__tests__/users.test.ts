import { eq } from 'drizzle-orm'
import { afterEach, describe, expect, it } from 'vitest'
import { db } from '../client.js'
import { users } from '../schema.js'
import { getOrCreateFixedUser, upsertGoogleUser } from '../users.js'

const subs: string[] = []
const track = <T extends { googleSub: string }>(u: T) => {
  subs.push(u.googleSub)
  return u
}

afterEach(async () => {
  for (const sub of subs.splice(0)) await db.delete(users).where(eq(users.googleSub, sub))
})

describe('upsertGoogleUser', () => {
  it('creates a user on first sign-in', async () => {
    const u = track(
      await upsertGoogleUser({
        googleSub: `test:${crypto.randomUUID()}`,
        email: 'a@example.com',
        name: 'A',
        picture: null,
      }),
    )
    expect(u.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(u.email).toBe('a@example.com')
  })

  it('updates the profile and keeps the same id on second sign-in', async () => {
    const googleSub = `test:${crypto.randomUUID()}`
    const first = track(
      await upsertGoogleUser({ googleSub, email: 'a@example.com', name: 'A', picture: null }),
    )
    const second = await upsertGoogleUser({
      googleSub,
      email: 'a@example.com',
      name: 'A Renamed',
      picture: 'https://example.com/p.png',
    })
    expect(second.id).toBe(first.id)
    expect(second.name).toBe('A Renamed')
  })
})

describe('getOrCreateFixedUser', () => {
  it('is idempotent, so the dev user survives restarts', async () => {
    const sub = `dev:${crypto.randomUUID()}`
    const a = track(await getOrCreateFixedUser(sub, 'dev@localhost', 'Dev User'))
    const b = await getOrCreateFixedUser(sub, 'dev@localhost', 'Dev User')
    expect(b.id).toBe(a.id)
  })
})
