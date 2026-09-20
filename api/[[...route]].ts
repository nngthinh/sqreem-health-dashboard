import { handle } from 'hono/vercel'

export const config = { runtime: 'nodejs', maxDuration: 120 }

type Handler = (req: Request) => Response | Promise<Response>

/**
 * The optional catch-all filename is load-bearing: `api/index.ts` would be
 * reached only by `/api` itself, and a rewrite cannot stand in for it, because a
 * rewrite replaces the path the function sees — which is the path Hono routes on.
 *
 * A cold start is the only boot this gets, and both reading the environment and
 * the SSO guard throw on bad configuration. Uncaught, those surface as
 * FUNCTION_INVOCATION_FAILED, whose reason reaches the runtime log and nowhere
 * else — `/api/health` cannot answer for them, being in the same module graph.
 * So the imports are dynamic: catching them turns a silent 500 into a 503 that
 * says which variable is wrong. The messages name variables, never values.
 */
async function boot(): Promise<Handler> {
  try {
    const { assertBootable, env } = await import('../apps/api/env')
    const { createApp } = await import('../apps/api/app')
    assertBootable(env)
    return handle(createApp(env))
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    console.error('[boot] refusing to serve:', reason)
    return () => Response.json({ error: 'service_unavailable', reason }, { status: 503 })
  }
}

const handler = await boot()

export const GET = handler
export const HEAD = handler
export const OPTIONS = handler
export const POST = handler
export const PATCH = handler
export const DELETE = handler
