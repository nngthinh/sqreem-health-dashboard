import { serve } from '@hono/node-server'
import { createApp } from './app'
import { assertBootable, env } from './env'

assertBootable(env)

console.log(
  `[boot] authMode=${env.authMode} devBypass=${env.devBypass} provider=${env.llm.provider} model=${env.llm.model}`,
)

serve({ fetch: createApp(env).fetch, port: env.port }, (info) =>
  console.log(`[boot] api listening on :${info.port}`),
)
