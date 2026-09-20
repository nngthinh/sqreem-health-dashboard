import { neon } from '@neondatabase/serverless'
import { drizzle as drizzleHttp, type NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { env } from '../env'
import * as schema from './schema'

/**
 * §3.6: production runs on serverless functions, where a TCP pool is a classic
 * mismatch — hence Neon's HTTP driver. But that driver only speaks to Neon's HTTP
 * endpoint, while local development and the repository tests run against the plain
 * Postgres in `docker-compose.yml`. So pick the driver from the host.
 */
const isNeonHttp = /\.neon\.tech$|\.neon\.build$|pooler\.supabase\.com$/.test(
  new URL(env.databaseUrl).hostname,
)

export const db: NeonHttpDatabase<typeof schema> = isNeonHttp
  ? drizzleHttp(neon(env.databaseUrl), { schema })
  : // `pg` is a dev-only dependency: this branch never runs in production.
    ((await import('drizzle-orm/node-postgres')).drizzle(env.databaseUrl, {
      schema,
    }) as unknown as NeonHttpDatabase<typeof schema>)

export type Db = typeof db
