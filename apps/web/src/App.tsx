import { Outlet, useLocation } from 'react-router'
import { Toaster } from 'sonner'
import { ChatFab } from './components/chat/ChatFab'
import { Header } from './components/shell/Header'
import { MobileDrawer } from './components/shell/MobileDrawer'
import { Sidebar } from './components/shell/Sidebar'
import { useAppDispatch, useAppSelector } from './store'
import { type Me, useGetMeQuery } from './store/api/authApi'
import { setDrawerOpen } from './store/uiSlice'

function getGreeting(me: Me | undefined) {
  const hour = new Date().getHours()
  const part = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'

  return `Good ${part}${me ? `, ${me.name.split(' ')[0]}` : ''}`
}

/** Each route gets its own copy in the header's title slot. */
function getPageTitle(pathname: string, me: Me | undefined) {
  if (pathname.startsWith('/chats')) return 'Chat history'
  if (pathname.startsWith('/metric')) return 'Metric detail'

  return getGreeting(me)
}

export function App() {
  const { pathname } = useLocation()

  const isChat = pathname.startsWith('/chats')

  const { data: me } = useGetMeQuery()
  const dispatch = useAppDispatch()
  const { sidebarCollapsed, drawerOpen } = useAppSelector((s) => s.ui)

  return (
    <div className="flex h-dvh overflow-hidden">
      <div className="hidden shrink-0 md:block">
        <Sidebar me={me} collapsed={sidebarCollapsed} />
      </div>

      <MobileDrawer open={drawerOpen} onOpenChange={(o) => dispatch(setDrawerOpen(o))}>
        <Sidebar me={me} collapsed={false} onNavigate={() => dispatch(setDrawerOpen(false))} />
      </MobileDrawer>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header title={getPageTitle(pathname, me)} />

        {/* Chat owns its own gutters so its divider and composer reach the edges. */}
        <main
          className={isChat ? 'min-h-0 flex-1 overflow-hidden' : 'flex-1 overflow-y-auto px-4 py-5'}
        >
          <Outlet />
        </main>
      </div>

      <ChatFab />

      <Toaster theme="dark" position="bottom-right" />
    </div>
  )
}
