import { neon } from '@neondatabase/serverless'
import { drizzle as drizzleHttp, type NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { env } from '../env'
import * as schema from './schema'

/**
 * Production runs on serverless functions, where a TCP pool is a classic
 * mismatch — hence Neon's HTTP driver. But that driver only speaks to Neon's HTTP
 * endpoint, while local development and the repository tests run against the plain
 * Postgres in `docker-compose.yml`. So pick the driver from the host.
 */
const hostname = new URL(env.databaseUrl).hostname
const isNeonHttp = /\.neon\.tech$|\.neon\.build$|pooler\.supabase\.com$/.test(hostname)

/**
 * The fallback is the dangerous half: `pg` is a dev-only dependency, and a TCP
 * pool per invocation is exactly what the HTTP driver exists to avoid. Left to
 * the host pattern alone, any production URL the regex does not recognise would
 * take it silently. So production has to match, or refuse.
 */
if (!isNeonHttp && env.isProduction) {
  throw new Error(
    `DATABASE_URL points at ${hostname}, which is not a Neon HTTP endpoint. Production runs on serverless functions and would fall back to a node-postgres pool. Refusing to start.`,
  )
}

export const db: NeonHttpDatabase<typeof schema> = isNeonHttp
  ? drizzleHttp(neon(env.databaseUrl), { schema })
  : ((await import('drizzle-orm/node-postgres')).drizzle(env.databaseUrl, {
      schema,
    }) as unknown as NeonHttpDatabase<typeof schema>)

export type Db = typeof db
