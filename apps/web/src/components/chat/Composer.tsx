import { type FormEvent, useState } from 'react'

type ComposerProps = {
  disabled: boolean
  initialValue?: string
  onSend: (message: string) => void
}

export function Composer({ disabled, initialValue = '', onSend }: ComposerProps) {
  const [draft, setDraft] = useState(initialValue)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()

    const trimmed = draft.trim()
    if (!trimmed || disabled) return

    onSend(trimmed)
    setDraft('')
  }

  return (
    <div className="border-t border-line">
      <form className="mx-auto flex w-full max-w-3xl gap-2 px-4 py-4" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="chat-composer">
          Ask about your data
        </label>
        <input
          id="chat-composer"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask about your data…"
          autoComplete="off"
          className="flex-1 rounded-md border border-line bg-surface px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={disabled || draft.trim().length === 0}
          className="rounded-md bg-ink px-4 py-2 text-sm text-surface transition-opacity disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  )
}
