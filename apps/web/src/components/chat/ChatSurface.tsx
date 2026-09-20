import { type ChatMessage, type ChatView, MessageRole, MetricIdSchema } from '@health/shared/schema'
import { ChevronDown } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import useLocalStorage from 'react-use/lib/useLocalStorage'
import { useChatStream } from '../../features/chat/useChatStream'
import { useAppDispatch, useAppSelector } from '../../store'
import { useCreateConversationMutation, useGetConversationQuery } from '../../store/api/chatApi'
import { StreamStatus, setActiveConversation } from '../../store/chatSlice'
import { Button } from '../common/Button'
import { ErrorCard } from '../states/ErrorCard'
import { SkeletonCard } from '../states/SkeletonCard'
import { Composer } from './Composer'
import { ConversationList } from './ConversationList'
import { MessageBubble } from './MessageBubble'
import { ThinkingDots } from './ThinkingDots'
import { ToolChip } from './ToolChip'

const METRIC_ROUTE = /^\/metric\/([a-z]+)$/

/** Which chat was open last, so returning to the tab returns to the conversation. */
const LAST_CONVERSATION_KEY = 'chat:last-conversation'

/** Breathing room kept below a pinned question, so the answer never starts flush. */
const ANSWER_GUTTER_PX = 24

/** What the user was looking at when they asked, so "this" in a question has a referent. */
function parseView(from: string | null): ChatView | undefined {
  if (!from) return undefined

  const metricId = MetricIdSchema.safeParse(METRIC_ROUTE.exec(from)?.[1])

  return metricId.success ? { route: from, metricId: metricId.data } : { route: from }
}

/** The newest question in the transcript: the turn the view is anchored to. */
function findLastAsk(messages: ChatMessage[]): number {
  for (let index = messages.length - 1; index >= 0; index--) {
    if (messages[index]?.role === MessageRole.User) return index
  }

  return -1
}

