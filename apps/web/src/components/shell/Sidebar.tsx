import { NavLink } from 'react-router'
import { notify } from '../../lib/notify'
import { type Me, useLogoutMutation } from '../../store/api/authApi'

const items = [
  { to: '/', label: 'Home', icon: '⌂' },
  { to: '/chats', label: 'Chats', icon: '✦' },
]

export function Sidebar({ me, collapsed }: { me: Me | undefined; collapsed: boolean }) {
  const [logout] = useLogoutMutation()

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

      <div className="flex items-center gap-2 border-t border-line px-3 py-3">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-line text-xs">
          {me?.name?.[0] ?? '?'}
        </span>
        {!collapsed && (
          <button
            type="button"
            className="text-sm text-ink-muted hover:text-ink"
            onClick={async () => {
              await logout()
              notify.info('Signed out')
            }}
          >
            Sign out
          </button>
        )}
      </div>
    </nav>
  )
}
