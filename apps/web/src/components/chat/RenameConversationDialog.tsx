import { useRef } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '../common/Button'
import { Modal } from '../common/Modal'

/** The server takes the same bounds, so a rejected title is caught before the request. */
const MIN_TITLE_LENGTH = 1
const MAX_TITLE_LENGTH = 255

type TitleForm = { title: string }

type RenameConversationDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentTitle: string
  isPending: boolean
  onRename: (title: string) => void
}

export function RenameConversationDialog({
  open,
  onOpenChange,
  currentTitle,
  isPending,
  onRename,
}: RenameConversationDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<TitleForm>({ defaultValues: { title: currentTitle }, mode: 'onChange' })

  // Whitespace is not a rename, so the button reads the trimmed value the server will get.
  const draft = watch('title').trim()
  const isUnchanged = draft === currentTitle

  const { ref: registerRef, ...titleField } = register('title', {
    validate: (value) =>
      value.trim().length >= MIN_TITLE_LENGTH || 'Give the conversation a title.',
    maxLength: {
      value: MAX_TITLE_LENGTH,
      message: `Keep the title under ${MAX_TITLE_LENGTH} characters.`,
    },
  })

  const submit = handleSubmit((values) => {
    if (isPending) return

    onRename(values.title.trim())
  })

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Rename conversation"
      initialFocusRef={inputRef}
    >
      <form onSubmit={(event) => void submit(event)}>
        <label className="sr-only" htmlFor="conversation-title">
          Conversation title
        </label>

        <input
          {...titleField}
          id="conversation-title"
          ref={(node) => {
            registerRef(node)
            inputRef.current = node
          }}
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? 'conversation-title-error' : undefined}
          onFocus={(event) => event.currentTarget.select()}
          className={`w-full rounded-md border bg-surface px-3 py-2 text-sm ${
            errors.title ? 'border-danger' : 'border-line'
          }`}
        />

        {errors.title && (
          <p id="conversation-title-error" role="alert" className="mt-2 text-xs text-danger">
            {errors.title.message}
          </p>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <Button
            onClick={() => onOpenChange(false)}
            className="rounded-md border border-line px-3 py-1.5 text-sm text-ink-muted hover:bg-line/40"
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={isPending || isUnchanged}
            className="rounded-md bg-ink px-3 py-1.5 text-sm text-surface transition-opacity disabled:opacity-40"
          >
            {isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
