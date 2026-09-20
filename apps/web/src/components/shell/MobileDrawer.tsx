import * as Dialog from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'

// The drawer is the base case; the fixed rail is the md: override.
export function MobileDrawer({
  open,
  onOpenChange,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 md:hidden" />
        <Dialog.Content className="fixed inset-y-0 left-0 z-50 w-[260px] md:hidden">
          <Dialog.Title className="sr-only">Navigation</Dialog.Title>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
