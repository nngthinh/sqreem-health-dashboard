import type { ChatView } from '@health/shared/schema'
import { useCallback, useRef } from 'react'
import { useAppDispatch } from '../../store'
import { chatApi } from '../../store/api/chatApi'
import {
  appendDelta,
  setToolActivity,
  startStream,
  streamDone,
  streamFailed,
  ToolActivityStatus,
} from '../../store/chatSlice'

/*
 * Every failure here ends in `streamFailed`, which the surface renders inline beside
 * the turn that failed, with a retry. A toast on top of that says the same thing twice
 * — in two different wordings — so the inline alert is the only failure surface.
 */

/** Abort once the server has gone quiet this long — a live stream keeps resetting it. */
const IDLE_TIMEOUT_MS = 30_000

const STALLED = 'The assistant stopped mid-answer.'

/** A tool that answers instantly would flash its chip; it stays up long enough to read. */
const MIN_TOOL_VISIBLE_MS = 1_000

const CONNECTION_LOST = 'Lost the connection to the assistant.'

type SseFrame = { event: string; data: unknown }

/** One `event:`/`data:` pair. Anything else on the wire (comments, keep-alives) yields null. */
function parseFrame(frame: string): SseFrame | null {
  const lines = frame.split('\n')
  const event = lines
    .find((line) => line.startsWith('event:'))
    ?.slice(6)
    .trim()
  const data = lines
    .find((line) => line.startsWith('data:'))
    ?.slice(5)
    .trim()
  if (!event || !data) return null

  try {
    return { event, data: JSON.parse(data) }
  } catch {
    return null
  }
}

/**
 * The transport for one chat turn. We deliberately do not use a chat library's own
 * hook: those own the conversation state outside Redux, which would leave the
 * transcript living in two places.
 */
export function useChatStream() {
  const dispatch = useAppDispatch()

  const controllerRef = useRef<AbortController | null>(null)

  // Chips waiting out their minimum, so an abandoned turn does not leave one behind.
  const hideTimersRef = useRef(new Set<ReturnType<typeof setTimeout>>())

  const clearHideTimers = useCallback(() => {
    for (const timer of hideTimersRef.current) clearTimeout(timer)
    hideTimersRef.current.clear()
  }, [])

  const abort = useCallback(() => {
    clearHideTimers()
    controllerRef.current?.abort()
    controllerRef.current = null
  }, [clearHideTimers])

  const send = useCallback(
    async (conversationId: string, message: string, view?: ChatView) => {
      abort()

      const controller = new AbortController()
      controllerRef.current = controller

      // A timed-out stream and a deliberately abandoned one both surface as an abort,
      // so the reason is recorded here: only the first deserves an error on screen.
      let hasTimedOut = false
      const armIdleTimer = () =>
        setTimeout(() => {
          hasTimedOut = true
          controller.abort()
        }, IDLE_TIMEOUT_MS)

      let idleTimer = armIdleTimer()
      const keepAlive = () => {
        clearTimeout(idleTimer)
        idleTimer = armIdleTimer()
      }

      // When each chip went up, so a fast tool can be held rather than blinked away.
      const shownAt = new Map<string, number>()

      const hideTool = (name: string) => {
        const elapsed = Date.now() - (shownAt.get(name) ?? 0)
        const timer = setTimeout(
          () => {
            hideTimersRef.current.delete(timer)
            dispatch(setToolActivity({ name, status: ToolActivityStatus.Done }))
          },
          Math.max(0, MIN_TOOL_VISIBLE_MS - elapsed),
        )

        hideTimersRef.current.add(timer)
      }

      const handleFrame = ({ event, data }: SseFrame) => {
        const payload = data as { text?: string; name?: string; status?: string; message?: string }

        if (event === 'delta') {
          dispatch(appendDelta(payload.text ?? ''))
        } else if (event === 'tool' && payload.name) {
          if (payload.status === ToolActivityStatus.Done) {
            hideTool(payload.name)
          } else {
            shownAt.set(payload.name, Date.now())
            dispatch(setToolActivity({ name: payload.name, status: ToolActivityStatus.Running }))
          }
        } else if (event === 'done') {
          // The finished message is now in the transcript; re-read it from there
          // rather than keeping a second copy in the streaming buffer.
          dispatch(
            chatApi.util.invalidateTags([
              { type: 'Conversation', id: conversationId },
              'Conversations',
            ]),
          )
          dispatch(streamDone())
        } else if (event === 'error') {
          dispatch(streamFailed(payload.message ?? STALLED))
        }
      }

      clearHideTimers()
      dispatch(startStream({ conversationId, message }))

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ conversationId, message, view }),
          signal: controller.signal,
        })

        if (response.status === 429) {
          dispatch(streamFailed('One moment, catching up.'))
          return
        }

        if (!response.ok || !response.body) throw new Error(`Chat failed with ${response.status}`)

        const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          keepAlive()
          buffer += value

          // Frames are blank-line delimited; a trailing partial frame waits for more bytes.
          const frames = buffer.split('\n\n')
          buffer = frames.pop() ?? ''

          for (const frame of frames) {
            const parsed = parseFrame(frame)
            if (parsed) handleFrame(parsed)
          }
        }
      } catch {
        if (hasTimedOut) {
          dispatch(streamFailed(STALLED))
          return
        }

        if (controller.signal.aborted) return

        dispatch(streamFailed(CONNECTION_LOST))
      } finally {
        clearTimeout(idleTimer)
        controllerRef.current = null
      }
    },
    [abort, clearHideTimers, dispatch],
  )

  return { send, abort }
}
