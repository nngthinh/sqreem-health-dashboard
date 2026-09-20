import type { ToolExchange } from '@health/shared/schema'

/**
 * Enums rather than bare string unions: these values travel through the transcript store,
 * the provider adapters and the SSE encoder, so one named source stops a typo at any of
 * those hops from silently becoming a new, unhandled variant.
 */
export enum LlmRole {
  User = 'user',
  Assistant = 'assistant',
}

export enum LlmEventType {
  Text = 'text',
  ToolCall = 'tool_call',
  Done = 'done',
  Error = 'error',
}

export type LlmMessage = {
  role: LlmRole
  content: string
  toolCalls: ToolExchange[]
}

export type LlmEvent =
  | { type: LlmEventType.Text; text: string }
  | { type: LlmEventType.ToolCall; id: string; name: string; args: unknown }
  | { type: LlmEventType.Done; usage: { inputTokens: number; outputTokens: number } }
  | { type: LlmEventType.Error; message: string }

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
