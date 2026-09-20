import { z } from 'zod'

const RawEnvSchema = z.object({
  NODE_ENV: z.string().default('development'),
  LLM_PROVIDER: z.enum(['google', 'anthropic', 'openai']).default('google'),
  LLM_API_KEY: z.string().min(1),
  LLM_MODEL: z.string().default('gemini-3.8-flash'),
  PORT: z.coerce.number().int().positive().default(8787),
  WEB_ORIGIN: z.url().default('http://localhost:5173'),
  RATE_LIMIT_PER_MIN: z.coerce.number().int().positive().default(4),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  DATABASE_URL: z.string().min(1),
  AUTH_MODE: z.enum(['sso', 'demo']).default('sso'),
  AUTH_DEV_BYPASS: z.string().optional(),
  DEV_USER_EMAIL: z.string().default('dev@localhost'),
  DEMO_ACCESS_CODE: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),
})

export type Env = {
  isProduction: boolean
  authMode: 'sso' | 'demo'
  /** NODE_ENV first, then the flag. Unreadable in production by construction. */
  devBypass: boolean
  devUserEmail: string
  demoAccessCode: string | null
  port: number
  webOrigin: string
  rateLimitPerMin: number
  sessionSecret: string
  databaseUrl: string
  llm: { provider: 'google' | 'anthropic' | 'openai'; apiKey: string; model: string }
  google: { clientId: string; clientSecret: string; redirectUri: string } | null
}

export function parseEnv(raw: Record<string, string | undefined>): Env {
  const parsed = RawEnvSchema.safeParse(raw)
  if (!parsed.success) {
    throw new Error(`Invalid environment:\n${z.prettifyError(parsed.error)}`)
  }
  const e = parsed.data
  const isProduction = e.NODE_ENV === 'production'

  if (e.AUTH_MODE === 'demo') {
    if (!e.DEMO_ACCESS_CODE) {
      throw new Error('AUTH_MODE=demo requires DEMO_ACCESS_CODE. Refusing to start.')
    }
    if (e.DEMO_ACCESS_CODE.length < 32) {
      throw new Error('DEMO_ACCESS_CODE must be at least 32 characters. Refusing to start.')
    }
  }

  const google =
    e.GOOGLE_CLIENT_ID && e.GOOGLE_CLIENT_SECRET && e.GOOGLE_REDIRECT_URI
      ? {
          clientId: e.GOOGLE_CLIENT_ID,
          clientSecret: e.GOOGLE_CLIENT_SECRET,
          redirectUri: e.GOOGLE_REDIRECT_URI,
        }
      : null

  return {
    isProduction,
    authMode: e.AUTH_MODE,
    devBypass: !isProduction && e.AUTH_DEV_BYPASS === 'true',
    devUserEmail: e.DEV_USER_EMAIL,
    demoAccessCode: e.DEMO_ACCESS_CODE ?? null,
    port: e.PORT,
    webOrigin: e.WEB_ORIGIN,
    rateLimitPerMin: e.RATE_LIMIT_PER_MIN,
    sessionSecret: e.SESSION_SECRET,
    databaseUrl: e.DATABASE_URL,
    llm: { provider: e.LLM_PROVIDER, apiKey: e.LLM_API_KEY, model: e.LLM_MODEL },
    google,
  }
}

/**
 * Guardrails that belong to booting a server, not to reading config.
 * Kept out of `parseEnv` so the parser stays a pure total function over its input.
 */
export function assertBootable(env: Env): void {
  if (env.authMode === 'sso' && env.isProduction && !env.google) {
    throw new Error(
      'AUTH_MODE=sso in production requires GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI. Refusing to start.',
    )
  }
}

export const env: Env = parseEnv(process.env)
