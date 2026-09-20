/** What a failed turn reads as when nothing better can be said about it. */
export const UNAVAILABLE = 'The assistant is unavailable right now. Please try again.'

/**
 * A transient upstream failure is worth naming: the user's next move is to wait and
 * retry, and the provider's own sentence says so better than a house phrase. Every
 * other status stays generic — an auth or quota message describes our configuration,
 * which is the operator's problem and not the user's business.
 */
const RETRYABLE: Record<number, string> = {
  429: 'The assistant is being rate limited upstream. Please try again in a moment.',
  500: 'The assistant hit an upstream error. Please try again.',
  502: 'The assistant hit an upstream error. Please try again.',
  503: 'The assistant is busy right now. Please try again in a moment.',
  504: 'The assistant took too long upstream. Please try again.',
}

/** Long enough for a real explanation, short enough that it cannot be a dumped body. */
const MAX_SENTENCE = 200

type ErrorBody = { message?: unknown; code?: unknown; status?: unknown }

/** The gateway wraps the model's body in its own, so the real sentence sits two deep. */
const MAX_DEPTH = 4

function parseJsonBody(raw: string): ErrorBody | null {
  const start = raw.indexOf('{')
  if (start === -1) return null

  try {
    const parsed: unknown = JSON.parse(raw.slice(start))
    if (typeof parsed !== 'object' || parsed === null) return null

    const inner = (parsed as { error?: unknown }).error

    return (typeof inner === 'object' && inner !== null ? inner : parsed) as ErrorBody
  } catch {
    return null
  }
}

/**
 * The SDK stringifies the provider's JSON body into `message`, sometimes with a prefix
 * and sometimes around another JSON body. Unwrap to the innermost one, keeping the first
 * status seen: the outer envelope reports it, the innermost layer carries the sentence.
 */
function parseBody(error: unknown): ErrorBody | null {
  const raw = error instanceof Error ? error.message : typeof error === 'string' ? error : ''

  let body = parseJsonBody(raw)
  if (!body) return null

  for (let depth = 0; depth < MAX_DEPTH; depth++) {
    if (typeof body.message !== 'string' || !body.message.includes('{')) return body

    const nested = parseJsonBody(body.message)
    if (!nested) return body

    body = { ...nested, code: body.code ?? nested.code }
  }

  return body
}

function statusOf(error: unknown, body: ErrorBody | null): number | null {
  if (typeof body?.code === 'number') return body.code

  const onError = (error as { status?: unknown } | null)?.status

  return typeof onError === 'number' ? onError : null
}

/**
 * One line the user can act on, taken from the provider where that is safe and from a
 * table of statuses otherwise. The raw error is for the server log, never the transcript.
 */
export function describeProviderError(error: unknown): string {
  const body = parseBody(error)
  const status = statusOf(error, body)
  if (status === null || !(status in RETRYABLE)) return UNAVAILABLE

  const sentence = typeof body?.message === 'string' ? body.message.trim() : ''

  // Prose, not a body that happened to be short: braces mean a layer went unread.
  const isPlainProse =
    sentence.length > 0 && sentence.length <= MAX_SENTENCE && !/[{}]/.test(sentence)

  return isPlainProse ? sentence : (RETRYABLE[status] ?? UNAVAILABLE)
}
