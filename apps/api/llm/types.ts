import type { ToolExchange } from '@health/shared/schema'

export type LlmMessage = {
  role: 'user' | 'assistant'
  content: string
  toolCalls: ToolExchange[]
}

export type LlmEvent =
  | { type: 'text'; text: string }
  | { type: 'tool_call'; id: string; name: string; args: unknown }
  | { type: 'done'; usage: { inputTokens: number; outputTokens: number } }
  | { type: 'error'; message: string }

export type ToolDef = {
  name: string
  description: string
  parameters: Record<string, unknown>
}

export type LlmRequest = { system: string; messages: LlmMessage[]; tools: ToolDef[] }

/** One provider-neutral interface, so swapping to Anthropic or OpenAI is one new file. */
export interface LlmProvider {
  stream(request: LlmRequest, signal?: AbortSignal): AsyncIterable<LlmEvent>
}
