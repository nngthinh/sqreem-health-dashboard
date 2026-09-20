import { describe, expect, it } from 'vitest'
import { describeProviderError, UNAVAILABLE } from '../errors.js'

const overloaded = () =>
  new Error(
    'got status: 503 Service Unavailable. ' +
      JSON.stringify({
        error: {
          message: 'This model is currently experiencing high demand. Please try again later.',
          code: 503,
          status: 'UNAVAILABLE',
        },
      }),
  )

describe('describeProviderError', () => {
  it('passes on the provider sentence for a transient failure', () => {
    expect(describeProviderError(overloaded())).toBe(
      'This model is currently experiencing high demand. Please try again later.',
    )
  })

  it('reads the status off the error when the body carries no code', () => {
    const error = Object.assign(new Error('Service Unavailable'), { status: 503 })

    expect(describeProviderError(error)).toBe(
      'The assistant is busy right now. Please try again in a moment.',
    )
  })

  it('keeps configuration failures to ourselves', () => {
    const error = new Error(
      JSON.stringify({
        error: { message: 'API key not valid.', code: 401, status: 'UNAUTHORIZED' },
      }),
    )

    expect(describeProviderError(error)).toBe(UNAVAILABLE)
  })

  it('refuses a body long enough to be a dump rather than a sentence', () => {
    const error = new Error(
      JSON.stringify({ error: { message: 'x'.repeat(500), code: 503, status: 'UNAVAILABLE' } }),
    )

    expect(describeProviderError(error)).toBe(
      'The assistant is busy right now. Please try again in a moment.',
    )
  })

  it('falls back when there is nothing to read', () => {
    expect(describeProviderError(new Error('socket hang up'))).toBe(UNAVAILABLE)
    expect(describeProviderError('boom')).toBe(UNAVAILABLE)
    expect(describeProviderError(null)).toBe(UNAVAILABLE)
  })
})
