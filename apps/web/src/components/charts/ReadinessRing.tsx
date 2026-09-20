import type { Band } from '@health/shared/schema'

const RADIUS = 34
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function ReadinessRing({ score, band }: { score: number | null; band: Band }) {
  const offset = score === null ? CIRCUMFERENCE : CIRCUMFERENCE * (1 - score / 100)

  return (
    <div className="flex flex-col items-center">
      <svg
        width="88"
        height="88"
        viewBox="0 0 88 88"
        role="img"
        aria-label={`Readiness ${score ?? 'unavailable'}`}
      >
        <circle cx="44" cy="44" r={RADIUS} fill="none" stroke="var(--color-line)" strokeWidth="8" />
        <circle
          cx="44"
          cy="44"
          r={RADIUS}
          fill="none"
          stroke={`var(--color-${band})`}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          transform="rotate(-90 44 44)"
        />
        <text x="44" y="50" textAnchor="middle" className="figure fill-ink text-xl font-semibold">
          {score ?? '—'}
        </text>
      </svg>
      <span className="mt-1 text-xs uppercase tracking-wide text-ink-muted">Readiness</span>
    </div>
  )
}
