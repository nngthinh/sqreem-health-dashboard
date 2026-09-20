import { handle } from 'hono/vercel'
import { createApp } from '../apps/api/app'
import { assertBootable, env } from '../apps/api/env'

export const config = { runtime: 'nodejs', maxDuration: 120 }

// The optional catch-all filename is load-bearing: `api/index.ts` would be
// reached only by `/api` itself, and a rewrite cannot stand in for it because a
// rewrite replaces the path the function sees — which is the path Hono routes on.
//
// A cold start is the only boot this gets, so the refusal to run SSO without
// Google credentials has to be re-asserted here.
assertBootable(env)

const app = createApp(env)

export const GET = handle(app)
export const POST = handle(app)
export const PATCH = handle(app)
export const DELETE = handle(app)
