import { createBrowserRouter } from 'react-router'
import { App } from './App'
import { ChatRoute } from './routes/ChatRoute'
import { HomeRoute } from './routes/HomeRoute'
import { LoginRoute } from './routes/LoginRoute'
import { MetricRoute } from './routes/MetricRoute'
import { RequireAuth } from './routes/RequireAuth'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginRoute /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <App />,
        children: [
          { path: '/', element: <HomeRoute /> },
          { path: '/chat', element: <ChatRoute /> },
          { path: '/chat/:conversationId', element: <ChatRoute /> },
          { path: '/metric/:metricId', element: <MetricRoute /> },
        ],
      },
    ],
  },
])
