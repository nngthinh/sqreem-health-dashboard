import { Pencil, Trash2 } from 'lucide-react'
import { notify } from '../../lib/notify'
import {
  useDeleteConversationMutation,
  useListConversationsQuery,
  useRenameConversationMutation,
} from '../../store/api/chatApi'

type ConversationListProps = {
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onDeleted: (id: string) => void
}

export function ConversationList({ activeId, onSelect, onNew, onDeleted }: ConversationListProps) {
  const { data: conversations = [], isError, refetch } = useListConversationsQuery()

  const [renameConversation] = useRenameConversationMutation()
  const [deleteConversation] = useDeleteConversationMutation()

  const handleRename = async (id: string, currentTitle: string) => {
    const title = window.prompt('Rename conversation', currentTitle)?.trim()
    if (!title) return

    const result = await renameConversation({ id, title })
    if ('error' in result) notify.error("Couldn't rename that conversation.")
  }

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return

    const result = await deleteConversation(id)

    if ('error' in result) {
      notify.error("Couldn't delete that conversation.")
      return
    }

    notify.success('Conversation deleted')
    onDeleted(id)
  }

  const handleRetry = () => {
    void refetch()
  }

  const renderList = () => {
    if (isError) {
      return (
        <p className="px-1 py-2 text-sm text-ink-muted">
          Couldn't load your chats.{' '}
          <button type="button" onClick={handleRetry} className="underline">
            Retry
          </button>
        </p>
      )
    }

    if (conversations.length === 0) {
      return <p className="px-1 py-2 text-sm text-ink-muted">No chats yet.</p>
    }

    return (
      <ul>
        {conversations.map((conversation) => (
          <li key={conversation.id} className="group flex items-center gap-1">
            <button
              type="button"
              onClick={() => onSelect(conversation.id)}
              className={`flex-1 truncate rounded px-2 py-2 text-left text-sm ${
                conversation.id === activeId
                  ? 'bg-line text-ink'
                  : 'text-ink-muted hover:bg-line/40'
              }`}
            >
              {conversation.title}
            </button>

            <button
              type="button"
              aria-label={`Rename ${conversation.title}`}
              onClick={() => void handleRename(conversation.id, conversation.title)}
              className="rounded p-1 text-ink-muted opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
            >
              <Pencil size={14} />
            </button>

            <button
              type="button"
              aria-label={`Delete ${conversation.title}`}
              onClick={() => void handleDelete(conversation.id, conversation.title)}
              className="rounded p-1 text-ink-muted opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
            >
              <Trash2 size={14} />
            </button>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <button
        type="button"
        onClick={onNew}
        className="m-3 rounded-md border border-line px-3 py-2 text-sm hover:bg-line/40"
      >
        New chat
      </button>

      <div className="flex-1 overflow-y-auto px-3 pb-3">{renderList()}</div>
    </div>
  )
}
