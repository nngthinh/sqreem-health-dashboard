import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode, RefObject } from 'react'

type ModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  /** Where the caret should land on open; otherwise the dialog focuses itself. */
  initialFocusRef?: RefObject<HTMLElement | null>
  children: ReactNode
}

/**
 * The one dialog shell every in-app prompt is built from. The browser's own `prompt`
 * and `confirm` are the alternative, and they are unstyled, unbranded, and block the
 * page — a destructive choice deserves the app's own surface.
 */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  initialFocusRef,
  children,
}: ModalProps) {
  // Radix opens on the first tabbable element, which is the close button in this shell.
  const handleOpenAutoFocus = (event: Event) => {
    const target = initialFocusRef?.current
    if (!target) return

    event.preventDefault()
    target.focus()
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[1px]" />

        <Dialog.Content
          onOpenAutoFocus={handleOpenAutoFocus}
          className="fixed left-1/2 top-1/2 z-50 w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-card border border-line bg-surface-raised p-5 shadow-2xl"
        >
          <div className="flex items-start justify-between gap-4">
            <Dialog.Title className="text-sm font-medium text-ink">{title}</Dialog.Title>

            <Dialog.Close
              aria-label="Close"
              className="-m-1 rounded p-1 text-ink-muted hover:text-ink"
            >
              <X size={16} aria-hidden="true" />
            </Dialog.Close>
          </div>

          {description && (
            <Dialog.Description className="mt-2 text-sm text-ink-muted">
              {description}
            </Dialog.Description>
          )}

          <div className="mt-4">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
