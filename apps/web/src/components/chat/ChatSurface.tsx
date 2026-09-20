import { type ChatView, MessageRole, MetricIdSchema } from '@health/shared/schema'
import { ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import useLocalStorage from 'react-use/lib/useLocalStorage'
import { useChatStream } from '../../features/chat/useChatStream'
import { useAppDispatch, useAppSelector } from '../../store'
import { useCreateConversationMutation, useGetConversationQuery } from '../../store/api/chatApi'
import { StreamStatus, setActiveConversation } from '../../store/chatSlice'
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

/** What the user was looking at when they asked, so "this" in a question has a referent. */
function parseView(from: string | null): ChatView | undefined {
  if (!from) return undefined

  const metricId = MetricIdSchema.safeParse(METRIC_ROUTE.exec(from)?.[1])

  return metricId.success ? { route: from, metricId: metricId.data } : { route: from }
}

export function ChatSurface({ conversationId }: { conversationId: string | null }) {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const { pendingMessage, streamingMessage, status, toolActivity, error } = useAppSelector(
    (state) => state.chat,
  )
  const { send, abort } = useChatStream()

  const [createConversation] = useCreateConversationMutation()
  const thread = useGetConversationQuery(conversationId ?? '', { skip: !conversationId })

  // On a phone the list would eat the whole screen, so it collapses behind a header.
  const [isListOpen, setIsListOpen] = useState(false)

  const [lastConversationId, setLastConversationId, forgetLastConversation] =
    useLocalStorage<string>(LAST_CONVERSATION_KEY)

  const scrollRef = useRef<HTMLDivElement>(null)
  // Reopening is a landing behaviour, not a rule: after that, /chats means a new chat.
  const hasReopened = useRef(false)

  const prefill = params.get('q') ?? ''
  const view = parseView(params.get('from'))
  const messages = thread.data?.messages ?? []

  // The server stores the question as it answers it, so until the refetched transcript
  // carries it the asker would watch their own words vanish. Shown from here until then.
  const isPendingStored = messages.some(
    (message) => message.role === MessageRole.User && message.content === pendingMessage,
  )
  const isAnswering = status === StreamStatus.Streaming && streamingMessage.length === 0

  // One number that grows with everything in the feed, so the scroll effect has a
  // single dependency it actually reads.
  const feedLength =
    messages.length + toolActivity.length + streamingMessage.length + pendingMessage.length

  useEffect(() => {
    dispatch(setActiveConversation(conversationId))
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

  useEffect(() => {
    const container = scrollRef.current
    if (!container || feedLength === 0) return

    container.scrollTop = container.scrollHeight
  }, [feedLength])

  const handleSubmit = async (message: string) => {
    let id = conversationId

    if (!id) {
      const created = await createConversation({ firstMessage: message }).unwrap()
      id = created.id
      await navigate(`/chats/${id}`, { replace: true })
    }

    await send(id, message, view)
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

  const renderThread = () => {
    if (thread.isLoading) return <SkeletonCard lines={3} />

    if (thread.isError) {
      return (
        <ErrorCard
          title="Couldn't load this conversation"
          message="The transcript could not be reached."
          onRetry={() => void thread.refetch()}
        />
      )
    }

    return messages.map((message) => (
      <MessageBubble
        key={message.id}
        role={message.role}
        content={message.content}
        blocks={message.blocks}
      />
    ))
  }

  return (
    <div className="flex h-full min-h-0">
      <div className="hidden w-64 shrink-0 border-r border-line md:block">
        <ConversationList {...listProps} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-line md:hidden">
          <button
            type="button"
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
          </button>

          {isListOpen && (
            <div className="max-h-64 overflow-y-auto border-t border-line">
              <ConversationList {...listProps} />
            </div>
          )}
        </div>

        <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {/* One column, the same width as the composer, so nothing shifts as it fills. */}
          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-6">
            {!conversationId && <ChatStarter onPick={(message) => void handleSubmit(message)} />}

            {conversationId && renderThread()}

            {pendingMessage.length > 0 && !isPendingStored && (
              <MessageBubble role={MessageRole.User} content={pendingMessage} />
            )}

            {streamingMessage.length > 0 && (
              <MessageBubble role={MessageRole.Assistant} content={streamingMessage} />
            )}

            {(isAnswering || toolActivity.length > 0) && (
              // One waiting block: chips are a running list above the dots, and the dots
              // stay put as tools come and go rather than swapping in and out of the feed.
              <div className="flex flex-col items-start gap-2">
                {toolActivity.map((name, index) => (
                  <ToolChip key={name} name={name} index={index} />
                ))}

                {isAnswering && <ThinkingDots />}
              </div>
            )}

            {status === StreamStatus.Error && (
              <div role="alert" className="animate-message-in text-sm text-watch">
                {error ?? 'The assistant stopped mid-answer.'}{' '}
                <button type="button" className="underline" onClick={handleRetry}>
                  Retry
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Remounted when the seeded question changes, so a new ask replaces the draft. */}
        <Composer
          key={prefill}
          disabled={status === StreamStatus.Streaming}
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
function ChatStarter({ onPick }: { onPick: (message: string) => void }) {
  return (
    <div className="m-auto max-w-xl space-y-4 text-center">
      <p className="text-sm text-ink-muted">Ask about your own data.</p>

      <div className="flex flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onPick(suggestion)}
            className="rounded-full border border-line px-3 py-1.5 text-xs text-ink-muted hover:border-ink-muted"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  )
}
