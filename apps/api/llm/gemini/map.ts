import type { LlmMessage } from '../types.js'

export type GeminiPart =
  | { text: string }
  | { functionCall: { name: string; args: unknown } }
  | { functionResponse: { name: string; response: unknown } }

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

  for (const message of messages) {
    if (message.role === 'user') {
      if (message.content.length > 0) {
        expanded.push({ role: 'user', parts: [{ text: message.content }] })
      }
      continue
    }

    // A turn aborted mid-tool-round can persist a call with no response;
    // sending it unmatched is a 400, so drop it.
    const paired = message.toolCalls.filter((call) => call.response !== undefined)

    const modelParts: GeminiPart[] = []
    if (message.content.length > 0) modelParts.push({ text: message.content })
    for (const call of paired)
      modelParts.push({ functionCall: { name: call.name, args: call.args } })
    if (modelParts.length === 0) continue

    expanded.push({ role: 'model', parts: modelParts })

    if (paired.length > 0) {
      expanded.push({
        role: 'user',
        parts: paired.map((call) => ({
          functionResponse: { name: call.name, response: call.response },
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
