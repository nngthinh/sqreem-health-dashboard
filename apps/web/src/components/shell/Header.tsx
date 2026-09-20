import { format } from 'date-fns'
import { Menu } from 'lucide-react'
import { useAppDispatch } from '../../store'
import { setDrawerOpen } from '../../store/uiSlice'

export function Header({ title }: { title: string }) {
  const dispatch = useAppDispatch()
  return (
    <header className="sticky top-0 z-10 flex shrink-0 items-center gap-3 border-b border-line bg-surface px-4 py-3">
      <button
        type="button"
        aria-label="Open navigation"
        className="md:hidden"
        onClick={() => dispatch(setDrawerOpen(true))}
      >
        <Menu size={20} />
      </button>
      <h1 className="flex-1 text-base font-medium">{title}</h1>
      <span className="hidden text-sm text-ink-muted sm:inline">{format(new Date(), 'MMM d')}</span>
    </header>
  )
}
