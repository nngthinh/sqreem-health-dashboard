import type { Insights } from '@health/shared/schema'
import { useState } from 'react'
import { useNavigate } from 'react-router'

export function FocusThisWeek({ insights }: { insights: Insights }) {
  const navigate = useNavigate()

  const [openId, setOpenId] = useState<string | null>(null)

  const handleToggleWhy = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id))
  }

  const handleAsk = (prompt: string) => {
    void navigate(`/chats?q=${encodeURIComponent(prompt)}`)
  }

  const renderRecommendations = () => {
    if (insights.recommendations.length === 0) {
      return (
        <p className="text-sm text-ink-muted">Nothing needs attention this week — keep going.</p>
      )
    }

    return (
      <ol className="space-y-2">
        {insights.recommendations.map((recommendation, index) => (
          <li
            key={recommendation.id}
            className="rounded-card border border-line bg-surface-raised p-4"
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="figure text-ink-muted">{index + 1}</span>
              <p className="min-w-[12rem] flex-1 font-medium">{recommendation.title}</p>

              {/* A recommendation you cannot interrogate is just an instruction. */}
              <button
                type="button"
                aria-expanded={openId === recommendation.id}
                onClick={() => handleToggleWhy(recommendation.id)}
                className="rounded border border-line px-2 py-1 text-xs text-ink-muted"
              >
                why?
              </button>
              <button
                type="button"
                onClick={() => handleAsk(recommendation.askPrompt)}
                className="rounded border border-line px-2 py-1 text-xs text-ink-muted"
              >
                ask
              </button>
            </div>

            {openId === recommendation.id && (
              <div className="mt-3 border-t border-line pt-3">
                <p className="text-sm text-ink-muted">{recommendation.rationale}</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-muted">
                  {recommendation.evidence.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        ))}
      </ol>
    )
  }

  return (
    <section aria-labelledby="focus-heading">
      <h2 id="focus-heading" className="mb-3 text-xs uppercase tracking-wide text-ink-muted">
        Focus this week
      </h2>

      {renderRecommendations()}
    </section>
  )
}
