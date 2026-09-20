import { Button } from './Button'
import { Modal } from './Modal'

type ConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel: string
  isPending?: boolean
  isDestructive?: boolean
  onConfirm: () => void
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  isPending = false,
  isDestructive = false,
  onConfirm,
}: ConfirmDialogProps) {
  const confirmClass = isDestructive
    ? 'border-danger bg-danger text-white hover:opacity-90'
    : 'border-line bg-ink text-surface hover:opacity-90'

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title} description={description}>
      <div className="flex justify-end gap-2">
        <Button
          onClick={() => onOpenChange(false)}
          className="rounded-md border border-line px-3 py-1.5 text-sm text-ink-muted hover:bg-line/40"
        >
          Cancel
        </Button>

        <Button
          disabled={isPending}
          onClick={onConfirm}
          className={`rounded-md border px-3 py-1.5 text-sm transition-opacity disabled:opacity-40 ${confirmClass}`}
        >
          {isPending ? 'Working…' : confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
