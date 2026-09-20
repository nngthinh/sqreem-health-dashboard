import { type ChatView, MessageRole, MetricIdSchema } from '@health/shared/schema'
import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useChatStream } from '../../features/chat/useChatStream'
import { useAppDispatch, useAppSelector } from '../../store'
import { useCreateConversationMutation, useGetConversationQuery } from '../../store/api/chatApi'
import { setActiveConversation } from '../../store/chatSlice'
import { ErrorCard } from '../states/ErrorCard'
import { SkeletonCard } from '../states/SkeletonCard'
import { Composer } from './Composer'
import { ConversationList } from './ConversationList'
import { MessageBubble } from './MessageBubble'
import { ToolChip } from './ToolChip'

const SUGGESTIONS = [
  'How am I doing overall?',
  'Why have my steps dropped?',
  "How's my sleep really?",
  'What should I focus on this week?',
]

const METRIC_ROUTE = /^\/metric\/([a-z]+)$/

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

  const { streamingMessage, status, toolActivity, error } = useAppSelector((state) => state.chat)
  const { send, abort } = useChatStream()

  const [createConversation] = useCreateConversationMutation()
  const thread = useGetConversationQuery(conversationId ?? '', { skip: !conversationId })

  const scrollRef = useRef<HTMLDivElement>(null)

  const prefill = params.get('q') ?? ''
  const view = parseView(params.get('from'))
  const messages = thread.data?.messages ?? []

  // One number that grows with everything in the feed, so the scroll effect has a
  // single dependency it actually reads.
  const feedLength = messages.length + toolActivity.length + streamingMessage.length

  useEffect(() => {
    dispatch(setActiveConversation(conversationId))
  }, [conversationId, dispatch])

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
      await navigate(`/chat/${id}`, { replace: true })
    }

    await send(id, message, view)
  }

  const handleRetry = () => {
    if (conversationId) void send(conversationId, 'Please continue.', view)
  }

  const handleDeleted = (id: string) => {
    if (id === conversationId) void navigate('/chat')
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
    <div className="mx-auto flex h-[calc(100dvh-8rem)] max-w-5xl overflow-hidden rounded-card border border-line">
      <div className="hidden w-56 shrink-0 md:block">
        <ConversationList
          activeId={conversationId}
          onSelect={(id) => void navigate(`/chat/${id}`)}
          onNew={() => void navigate('/chat')}
          onDeleted={handleDeleted}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
          {!conversationId && (
            <div className="space-y-2">
              <p className="text-sm text-ink-muted">Ask about your own data.</p>

              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void handleSubmit(suggestion)}
                    className="rounded-full border border-line px-3 py-1.5 text-xs text-ink-muted hover:border-ink-muted"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {conversationId && renderThread()}

          {streamingMessage.length > 0 && (
            <MessageBubble role={MessageRole.Assistant} content={streamingMessage} />
          )}

          {toolActivity.map((name) => (
            <ToolChip key={name} name={name} />
          ))}

          {status === 'error' && (
            <div role="alert" className="text-sm text-watch">
              {error ?? 'The assistant stopped mid-answer.'}{' '}
              <button type="button" className="underline" onClick={handleRetry}>
                Retry
              </button>
            </div>
          )}
        </div>

        {/* Remounted when the seeded question changes, so a new ask replaces the draft. */}
        <Composer
          key={prefill}
          disabled={status === 'streaming'}
          initialValue={prefill}
          onSend={(message) => void handleSubmit(message)}
        />
      </div>
    </div>
  )
}
