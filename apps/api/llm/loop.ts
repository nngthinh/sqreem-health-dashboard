import type { ToolExchange } from '@health/shared/schema'
import { MAX_TOOL_ROUNDS, runTool } from './tools/index.js'
import { LlmEventType, type LlmMessage, type LlmProvider, LlmRole, type ToolDef } from './types.js'

export enum LoopEventType {
  Delta = 'delta',
  Tool = 'tool',
  Complete = 'complete',
  Failed = 'failed',
}

export enum ToolStatus {
  Running = 'running',
  Done = 'done',
}

export type TokenUsage = { inputTokens: number; outputTokens: number }

export type LoopEvent =
  | { type: LoopEventType.Delta; text: string }
  | { type: LoopEventType.Tool; name: string; status: ToolStatus }
  | {
      type: LoopEventType.Complete
      content: string
      toolCalls: ToolExchange[]
      usage: TokenUsage
    }
  | { type: LoopEventType.Failed; message: string; partial: string; toolCalls: ToolExchange[] }

export type ToolLoopOptions = {
  provider: LlmProvider
  system: string
  messages: LlmMessage[]
  tools: ToolDef[]
  userId: string
  today: string
  signal?: AbortSignal
}

/**
 * Drives call-and-answer rounds until the model stops asking for tools. Two properties
 * matter: the round cap is hard, so a model querying in circles cannot run up latency or
 * quota; and a provider failure mid-round yields what streamed so far rather than
 * discarding it, which is what lets the route persist a partial reply.
 */
export async function* runToolLoop(options: ToolLoopOptions): AsyncIterable<LoopEvent> {
  const { provider, system, tools, userId, today, signal } = options

  const messages = [...options.messages]
  const toolCalls: ToolExchange[] = []
  let content = ''
  let usage: TokenUsage = { inputTokens: 0, outputTokens: 0 }

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const pending: { name: string; args: unknown; signature?: string }[] = []
    let roundText = ''
    let failure: string | null = null

    for await (const event of provider.stream({ system, messages, tools }, signal)) {
      if (event.type === LlmEventType.Text) {
        roundText += event.text
        content += event.text
        yield { type: LoopEventType.Delta, text: event.text }
      } else if (event.type === LlmEventType.ToolCall) {
        pending.push({
          name: event.name,
          args: event.args,
          ...(event.signature ? { signature: event.signature } : {}),
        })
        yield { type: LoopEventType.Tool, name: event.name, status: ToolStatus.Running }
      } else if (event.type === LlmEventType.Done) {
        usage = {
          inputTokens: usage.inputTokens + event.usage.inputTokens,
          outputTokens: usage.outputTokens + event.usage.outputTokens,
        }
      } else {
        failure = event.message
      }
    }

    if (failure) {
      yield { type: LoopEventType.Failed, message: failure, partial: content, toolCalls }
      return
    }

    // At the cap the loop stops and the model answers with whatever it already has.
    if (pending.length === 0 || round === MAX_TOOL_ROUNDS) {
      yield { type: LoopEventType.Complete, content, toolCalls, usage }
      return
    }

    const roundExchanges: ToolExchange[] = []
    for (const call of pending) {
      const response = await runTool(userId, call.name, call.args, today)
      roundExchanges.push({
        name: call.name,
        args: call.args,
        response,
        asOf: today,
        ...(call.signature ? { signature: call.signature } : {}),
      })
      yield { type: LoopEventType.Tool, name: call.name, status: ToolStatus.Done }
    }
    toolCalls.push(...roundExchanges)

    messages.push({ role: LlmRole.Assistant, content: roundText, toolCalls: roundExchanges })
  }
}
