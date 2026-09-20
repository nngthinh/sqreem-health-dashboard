import { z } from 'zod'
import type { InsightBlock } from './blocks'
import { MetricIdSchema } from './ids'

/** The client posts only this. Prior turns are read from the database, never accepted. */
export const ChatRequestSchema = z.object({
  conversationId: z.string().uuid(),
  message: z.string().min(1).max(2000),
  view: z.object({ route: z.string().max(80), metricId: MetricIdSchema.optional() }).optional(),
})
export type ChatRequest = z.infer<typeof ChatRequestSchema>

export enum MessageRole {
  User = 'user',
  Assistant = 'assistant',
}

export const MessageRoleSchema = z.enum(MessageRole)

export type ToolExchange = { name: string; args: unknown; response: unknown }

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
