import { NavLink } from 'react-router'
import { type Me, useLogoutMutation } from '../../store/api/authApi'
import { Button } from '../common/Button'

const items = [
  { to: '/', label: 'Home', icon: '⌂' },
  { to: '/chats', label: 'Chats', icon: '✦' },
]

type SidebarProps = {
  me: Me | undefined
  collapsed: boolean
  /** Set by the mobile drawer: following a link there should close the drawer behind it. */
  onNavigate?: () => void
}

export function Sidebar({ me, collapsed, onNavigate }: SidebarProps) {
  const [logout] = useLogoutMutation()

  const handleSignOut = async () => {
    onNavigate?.()
    await logout()
  }

  return (
    <nav
      aria-label="Primary"
      className={`flex h-full flex-col border-r border-line bg-surface-raised ${collapsed ? 'w-14' : 'w-[220px]'}`}
    >
      <div className="flex items-center gap-2 px-4 py-4 font-semibold">
        <span aria-hidden="true">◈</span>
        {!collapsed && <span>Vitals</span>}
      </div>

      <ul className="flex-1 overflow-y-auto px-2">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.to === '/'}
              onClick={onNavigate}
              className={({ isActive }) =>
                `mb-1 flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
                  isActive ? 'bg-line/60 text-ink' : 'text-ink-muted hover:bg-line/30'
                }`
              }
            >
              <span aria-hidden="true">{item.icon}</span>
              {!collapsed && item.label}
            </NavLink>
          </li>
        ))}
      </ul>

      {me?.authMode === 'demo' && !collapsed && (
        <p className="mx-2 mb-2 rounded-md border border-watch/40 p-2 text-xs text-watch">
          Shared demo account — conversations are visible to anyone with the access code
        </p>
      )}

      {/* Whose data this is, named from the signed-in account rather than the fixture. */}
      <div className="border-t border-line px-3 py-3">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-line text-xs">
            {me?.name?.[0]?.toUpperCase() ?? '?'}
          </span>

          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm">{me?.name ?? 'Signed in'}</p>
              {me?.email && <p className="truncate text-xs text-ink-muted">{me.email}</p>}
            </div>
          )}
        </div>

        {!collapsed && (
          <Button
            className="mt-2 w-full rounded-md border border-line px-2 py-1.5 text-xs text-ink-muted hover:bg-line/40 hover:text-ink"
            onClick={() => void handleSignOut()}
          >
            Sign out
          </Button>
        )}
      </div>
    </nav>
  )
}
