import { describe, expect, it } from 'vitest'
import {
  appendDelta,
  reducer,
  StreamStatus,
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
    let state = reducer(undefined, startStream('c1'))
    state = reducer(state, appendDelta('Your '))
    state = reducer(state, appendDelta('sleep'))

    expect(state.streamingMessage).toBe('Your sleep')
    expect(state.status).toBe(StreamStatus.Streaming)
  })

  it('tracks tool activity so waiting is legible rather than dead air', () => {
    let state = reducer(undefined, startStream('c1'))

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
    let state = reducer(undefined, startStream('c1'))
    state = reducer(state, appendDelta('hello'))
    state = reducer(state, streamDone())

    expect(state.streamingMessage).toBe('')
    expect(state.status).toBe(StreamStatus.Idle)
  })

  it('keeps the partial response in place when the stream fails', () => {
    let state = reducer(undefined, startStream('c1'))
    state = reducer(state, appendDelta('half an ans'))
    state = reducer(state, streamFailed('connection lost'))

    expect(state.status).toBe(StreamStatus.Error)
    expect(state.streamingMessage).toBe('half an ans')
    expect(state.error).toBe('connection lost')
  })

  it('resets the buffer when a new stream starts', () => {
    let state = reducer(undefined, startStream('c1'))
    state = reducer(state, appendDelta('old'))
    state = reducer(state, streamFailed('x'))
    state = reducer(state, startStream('c1'))

    expect(state.streamingMessage).toBe('')
    expect(state.error).toBeNull()
  })
})
