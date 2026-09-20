import type { ConversationSummary } from '@health/shared/schema'
import { useState } from 'react'
import { notify } from '../../lib/notify'
import {
  useDeleteConversationMutation,
  useListConversationsQuery,
  useRenameConversationMutation,
} from '../../store/api/chatApi'
import { Button } from '../common/Button'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { ConversationMenu } from './ConversationMenu'
import { RenameConversationDialog } from './RenameConversationDialog'

type ConversationListProps = {
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onDeleted: (id: string) => void
}

type PendingAction = { kind: 'rename' | 'delete'; conversation: ConversationSummary }

export function ConversationList({ activeId, onSelect, onNew, onDeleted }: ConversationListProps) {
  const { data: conversations = [], isError, refetch } = useListConversationsQuery()

  const [renameConversation, renameState] = useRenameConversationMutation()
  const [deleteConversation, deleteState] = useDeleteConversationMutation()

  const [action, setAction] = useState<PendingAction | null>(null)

  const closeAction = () => setAction(null)

  const handleRename = async (title: string) => {
    if (!action) return

    const result = await renameConversation({ id: action.conversation.id, title })

    if ('error' in result) {
      notify.error("Couldn't rename that conversation.")
      return
    }

    closeAction()
  }

  const handleDelete = async () => {
    if (!action) return

    const { id } = action.conversation
    const result = await deleteConversation(id)

    if ('error' in result) {
      notify.error("Couldn't delete that conversation.")
      return
    }

    closeAction()
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
          <Button onClick={handleRetry} className="underline">
            Retry
          </Button>
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
            <Button
              onClick={() => onSelect(conversation.id)}
              className={`flex-1 truncate rounded px-2 py-2 text-left text-sm ${
                conversation.id === activeId
                  ? 'bg-line text-ink'
                  : 'text-ink-muted hover:bg-line/40'
              }`}
            >
              {conversation.title}
            </Button>

            <ConversationMenu
              title={conversation.title}
              onRename={() => setAction({ kind: 'rename', conversation })}
              onDelete={() => setAction({ kind: 'delete', conversation })}
            />
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <Button
        onClick={onNew}
        className="m-3 rounded-md border border-line px-3 py-2 text-sm hover:bg-line/40"
      >
        New chat
      </Button>

      <div className="flex-1 overflow-y-auto px-3 pb-3">{renderList()}</div>

      {/* Keyed by conversation, so the field opens on the title it is about to change. */}
      {action?.kind === 'rename' && (
        <RenameConversationDialog
          key={action.conversation.id}
          open
          onOpenChange={closeAction}
          currentTitle={action.conversation.title}
          isPending={renameState.isLoading}
          onRename={(title) => void handleRename(title)}
        />
      )}

      {action?.kind === 'delete' && (
        <ConfirmDialog
          open
          onOpenChange={closeAction}
          title="Delete this conversation?"
          description={`"${action.conversation.title}" and its messages will be removed. This cannot be undone.`}
          confirmLabel="Delete"
          isDestructive
          isPending={deleteState.isLoading}
          onConfirm={() => void handleDelete()}
        />
      )}
    </div>
  )
}
