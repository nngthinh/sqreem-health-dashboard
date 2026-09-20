import { describe, expect, it } from 'vitest'
import {
  appendDelta,
  reducer,
  StreamStatus,
  setActiveConversation,
  setToolActivity,
  startStream,
  streamDone,
  streamFailed,
  ToolActivityStatus,
} from '../chatSlice'

describe('chatSlice', () => {
  it('starts idle', () => {
    expect(reducer(undefined, { type: '@@init' }).status).toBe(StreamStatus.Idle)
  })

  it('accumulates deltas into the streaming buffer', () => {
    let state = reducer(
      undefined,
      startStream({ conversationId: 'c1', message: 'how am I doing?' }),
    )
    state = reducer(state, appendDelta('Your '))
    state = reducer(state, appendDelta('sleep'))

    expect(state.streamingMessage).toBe('Your sleep')
    expect(state.status).toBe(StreamStatus.Streaming)
  })

  it('tracks tool activity so waiting is legible rather than dead air', () => {
    let state = reducer(
      undefined,
      startStream({ conversationId: 'c1', message: 'how am I doing?' }),
    )

    state = reducer(
      state,
      setToolActivity({ name: 'get_goal_progress', status: ToolActivityStatus.Running }),
    )
    expect(state.toolActivity).toEqual(['get_goal_progress'])

    state = reducer(
      state,
      setToolActivity({ name: 'get_goal_progress', status: ToolActivityStatus.Done }),
    )
    expect(state.toolActivity).toEqual([])
  })

  it('clears the buffer when the turn completes', () => {
    let state = reducer(
      undefined,
      startStream({ conversationId: 'c1', message: 'how am I doing?' }),
    )
    state = reducer(state, appendDelta('hello'))
    state = reducer(state, streamDone())

    expect(state.streamingMessage).toBe('')
    expect(state.status).toBe(StreamStatus.Idle)
  })

  it('keeps the partial response in place when the stream fails', () => {
    let state = reducer(
      undefined,
      startStream({ conversationId: 'c1', message: 'how am I doing?' }),
    )
    state = reducer(state, appendDelta('half an ans'))
    state = reducer(state, streamFailed('connection lost'))

    expect(state.status).toBe(StreamStatus.Error)
    expect(state.streamingMessage).toBe('half an ans')
    expect(state.error).toBe('connection lost')
  })

  it('keeps the question on screen after the turn, until the transcript catches up', () => {
    let state = reducer(undefined, startStream({ conversationId: 'c1', message: 'why?' }))
    state = reducer(state, streamDone())

    expect(state.pendingMessage).toBe('why?')
  })

  it('drops a half-finished turn when another conversation is opened', () => {
    let state = reducer(undefined, startStream({ conversationId: 'c1', message: 'why?' }))
    state = reducer(state, appendDelta('because'))
    state = reducer(state, setActiveConversation('c2'))

    expect(state.pendingMessage).toBe('')
    expect(state.streamingMessage).toBe('')
    expect(state.status).toBe(StreamStatus.Idle)
  })

  it('resets the buffer when a new stream starts', () => {
    let state = reducer(
      undefined,
      startStream({ conversationId: 'c1', message: 'how am I doing?' }),
    )
    state = reducer(state, appendDelta('old'))
    state = reducer(state, streamFailed('x'))
    state = reducer(state, startStream({ conversationId: 'c1', message: 'how am I doing?' }))

    expect(state.streamingMessage).toBe('')
    expect(state.error).toBeNull()
  })
})
