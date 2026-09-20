import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import type { Env } from './env'

export type AppBindings = { Variables: { userId: string; env: Env } }

export function createApp(env: Env): Hono<AppBindings> {
  const app = new Hono<AppBindings>()

  app.use('*', logger())
  app.use('/api/*', cors({ origin: env.webOrigin, credentials: true }))

  app.use('/api/*', async (c, next) => {
    c.set('env', env)
    await next()
  })

  app.get('/api/health', (c) =>
    c.json({ ok: true, authMode: env.authMode, devBypass: env.devBypass }),
  )

  app.notFound((c) => c.json({ error: 'not_found' }, 404))
  app.onError((err, c) => {
    console.error(err)
    return c.json({ error: 'internal_error' }, 500)
  })

  return app
}
