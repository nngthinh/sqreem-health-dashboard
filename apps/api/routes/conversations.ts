import { Hono } from 'hono'
import { z } from 'zod'
import type { AppBindings } from '../app.js'
import {
  createConversation,
  deleteConversation,
  getConversation,
  listConversations,
  renameConversation,
  titleFrom,
} from '../db/conversations.js'

const CreateSchema = z.object({ firstMessage: z.string().max(2000).optional() })
const RenameSchema = z.object({ title: z.string().min(1).max(120) })

const notFound = { error: 'not_found' } as const

/** Postgres rejects a non-uuid id, so malformed ids answer 404 like any unknown one. */
const conversationId = (raw: string): string | null =>
  z.string().uuid().safeParse(raw).success ? raw : null

/**
 * A conversation belonging to another user answers 404 rather than 403: a 403
 * would confirm the row exists.
 */
export function conversationRoutes() {
  const app = new Hono<AppBindings>()

  app.get('/api/conversations', async (c) => c.json(await listConversations(c.get('userId'))))

  app.post('/api/conversations', async (c) => {
    const body = CreateSchema.safeParse(await c.req.json().catch(() => ({})))
    if (!body.success) return c.json({ error: 'bad_request' }, 400)

    const title = titleFrom(body.data.firstMessage ?? '')

    return c.json(await createConversation(c.get('userId'), title), 201)
  })

  app.get('/api/conversations/:id', async (c) => {
    const id = conversationId(c.req.param('id'))
    if (!id) return c.json(notFound, 404)

    const result = await getConversation(c.get('userId'), id)

    return result ? c.json(result) : c.json(notFound, 404)
  })

  app.patch('/api/conversations/:id', async (c) => {
    const id = conversationId(c.req.param('id'))
    if (!id) return c.json(notFound, 404)

    const body = RenameSchema.safeParse(await c.req.json().catch(() => ({})))
    if (!body.success) return c.json({ error: 'bad_request' }, 400)

    const updated = await renameConversation(c.get('userId'), id, body.data.title)

    return updated ? c.json(updated) : c.json(notFound, 404)
  })

  app.delete('/api/conversations/:id', async (c) => {
    const id = conversationId(c.req.param('id'))
    if (!id) return c.json(notFound, 404)

    const deleted = await deleteConversation(c.get('userId'), id)

    return deleted ? c.json({ ok: true }) : c.json(notFound, 404)
  })

  return app
}
