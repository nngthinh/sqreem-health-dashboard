import { Outlet } from 'react-router'
import { Toaster } from 'sonner'
import { Header } from './components/shell/Header'
import { MobileDrawer } from './components/shell/MobileDrawer'
import { Sidebar } from './components/shell/Sidebar'
import { useAppDispatch, useAppSelector } from './store'
import { useGetMeQuery } from './store/api/authApi'
import { setDrawerOpen } from './store/uiSlice'

export function App() {
  const { data: me } = useGetMeQuery()
  const dispatch = useAppDispatch()
  const { sidebarCollapsed, drawerOpen } = useAppSelector((s) => s.ui)
  const hour = new Date().getHours()
  const part = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'

  return (
    <div className="flex min-h-dvh">
      <div className="hidden md:block">
        <Sidebar me={me} collapsed={sidebarCollapsed} />
      </div>

      <MobileDrawer open={drawerOpen} onOpenChange={(o) => dispatch(setDrawerOpen(o))}>
        <Sidebar me={me} collapsed={false} />
      </MobileDrawer>

      <div className="flex min-w-0 flex-1 flex-col">
        <Header greeting={`Good ${part}${me ? `, ${me.name.split(' ')[0]}` : ''}`} />
        <main className="flex-1 px-4 py-5">
          <Outlet />
        </main>
      </div>

      <Toaster theme="dark" position="bottom-right" />
    </div>
  )
}
