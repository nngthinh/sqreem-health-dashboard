import { RANGES, type Range } from '@health/shared/schema'
import { useAppDispatch, useAppSelector } from '../../store'
import { setRange } from '../../store/uiSlice'

export function RangeTabs() {
  const dispatch = useAppDispatch()
  const range = useAppSelector((s) => s.ui.range)

  return (
    <div
      role="tablist"
      aria-label="Date range"
      className="flex gap-1 rounded-md border border-line p-0.5"
    >
      {RANGES.map((r: Range) => (
        <button
          key={r}
          role="tab"
          aria-selected={range === r}
          type="button"
          onClick={() => dispatch(setRange(r))}
          className={`rounded px-2.5 py-1 text-xs ${range === r ? 'bg-line text-ink' : 'text-ink-muted'}`}
        >
          {r}d
        </button>
      ))}
    </div>
  )
}
