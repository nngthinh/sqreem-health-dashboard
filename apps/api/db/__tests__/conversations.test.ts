import { BlockKind, MessageRole } from '@health/shared/schema'
import { inArray } from 'drizzle-orm'
import { afterEach, describe, expect, it } from 'vitest'
import { db } from '../client.js'
import {
  appendMessage,
  createConversation,
  deleteConversation,
  getConversation,
  listConversations,
  renameConversation,
  titleFrom,
} from '../conversations.js'
import { users } from '../schema.js'
import { getOrCreateFixedUser } from '../users.js'

const createdUserIds: string[] = []

/** Deleting the user cascades to their conversations and messages. */
afterEach(async () => {
  const ids = createdUserIds.splice(0)
  if (ids.length > 0) await db.delete(users).where(inArray(users.id, ids))
})

async function newUser(label: string): Promise<string> {
  const user = await getOrCreateFixedUser(
    `test:${label}:${crypto.randomUUID()}`,
    `${label}@test`,
    label.toUpperCase(),
  )
  createdUserIds.push(user.id)
  return user.id
}

describe('scoping', () => {
  it('hides another user’s conversation entirely', async () => {
    const [a, b] = [await newUser('a'), await newUser('b')]
    const convo = await createConversation(a, 'Mine')

    expect(await getConversation(b, convo.id)).toBeNull()
    expect(await renameConversation(b, convo.id, 'Hijacked')).toBeNull()
    expect(await deleteConversation(b, convo.id)).toBe(false)
    expect(
      await appendMessage(
        b,
        convo.id,
        { role: MessageRole.User, content: 'hi', blocks: [], toolCalls: [] },
        '2026-09-20',
      ),
    ).toBeNull()
  })

  it('lists only the caller’s conversations, newest first', async () => {
    const a = await newUser('a')
    const first = await createConversation(a, 'First')
    const second = await createConversation(a, 'Second')

    const list = await listConversations(a)

    expect(list.map((c) => c.id)).toEqual([second.id, first.id])
  })
})

describe('messages', () => {
  it('round-trips content, blocks and tool calls', async () => {
    const a = await newUser('a')
    const convo = await createConversation(a, 'Sleep')

    await appendMessage(
      a,
      convo.id,
      { role: MessageRole.User, content: "how's my sleep?", blocks: [], toolCalls: [] },
      '2026-09-20',
    )
    await appendMessage(
      a,
      convo.id,
      {
        role: MessageRole.Assistant,
        content: 'Weeknights are short.',
        blocks: [{ kind: BlockKind.Metric, metricId: 'sleep', range: 30 }],
        toolCalls: [
          { name: 'get_goal_progress', args: { goalId: 'sleep' }, response: { ok: true } },
        ],
      },
      '2026-09-20',
    )

    const loaded = await getConversation(a, convo.id)

    expect(loaded?.messages).toHaveLength(2)
    expect(loaded?.messages[0]?.content).toBe("how's my sleep?")
    expect(loaded?.messages[1]?.toolCalls[0]?.name).toBe('get_goal_progress')
  })

  it('normalises a relative range to absolute dates on write', async () => {
    const a = await newUser('a')
    const convo = await createConversation(a, 'Sleep')

    await appendMessage(
      a,
      convo.id,
      {
        role: MessageRole.Assistant,
        content: 'x',
        blocks: [{ kind: BlockKind.Metric, metricId: 'sleep', range: 30 }],
        toolCalls: [],
      },
      '2026-09-20',
    )

    const loaded = await getConversation(a, convo.id)

    expect(loaded?.messages[0]?.blocks[0]).toEqual({
      kind: BlockKind.Metric,
      metricId: 'sleep',
      period: { from: '2026-08-22', to: '2026-09-20' },
    })
  })

  it('bumps updated_at so the sidebar reorders', async () => {
    const a = await newUser('a')
    const older = await createConversation(a, 'Older')
    const newer = await createConversation(a, 'Newer')

    await appendMessage(
      a,
      older.id,
      { role: MessageRole.User, content: 'ping', blocks: [], toolCalls: [] },
      '2026-09-20',
    )

    const list = await listConversations(a)

    expect(list[0]?.id).toBe(older.id)
    expect(list[1]?.id).toBe(newer.id)
  })
})

describe('deleteConversation', () => {
  it('really deletes, and takes the messages with it', async () => {
    const a = await newUser('a')
    const convo = await createConversation(a, 'Gone')
    await appendMessage(
      a,
      convo.id,
      { role: MessageRole.User, content: 'hi', blocks: [], toolCalls: [] },
      '2026-09-20',
    )

    expect(await deleteConversation(a, convo.id)).toBe(true)
    expect(await getConversation(a, convo.id)).toBeNull()
  })
})

describe('titleFrom', () => {
  it('derives a title from the first user message without a second model call', () => {
    expect(titleFrom('How is my sleep looking this month?')).toBe(
      'How is my sleep looking this month?',
    )
  })

  it('truncates a long message', () => {
    expect(titleFrom('x'.repeat(200))).toHaveLength(60)
  })

  it('falls back for an empty message', () => {
    expect(titleFrom('   ')).toBe('New chat')
  })
})
