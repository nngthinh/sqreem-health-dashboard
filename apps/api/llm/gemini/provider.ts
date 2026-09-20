import { type Content, GoogleGenAI } from '@google/genai'
import type { Env } from '../../env.js'
import type { LlmEvent, LlmProvider, LlmRequest, ToolDef } from '../types.js'
import { toGeminiContents } from './map.js'

/**
 * `parametersJsonSchema` rather than `parameters`: our tool definitions are plain JSON
 * Schema, which is the field that accepts them without a hand-written SDK Schema object.
 */
const toFunctionDeclarations = (tools: ToolDef[]) =>
  tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parametersJsonSchema: tool.parameters,
  }))

export function createGeminiProvider(env: Env): LlmProvider {
  const client = new GoogleGenAI({ apiKey: env.llm.apiKey })

  return {
    async *stream(request: LlmRequest, signal?: AbortSignal): AsyncIterable<LlmEvent> {
      // map.ts is the single owner of Gemini's message shape, and is unit-tested against
      // its rules; the cast is the one place that shape meets the SDK's own types.
      const contents = toGeminiContents(request.messages) as Content[]

      if (contents.length === 0) {
        yield { type: 'error', message: 'No user turn to respond to.' }
        return
      }

      try {
        const response = await client.models.generateContentStream({
          model: env.llm.model,
          contents,
          config: {
            systemInstruction: request.system, // a top-level field, never a turn
            tools: [{ functionDeclarations: toFunctionDeclarations(request.tools) }],
            ...(signal ? { abortSignal: signal } : {}),
          },
        })

        let inputTokens = 0
        let outputTokens = 0
        let callIndex = 0

        for await (const chunk of response) {
          if (chunk.text) yield { type: 'text', text: chunk.text }

          for (const call of chunk.functionCalls ?? []) {
            yield {
              type: 'tool_call',
              id: call.id ?? `call_${callIndex++}`,
              name: call.name ?? '',
              args: call.args ?? {},
            }
          }

          const usage = chunk.usageMetadata
          if (usage) {
            inputTokens = usage.promptTokenCount ?? inputTokens
            outputTokens = usage.candidatesTokenCount ?? outputTokens
          }
        }

        yield { type: 'done', usage: { inputTokens, outputTokens } }
      } catch (error) {
        yield {
          type: 'error',
          message: error instanceof Error ? error.message : 'LLM request failed',
        }
      }
    },
  }
}

export function createProvider(env: Env): LlmProvider {
  if (env.llm.provider === 'google') return createGeminiProvider(env)

  // The adapter is the point: adding Anthropic or OpenAI is one new file, not a refactor.
  throw new Error(`LLM_PROVIDER=${env.llm.provider} is not implemented in this build`)
}