export function ChatSurface({ conversationId }: { conversationId: string | null }) {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const { pendingMessage, streamingMessage, status, toolActivity, turn, error } = useAppSelector(
    (state) => state.chat,
  )
  const { send, abort } = useChatStream()

  const [createConversation] = useCreateConversationMutation()
  const thread = useGetConversationQuery(conversationId ?? '', { skip: !conversationId })

  // On a phone the list would eat the whole screen, so it collapses behind a header.
  const [isListOpen, setIsListOpen] = useState(false)

  // Room reserved under the newest question so it can sit at the top of the viewport.
  const [answerMinHeight, setAnswerMinHeight] = useState(0)

  // A new conversation is created before the stream starts, and the composer must be
  // shut for that gap too: the status alone would leave Send live across it.
  const [isSending, setIsSending] = useState(false)

  // Which turn is in flight, and how long the transcript was when it was asked.
  const [askedAt, setAskedAt] = useState<{ turn: number; messageCount: number } | null>(null)

  const [lastConversationId, setLastConversationId, forgetLastConversation] =
    useLocalStorage<string>(LAST_CONVERSATION_KEY)

  const scrollRef = useRef<HTMLDivElement>(null)
  const askRef = useRef<HTMLDivElement>(null)
  // The turn this conversation is pinned to; null means the feed follows the bottom.
  const pinnedTurn = useRef<number | null>(null)
  // Reopening is a landing behaviour, not a rule: after that, /chats means a new chat.
  const hasReopened = useRef(false)

  const prefill = params.get('q') ?? ''
  const view = parseView(params.get('from'))

  // `currentData` is empty while another conversation loads, where `data` would still
  // hold the previous transcript — which is the old chat flashing under the new one.
  const messages = thread.currentData?.messages ?? []
  const messageCount = messages.length

  // Measured as the turn opens rather than in an effect: an effect would run a frame
  // late, and the question would blink out of the feed for exactly that frame. React
  // re-renders from here without painting, so the reads below see the new measurement.
  if (status === StreamStatus.Streaming && askedAt?.turn !== turn) {
    setAskedAt({ turn, messageCount })
  }

  // The server stores the question as it answers it, so until the refetched transcript
  // carries it the asker would watch their own words vanish. Shown from here until then.
  // Length, not text: the same question asked twice is two turns, and matching on the
  // words would read the second as already stored and never draw its bubble.
  const isPendingStored = askedAt !== null && messageCount > askedAt.messageCount

  const isAnswering = status === StreamStatus.Streaming && streamingMessage.length === 0
  const isThreadLoading = Boolean(conversationId) && thread.isFetching && !thread.currentData

  // A live question is not in the transcript yet, so it is its own anchor; otherwise the
  // newest stored question is, and everything after it is the answer it opened room for.
  const hasLiveAsk = pendingMessage.length > 0 && !isPendingStored
  const anchorIndex = hasLiveAsk ? messages.length : findLastAsk(messages)
  const storedAsk = hasLiveAsk ? undefined : messages[anchorIndex]

  const beforeAsk = anchorIndex === -1 ? messages : messages.slice(0, anchorIndex)
  const afterAsk = anchorIndex === -1 ? [] : messages.slice(anchorIndex + 1)

  useEffect(() => {
    dispatch(setActiveConversation(conversationId))

    // Another conversation is another feed: it opens at its own end, not at this pin.
    pinnedTurn.current = null
    setAnswerMinHeight(0)
    setAskedAt(null)
  }, [conversationId, dispatch])

  useEffect(() => {
    if (hasReopened.current) return
    hasReopened.current = true

    // A seeded question is its own new chat, so it never reopens the old one.
    if (conversationId || prefill || !lastConversationId) return

    void navigate(`/chats/${lastConversationId}`, { replace: true })
  }, [conversationId, lastConversationId, prefill, navigate])

  useEffect(() => {
    if (conversationId) setLastConversationId(conversationId)
  }, [conversationId, setLastConversationId])

  // A conversation that no longer loads is not worth reopening tomorrow either.
  useEffect(() => {
    if (thread.isError) forgetLastConversation()
  }, [thread.isError, forgetLastConversation])

  // A stream that outlives the panel would keep writing into a buffer nobody reads.
  useEffect(() => abort, [abort])

  // An unpinned feed sits at its newest turn: opening a conversation lands at the end.
  useEffect(() => {
    const container = scrollRef.current
    if (!container || messageCount === 0 || pinnedTurn.current !== null) return

    container.scrollTop = container.scrollHeight
  }, [messageCount])

  // A new question rises to the top of the viewport and stays there while it is answered,
  // so the answer is read from its first line rather than chased from the bottom edge.
  useLayoutEffect(() => {
    if (status !== StreamStatus.Streaming || pinnedTurn.current === turn) return

    // A turn opened from a skeleton has nothing to scroll to yet; the pin waits for the
    // anchor to reach the DOM, which is the next render either way.
    if (isThreadLoading || anchorIndex < 0) return

    const container = scrollRef.current
    const ask = askRef.current
    if (!container || !ask) return

    pinnedTurn.current = turn
    setAnswerMinHeight(Math.max(0, container.clientHeight - ask.offsetHeight - ANSWER_GUTTER_PX))

    // The reserved room lands in the DOM with this render; the scroll needs it first.
    const frame = requestAnimationFrame(() => {
      askRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })

    return () => cancelAnimationFrame(frame)
  }, [status, turn, isThreadLoading, anchorIndex])

  const handleSubmit = async (message: string) => {
    setIsSending(true)

    try {
      let id = conversationId

      if (!id) {
        const created = await createConversation({ firstMessage: message }).unwrap()
        id = created.id
        await navigate(`/chats/${id}`, { replace: true })
      }

      await send(id, message, view)
    } finally {
      setIsSending(false)
    }
  }

  const handleSelect = (id: string) => {
    setIsListOpen(false)
    void navigate(`/chats/${id}`)
  }

  const handleNew = () => {
    setIsListOpen(false)
    forgetLastConversation()
    void navigate('/chats')
  }

  const handleRetry = () => {
    if (conversationId) void send(conversationId, 'Please continue.', view)
  }

  const handleDeleted = (id: string) => {
    if (id === lastConversationId) forgetLastConversation()
    if (id === conversationId) void navigate('/chats')
  }

  const listProps = {
    activeId: conversationId,
    onSelect: handleSelect,
    onNew: handleNew,
    onDeleted: handleDeleted,
  }

  const renderMessage = (message: ChatMessage) => (
    <MessageBubble
      key={message.id}
      role={message.role}
      content={message.content}
      blocks={message.blocks}
    />
  )

  const renderThread = () => {
    // A question already on screen outranks the placeholder: the asker sees their own
    // words, not a skeleton, while the transcript behind them loads.
    if (isThreadLoading && !hasLiveAsk) return <SkeletonCard lines={3} />

    if (thread.isError) {
      return (
        <ErrorCard
          title="Couldn't load this conversation"
          message="The transcript could not be reached."
          onRetry={() => void thread.refetch()}
        />
      )
    }

    return (
      <>
        {beforeAsk.map(renderMessage)}

        {/* The anchor: the newest question, and the only element the feed scrolls to. */}
        <div ref={askRef} className="flex scroll-mt-2 flex-col gap-5">
          {hasLiveAsk && <MessageBubble role={MessageRole.User} content={pendingMessage} />}
          {!hasLiveAsk && storedAsk && renderMessage(storedAsk)}
        </div>

        <div
          style={answerMinHeight > 0 ? { minHeight: answerMinHeight } : undefined}
          className="flex flex-col gap-5"
        >
          {afterAsk.map(renderMessage)}

          {streamingMessage.length > 0 && (
            <MessageBubble role={MessageRole.Assistant} content={streamingMessage} />
          )}

          {(isAnswering || toolActivity.length > 0) && (
            // One waiting row: the dots hold the left, and the chips run to their right
            // as tools come and go, rather than swapping in and out of the feed.
            <div className="flex flex-wrap items-center gap-2">
              {isAnswering && <ThinkingDots />}

              {toolActivity.map((name, index) => (
                <ToolChip key={name} name={name} index={index} />
              ))}
            </div>
          )}

          {status === StreamStatus.Error && (
            <div role="alert" className="animate-message-in text-sm text-watch">
              {error ?? 'The assistant stopped mid-answer.'}{' '}
              <Button className="underline" onClick={handleRetry}>
                Retry
              </Button>
            </div>
          )}
        </div>
      </>
    )
  }

  return (
    <div className="flex h-full min-h-0">
      <div className="hidden w-64 shrink-0 border-r border-line md:block">
        <ConversationList {...listProps} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-line md:hidden">
          <Button
            aria-expanded={isListOpen}
            onClick={() => setIsListOpen((open) => !open)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm text-ink-muted"
          >
            Your chats
            <ChevronDown
              size={16}
              aria-hidden="true"
              className={isListOpen ? 'rotate-180 transition-transform' : 'transition-transform'}
            />
          </Button>

          {isListOpen && (
            <div className="max-h-64 overflow-y-auto border-t border-line">
              <ConversationList {...listProps} />
            </div>
          )}
        </div>

        <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {/* One column, the same width as the composer, so nothing shifts as it fills.
              Narrower than the page: a chat reads as a column, not as a full-width page. */}
          <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 pb-12 pt-6">
            {!conversationId && (
              <ChatStarter disabled={isSending} onPick={(message) => void handleSubmit(message)} />
            )}

            {conversationId && renderThread()}
          </div>
        </div>

        {/* Remounted when the seeded question changes, so a new ask replaces the draft. */}
        <Composer
          key={prefill}
          disabled={isSending || status === StreamStatus.Streaming}
          initialValue={prefill}
          onSend={(message) => void handleSubmit(message)}
        />
      </div>
    </div>
  )
}

const SUGGESTIONS = [
  'How am I doing overall?',
  'Why have my steps dropped?',
  "How's my sleep really?",
  'What should I focus on this week?',
]

/** An empty thread is mostly empty space, so the invitation sits in the middle of it. */
function ChatStarter({
  disabled,
  onPick,
}: {
  disabled: boolean
  onPick: (message: string) => void
}) {
  return (
    <div className="m-auto max-w-xl space-y-4 text-center">
      <p className="text-sm text-ink-muted">Ask about your own data.</p>

      <div className="flex flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((suggestion) => (
          <Button
            key={suggestion}
            disabled={disabled}
            onClick={() => onPick(suggestion)}
            className="rounded-full border border-line px-3 py-1.5 text-xs text-ink-muted transition-opacity hover:border-ink-muted disabled:opacity-40"
          >
            {suggestion}
          </Button>
        ))}
      </div>
    </div>
  )
}
