import { z } from 'zod'
import type { InsightBlock } from './blocks.js'
import { MetricIdSchema } from './ids.js'

/** The client posts only this. Prior turns are read from the database, never accepted. */
export const ChatViewSchema = z.object({
  route: z.string().max(80),
  metricId: MetricIdSchema.optional(),
})

/** What the user is looking at as they ask, so "this" in a question has a referent. */
export type ChatView = z.infer<typeof ChatViewSchema>

export const ChatRequestSchema = z.object({
  conversationId: z.string().uuid(),
  message: z.string().min(1).max(2000),
  view: ChatViewSchema.optional(),
})
export type ChatRequest = z.infer<typeof ChatRequestSchema>

export enum MessageRole {
  User = 'user',
  Assistant = 'assistant',
}

export const MessageRoleSchema = z.enum(MessageRole)

/**
 * `asOf` is the day the tool was run against, not a wall-clock instant: health data has
 * daily granularity, so the day is what decides whether a figure is still current.
 * Exchanges are kept for the life of the conversation — the stamp is what lets an old
 * one read as history rather than being mistaken for today's numbers.
 */
export type ToolExchange = { name: string; args: unknown; response: unknown; asOf: string }

export type ChatMessage = {
  id: string
  role: MessageRole
  content: string
  blocks: InsightBlock[]
  toolCalls: ToolExchange[]
  createdAt: string
}

export type ConversationSummary = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}
