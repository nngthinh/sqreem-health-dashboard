import type {
  ChatMessage,
  ConversationSummary,
  InsightBlock,
  MessageRole,
  ToolExchange,
} from '@health/shared/schema'
import { normaliseBlock } from '@health/shared/schema'
import { and, asc, desc, eq } from 'drizzle-orm'
import { db } from './client.js'
import { conversations, messages } from './schema.js'

const MAX_TITLE_LENGTH = 60

export type AppendMessageInput = {
  role: MessageRole
  content: string
  blocks: InsightBlock[]
  toolCalls: ToolExchange[]
  inputTokens?: number
  outputTokens?: number
}

const toSummary = (row: typeof conversations.$inferSelect): ConversationSummary => ({
  id: row.id,
  title: row.title,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
})

const toMessage = (row: typeof messages.$inferSelect): ChatMessage => ({
  id: row.id,
  role: row.role as MessageRole,
  content: row.content,
  blocks: (row.blocks as InsightBlock[]) ?? [],
  toolCalls: (row.toolCalls as ToolExchange[]) ?? [],
  createdAt: row.createdAt.toISOString(),
})

/** Titled from the first user message rather than a second model call — cheaper and instant. */
export function titleFrom(message: string): string {
  const trimmed = message.trim().replace(/\s+/g, ' ')
  if (trimmed.length === 0) return 'New chat'
  return trimmed.length <= MAX_TITLE_LENGTH
    ? trimmed
    : `${trimmed.slice(0, MAX_TITLE_LENGTH - 3)}...`
}

/**
 * Every read and write below carries `user_id` in its own `where` clause rather
 * than checking ownership afterwards, so no path can forget the check.
 */
async function ownedConversation(userId: string, id: string) {
  const rows = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
    .limit(1)
  return rows[0] ?? null
}

export async function createConversation(
  userId: string,
  title: string,
): Promise<ConversationSummary> {
  const [row] = await db.insert(conversations).values({ userId, title }).returning()
  if (!row) throw new Error('createConversation returned no row')
  return toSummary(row)
}

export async function listConversations(userId: string): Promise<ConversationSummary[]> {
  const rows = await db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.updatedAt))
  return rows.map(toSummary)
}

export async function getConversation(
  userId: string,
  id: string,
): Promise<{ conversation: ConversationSummary; messages: ChatMessage[] } | null> {
  const row = await ownedConversation(userId, id)
  if (!row) return null

  const messageRows = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt))

  return { conversation: toSummary(row), messages: messageRows.map(toMessage) }
}

export async function renameConversation(
  userId: string,
  id: string,
  title: string,
): Promise<ConversationSummary | null> {
  const [row] = await db
    .update(conversations)
    .set({ title, updatedAt: new Date() })
    .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
    .returning()
  return row ? toSummary(row) : null
}

export async function deleteConversation(userId: string, id: string): Promise<boolean> {
  const rows = await db
    .delete(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
    .returning({ id: conversations.id })
  return rows.length > 0
}

export async function appendMessage(
  userId: string,
  conversationId: string,
  input: AppendMessageInput,
  asOf: string,
): Promise<ChatMessage | null> {
  if (!(await ownedConversation(userId, conversationId))) return null

  // Relative ranges are frozen at write time, so an old message keeps showing
  // what the user actually saw even as the 90-day window rolls forward.
  const blocks = input.blocks.map((block) => normaliseBlock(block, asOf))

  const [row] = await db
    .insert(messages)
    .values({
      conversationId,
      role: input.role,
      content: input.content,
      blocks,
      toolCalls: input.toolCalls,
      inputTokens: input.inputTokens ?? null,
      outputTokens: input.outputTokens ?? null,
    })
    .returning()
  if (!row) return null

  // Bumps the conversation to the top of the sidebar.
  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, conversationId))

  return toMessage(row)
}
