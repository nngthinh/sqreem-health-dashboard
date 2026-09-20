import { handle } from 'hono/vercel'

export const config = { runtime: 'nodejs', maxDuration: 120 }

type Handler = (req: Request) => Response | Promise<Response>

// The `/api/(.*)` rewrite in vercel.json is what routes every sub-path here.
// Filename matching cannot: `[...route]` and the Next.js `[[...route]]` both
// compile to a single segment, which answers /api/health and 404s /api/auth/login.
//
// Imports are dynamic so a bad environment becomes a 503 naming the variable
// rather than a FUNCTION_INVOCATION_FAILED readable only in the runtime log.
async function boot(): Promise<Handler> {
  try {
    const { assertBootable, env } = await import('../apps/api/env.js')
    const { createApp } = await import('../apps/api/app.js')
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
