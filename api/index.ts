import { handle } from 'hono/vercel'
import { createApp } from '../apps/api/app'
import { assertBootable, env } from '../apps/api/env'

export const config = { runtime: 'nodejs', maxDuration: 120 }

// A function cold start is the only "boot" production gets, so the refusal to
// run SSO without Google credentials has to be re-asserted here.
assertBootable(env)

const app = createApp(env)

export const GET = handle(app)
export const POST = handle(app)
export const PATCH = handle(app)
export const DELETE = handle(app)
