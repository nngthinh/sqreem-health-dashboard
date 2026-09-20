import { inArray } from 'drizzle-orm'
import { afterEach, describe, expect, it } from 'vitest'
import { createApp } from '../../app.js'
import { db } from '../../db/client.js'
import { conversations } from '../../db/schema.js'
import { parseEnv } from '../../env.js'

const raw = process.env as Record<string, string | undefined>
const app = createApp(parseEnv({ ...raw, AUTH_DEV_BYPASS: 'true' }))
const locked = createApp(parseEnv({ ...raw, AUTH_DEV_BYPASS: 'false' }))

const createdIds: string[] = []

/** The dev-bypass user is shared across tests, so only the rows made here are removed. */
afterEach(async () => {
  const ids = createdIds.splice(0)
  if (ids.length > 0) await db.delete(conversations).where(inArray(conversations.id, ids))
})

async function create(firstMessage?: string) {
  const res = await app.request('/api/conversations', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(firstMessage === undefined ? {} : { firstMessage }),
  })
  const body = await res.json()
  createdIds.push(body.id)
  return { res, body }
}

describe('POST /api/conversations', () => {
  it('creates a conversation titled from the first message', async () => {
    const { res, body } = await create('How is my sleep looking this month?')

    expect(res.status).toBe(201)
    expect(body.title).toBe('How is my sleep looking this month?')
  })

  it('falls back to a default title when no message is sent', async () => {
    const { body } = await create()

    expect(body.title).toBe('New chat')
  })
})

describe('GET /api/conversations', () => {
  it('lists the caller’s conversations, newest first', async () => {
    const { body: older } = await create('Older')
    const { body: newer } = await create('Newer')

    const list = await (await app.request('/api/conversations')).json()

    expect(list.map((c: { id: string }) => c.id).slice(0, 2)).toEqual([newer.id, older.id])
  })

  it('is behind the guard', async () => {
    expect((await locked.request('/api/conversations')).status).toBe(401)
  })
})

describe('GET /api/conversations/:id', () => {
  it('returns the conversation with its messages', async () => {
    const { body: created } = await create('Sleep')

    const loaded = await (await app.request(`/api/conversations/${created.id}`)).json()

    expect(loaded.conversation.id).toBe(created.id)
    expect(loaded.messages).toEqual([])
  })

  it('answers 404 for an unknown id', async () => {
    const res = await app.request(`/api/conversations/${crypto.randomUUID()}`)

    expect(res.status).toBe(404)
  })

  it('answers 404 rather than 500 for a malformed id', async () => {
    expect((await app.request('/api/conversations/not-a-uuid')).status).toBe(404)
  })
})

describe('PATCH /api/conversations/:id', () => {
  it('renames the conversation', async () => {
    const { body: created } = await create('Old title')

    const res = await app.request(`/api/conversations/${created.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'New title' }),
    })

    expect((await res.json()).title).toBe('New title')
  })

  it('rejects an empty title', async () => {
    const { body: created } = await create('Keep me')

    const res = await app.request(`/api/conversations/${created.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: '' }),
    })

    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/conversations/:id', () => {
  it('deletes once and then answers 404', async () => {
    const { body: created } = await create('Gone')

    expect(
      (await app.request(`/api/conversations/${created.id}`, { method: 'DELETE' })).status,
    ).toBe(200)
    expect(
      (await app.request(`/api/conversations/${created.id}`, { method: 'DELETE' })).status,
    ).toBe(404)
  })
})
