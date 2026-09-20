import { describe, expect, it } from 'vitest'
import { getOrCreateFixedUser } from '../../db/users'
import { createSession, destroySession, readSession } from '../session'

describe('session store', () => {
  it('round-trips a session and resolves it to its user', async () => {
    const user = await getOrCreateFixedUser('dev:local', 'dev@localhost', 'Dev User')
    const session = await createSession(user.id)
    expect(await readSession(session.id)).toEqual({ userId: user.id })
    await destroySession(session.id)
    expect(await readSession(session.id)).toBeNull()
  })

  it('returns null for an unknown session id', async () => {
    expect(await readSession(crypto.randomUUID())).toBeNull()
  })

  it('returns null for an expired session', async () => {
    const user = await getOrCreateFixedUser('dev:local', 'dev@localhost', 'Dev User')
    const session = await createSession(user.id, -1000)
    expect(await readSession(session.id)).toBeNull()
    await destroySession(session.id)
  })
})
