import { configureStore } from '@reduxjs/toolkit'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { Provider } from 'react-redux'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { chatApi } from '../../../store/api/chatApi'
import { reducer as chat, StreamStatus } from '../../../store/chatSlice'
import { useChatStream } from '../useChatStream'

function makeStore() {
  return configureStore({
    reducer: { chat, [chatApi.reducerPath]: chatApi.reducer },
    middleware: (getDefault) => getDefault().concat(chatApi.middleware),
  })
}

type TestStore = ReturnType<typeof makeStore>

/** Serves the given chunks as the response body, so a frame may straddle two of them. */
function stubStream(chunks: string[], status = 200) {
  const encoder = new TextEncoder()

  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
      controller.close()
    },
  })

  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: status === 200, status, body }))
}

function renderStream(store: TestStore) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  )

  return renderHook(() => useChatStream(), { wrapper })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useChatStream', () => {
  it('accumulates deltas and clears the buffer once the turn is done', async () => {
    const store = makeStore()
    stubStream([
      'event: delta\ndata: {"text":"Your "}\n\n',
      'event: delta\ndata: {"text":"sleep"}\n\n',
      'event: done\ndata: {}\n\n',
    ])

    const { result } = renderStream(store)
    await result.current.send('c1', 'how am I doing?')

    expect(store.getState().chat.streamingMessage).toBe('')
    expect(store.getState().chat.status).toBe(StreamStatus.Idle)
  })

  it('reassembles a frame split across two chunks', async () => {
    const store = makeStore()
    stubStream(['event: delta\ndata: {"text":"Hel', 'lo"}\n\n'])

    const { result } = renderStream(store)
    await result.current.send('c1', 'hi')

    expect(store.getState().chat.streamingMessage).toBe('Hello')
  })

  it('holds a fast tool on screen long enough to read before clearing it', async () => {
    const store = makeStore()
    stubStream([
      'event: tool\ndata: {"name":"get_metric_series","status":"running"}\n\n',
      'event: tool\ndata: {"name":"get_metric_series","status":"done"}\n\n',
    ])

    const { result } = renderStream(store)
    await result.current.send('c1', 'steps?')

    expect(store.getState().chat.toolActivity).toEqual(['get_metric_series'])

    await waitFor(() => expect(store.getState().chat.toolActivity).toEqual([]))
  })

  it('drops a held chip when the turn is abandoned', async () => {
    const store = makeStore()
    stubStream([
      'event: tool\ndata: {"name":"get_metric_series","status":"running"}\n\n',
      'event: tool\ndata: {"name":"get_metric_series","status":"done"}\n\n',
    ])

    const { result } = renderStream(store)
    await result.current.send('c1', 'steps?')
    result.current.abort()

    await new Promise((resolve) => setTimeout(resolve, 600))

    // The pending hide was cancelled with the turn, so it cannot fire into the next one.
    expect(store.getState().chat.toolActivity).toEqual(['get_metric_series'])
  })

  it('keeps the partial answer on screen when the server reports an error', async () => {
    const store = makeStore()
    stubStream([
      'event: delta\ndata: {"text":"half an ans"}\n\n',
      'event: error\ndata: {"message":"model unavailable"}\n\n',
    ])

    const { result } = renderStream(store)
    await result.current.send('c1', 'why?')

    const state = store.getState().chat
    expect(state.status).toBe(StreamStatus.Error)
    expect(state.streamingMessage).toBe('half an ans')
    expect(state.error).toBe('model unavailable')
  })

  it('reports a rate limit as something to wait out', async () => {
    const store = makeStore()
    stubStream([], 429)

    const { result } = renderStream(store)
    await result.current.send('c1', 'again')

    const state = store.getState().chat
    expect(state.status).toBe(StreamStatus.Error)
    expect(state.error).toBe('One moment, catching up.')
  })

  it('ignores keep-alive noise that carries no event', async () => {
    const store = makeStore()
    stubStream([': ping\n\n', 'event: delta\ndata: {"text":"ok"}\n\n'])

    const { result } = renderStream(store)
    await result.current.send('c1', 'ping?')

    expect(store.getState().chat.streamingMessage).toBe('ok')
  })

  it('stays silent when the caller abandons the stream', async () => {
    const store = makeStore()
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init: RequestInit) => {
        const signal = init.signal as AbortSignal
        return new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
        })
      }),
    )

    const { result } = renderStream(store)
    const pending = result.current.send('c1', 'never answered')
    result.current.abort()
    await pending

    const state = store.getState().chat
    expect(state.status).toBe(StreamStatus.Streaming)
    expect(state.error).toBeNull()
  })
})
