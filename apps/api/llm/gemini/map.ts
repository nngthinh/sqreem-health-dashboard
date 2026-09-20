import type { ToolExchange } from '@health/shared/schema'
import { type LlmMessage, LlmRole } from '../types.js'

/**
 * The stamp rides alongside the result rather than in a separate part, so the model
 * cannot read a figure without also seeing the day it was computed for.
 */
const withAsOf = (call: ToolExchange) => ({
  ...(call.response as Record<string, unknown>),
  asOf: call.asOf,
})

export type GeminiPart =
  | { text: string }
  | { functionCall: { name: string; args: unknown }; thoughtSignature?: string }
  | { functionResponse: { name: string; response: unknown } }

/**
 * A reasoning model rejects one of its own calls replayed without the thought signature
 * it issued: the call reads as fabricated. Rows stored before signatures were carried
 * have none, so once any call in the conversation carries one, the unsigned calls are
 * stale and their pairs are dropped — the prose of those turns still replays. A model
 * that never signs keeps everything, which is what makes this safe for both.
 */
const signsCalls = (messages: LlmMessage[]) =>
  messages.some((message) => message.toolCalls.some((call) => call.signature))

const toModelPart = (call: ToolExchange): GeminiPart => ({
  functionCall: { name: call.name, args: call.args },
  ...(call.signature ? { thoughtSignature: call.signature } : {}),
})

export type GeminiContent = { role: 'user' | 'model'; parts: GeminiPart[] }

/**
 * The only place that knows Gemini's message shape. Three mismatches with our stored
 * transcript are handled here and nowhere else, and each is a hard 400 if violated:
 *   1. `assistant` becomes `model`
 *   2. one stored assistant row with tool calls becomes a model turn plus a user turn
 *   3. contents must alternate roles and must begin with `user`
 */
export function toGeminiContents(messages: LlmMessage[]): GeminiContent[] {
  const expanded: GeminiContent[] = []
  const requiresSignature = signsCalls(messages)

  for (const message of messages) {
    if (message.role === LlmRole.User) {
      if (message.content.length > 0) {
        expanded.push({ role: 'user', parts: [{ text: message.content }] })
      }
      continue
    }

    // A turn aborted mid-tool-round can persist a call with no response;
    // sending it unmatched is a 400, so drop it.
    const paired = message.toolCalls.filter(
      (call) => call.response !== undefined && (!requiresSignature || Boolean(call.signature)),
    )

    const modelParts: GeminiPart[] = []
    if (message.content.length > 0) modelParts.push({ text: message.content })
    for (const call of paired) modelParts.push(toModelPart(call))
    if (modelParts.length === 0) continue

    expanded.push({ role: 'model', parts: modelParts })

    if (paired.length > 0) {
      expanded.push({
        role: 'user',
        parts: paired.map((call) => ({
          functionResponse: { name: call.name, response: withAsOf(call) },
        })),
      })
    }
  }

  // Must begin with `user`.
  while (expanded.length > 0 && expanded[0]?.role !== 'user') expanded.shift()

  // Must alternate: merge adjacent same-role entries.
  const merged: GeminiContent[] = []
  for (const content of expanded) {
    const previous = merged.at(-1)

    if (previous?.role === content.role) previous.parts.push(...content.parts)
    else merged.push({ role: content.role, parts: [...content.parts] })
  }

  return merged
}
