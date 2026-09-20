import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'

type ConversationMenuProps = {
  title: string
  onRename: () => void
  onDelete: () => void
}

const ITEM_CLASS =
  'flex w-full cursor-default items-center gap-2 rounded px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-line/60'

/** Two icon buttons per row is two targets to miss; one menu is the row's own affordance. */
export function ConversationMenu({ title, onRename, onDelete }: ConversationMenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={`Actions for ${title}`}
        className="rounded p-1 text-ink-muted opacity-0 outline-none hover:text-ink focus-visible:opacity-100 data-[state=open]:opacity-100 group-hover:opacity-100"
      >
        <MoreHorizontal size={16} aria-hidden="true" />
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          // The dialog an item opens takes focus next; restoring it to the trigger here
          // would pull the caret straight back out of it.
          onCloseAutoFocus={(event) => event.preventDefault()}
          className="z-50 min-w-[9rem] rounded-card border border-line bg-surface-raised p-1 shadow-xl"
        >
          <DropdownMenu.Item className={`${ITEM_CLASS} text-ink`} onSelect={onRename}>
            <Pencil size={14} aria-hidden="true" />
            Rename
          </DropdownMenu.Item>

          <DropdownMenu.Item className={`${ITEM_CLASS} text-danger`} onSelect={onDelete}>
            <Trash2 size={14} aria-hidden="true" />
            Delete
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
