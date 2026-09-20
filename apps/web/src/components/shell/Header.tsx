import { format } from 'date-fns'
import { useAppDispatch } from '../../store'
import { setDrawerOpen } from '../../store/uiSlice'
import { RangeTabs } from './RangeTabs'

export function Header({ greeting }: { greeting: string }) {
  const dispatch = useAppDispatch()
  return (
    <header className="flex items-center gap-3 border-b border-line px-4 py-3">
      <button
        type="button"
        aria-label="Open navigation"
        className="md:hidden"
        onClick={() => dispatch(setDrawerOpen(true))}
      >
        ☰
      </button>
      <h1 className="flex-1 text-base font-medium">{greeting}</h1>
      <RangeTabs />
      <span className="hidden text-sm text-ink-muted sm:inline">{format(new Date(), 'MMM d')}</span>
    </header>
  )
}
