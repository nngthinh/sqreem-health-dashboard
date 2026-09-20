import { METRIC_LABELS, MetricIdSchema } from '@health/shared/schema'
import { MessageCircle } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router'
import { Button } from '../common/Button'

const METRIC_ROUTE = /^\/metric\/([a-z]+)$/

/** Seeded from where the user is standing, so the question is already half-asked. */
function seedQuestion(pathname: string): string {
  const metricId = MetricIdSchema.safeParse(METRIC_ROUTE.exec(pathname)?.[1])
  if (!metricId.success) return ''

  return `Tell me about my ${METRIC_LABELS[metricId.data].toLowerCase()}.`
}

export function ChatFab() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  // Inside chat, the composer is the entry point and a floating one would compete.
  if (pathname.startsWith('/chats')) return null

  const handleClick = () => {
    const params = new URLSearchParams({ from: pathname })
    const seed = seedQuestion(pathname)
    if (seed) params.set('q', seed)

    void navigate(`/chats?${params}`)
  }

  return (
    <Button
      aria-label="Ask about this"
      onClick={handleClick}
      className="fixed bottom-5 right-5 z-30 flex items-center gap-2 rounded-full border border-line bg-surface-raised px-4 py-3 text-sm shadow-lg hover:border-ink-muted"
    >
      <MessageCircle size={16} aria-hidden="true" />
      Ask
    </Button>
  )
}
