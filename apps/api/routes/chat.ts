import { getDatasetFor } from '@health/shared/data'
import { buildDigest } from '@health/shared/insights'
import {
  type ChatMessage,
  ChatRequestSchema,
  extractInsightBlocks,
  MessageRole,
  type ToolExchange,
} from '@health/shared/schema'
import { format } from 'date-fns'
import { Hono } from 'hono'
import { type SSEStreamingApi, streamSSE } from 'hono/streaming'
import type { AppBindings } from '../app.js'
import { appendMessage, getConversation } from '../db/conversations.js'
import type { Env } from '../env.js'
import { createProvider } from '../llm/gemini/provider.js'
import { LoopEventType, runToolLoop, type TokenUsage } from '../llm/loop.js'
import { buildSystemPrompt } from '../llm/prompt.js'
import { TOOL_DEFS } from '../llm/tools/index.js'
import { type LlmMessage, LlmRole } from '../llm/types.js'
import { checkRateLimit } from '../rateLimit.js'

/** How much of the transcript replays verbatim — what makes "and the month before?" resolve. */
const HISTORY_EXCHANGES = 10

enum SseEvent {
  Delta = 'delta',
  Tool = 'tool',
  Done = 'done',
  Error = 'error',
}

const toLlmMessage = (message: ChatMessage): LlmMessage => ({
  role: message.role === MessageRole.User ? LlmRole.User : LlmRole.Assistant,
  content: message.content,
  toolCalls: message.toolCalls,
})

const write = (stream: SSEStreamingApi, event: SseEvent, data: unknown) =>
  stream.writeSSE({ event, data: JSON.stringify(data) })

/**
 * The route owns three guarantees the loop does not: only the last N exchanges reach the
 * prompt, only validated blocks reach the client, and every terminal event — success or
 * failure — is persisted before it is sent, so a stream that dies mid-flight still leaves
 * the user with what arrived.
 */
export function chatRoutes(env: Env) {
  const app = new Hono<AppBindings>()
  const provider = createProvider(env)

  app.post('/api/chat', async (c) => {
    const userId = c.get('userId')

    if (!checkRateLimit(userId, env.rateLimitPerMin)) {
      return c.json({ error: 'rate_limited', message: 'One moment, catching up.' }, 429)
    }

    // Only { conversationId, message, view } is accepted — prior turns are read from the
    // database, so a forged transcript cannot reach the prompt.
    const parsed = ChatRequestSchema.safeParse(await c.req.json().catch(() => ({})))
    if (!parsed.success) return c.json({ error: 'bad_request' }, 400)

    const { conversationId, message, view } = parsed.data

    const thread = await getConversation(userId, conversationId)
    if (!thread) return c.json({ error: 'not_found' }, 404)

    const { persona, goals, records } = getDatasetFor(userId)
    const asOf = records.at(-1)?.date ?? format(new Date(), 'yyyy-MM-dd')
    const system = buildSystemPrompt(persona, goals, buildDigest(records, goals, asOf), view)

    await appendMessage(
      userId,
      conversationId,
      { role: MessageRole.User, content: message, blocks: [], toolCalls: [] },
      asOf,
    )

    const history = thread.messages.slice(-HISTORY_EXCHANGES * 2).map(toLlmMessage)
    history.push({ role: LlmRole.User, content: message, toolCalls: [] })

    const controller = new AbortController()

    /**
     * Persisted before the terminal frame is sent, so the client never renders a reply
     * the transcript does not have. A failed turn takes the same path with whatever
     * streamed before the break, rather than leaving a half-written row.
     */
    const persistReply = (content: string, toolCalls: ToolExchange[], usage?: TokenUsage) =>
      appendMessage(
        userId,
        conversationId,
        {
          role: MessageRole.Assistant,
          content,
          blocks: extractInsightBlocks(content).blocks,
          toolCalls,
          ...usage,
        },
        asOf,
      )

    return streamSSE(c, async (stream) => {
      stream.onAbort(() => controller.abort())

      try {
        for await (const event of runToolLoop({
          provider,
          system,
          messages: history,
          tools: TOOL_DEFS,
          userId,
          today: asOf,
          signal: controller.signal,
        })) {
          if (event.type === LoopEventType.Delta) {
            await write(stream, SseEvent.Delta, { text: event.text })
          } else if (event.type === LoopEventType.Tool) {
            await write(stream, SseEvent.Tool, { name: event.name, status: event.status })
          } else if (event.type === LoopEventType.Complete) {
            await write(stream, SseEvent.Done, {
              message: await persistReply(event.content, event.toolCalls, event.usage),
            })
          } else {
            await write(stream, SseEvent.Error, {
              message: event.message,
              partial: await persistReply(event.partial, event.toolCalls),
            })
          }
        }
      } catch (error) {
        await write(stream, SseEvent.Error, {
          message: error instanceof Error ? error.message : 'stream failed',
          partial: null,
        })
      }
    })
  })

  return app
}
